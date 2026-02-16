"""
Analysis Orchestrator
Coordinates the policy analysis workflow from end to end
"""

import hmac as hmac_mod
import hashlib
import json
import logging
import asyncio
import os
from datetime import datetime
from typing import Dict, Any, Optional

import aiohttp

from config import settings
from services.pdf_extractor import extractor
from services.claude_analyzer import analyzer
from services.report_generator import generator

logger = logging.getLogger(__name__)

# In-memory status cache (fast reads; persisted to Supabase on every change)
analysis_status_store: Dict[str, Dict[str, Any]] = {}

# Supabase client (lazy-initialized)
_supabase_client = None

# Retry configuration
MAX_RETRIES = 2
RETRY_DELAYS = [30, 60]  # seconds between retries
CALLBACK_MAX_RETRIES = 2
CALLBACK_RETRY_DELAY = 5  # seconds


def _get_supabase_client():
    """Lazy-initialize Supabase client"""
    global _supabase_client
    if _supabase_client is None and settings.SUPABASE_URL and settings.SUPABASE_SERVICE_KEY:
        try:
            from supabase import create_client
            _supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
            logger.info("Supabase client initialized for report storage")
        except Exception as e:
            logger.warning(f"Failed to initialize Supabase client: {e}")
    return _supabase_client


async def run_policy_analysis(analysis_id: str, payload: Dict[str, Any]):
    """
    Main orchestration function for policy analysis.

    Coordinates:
    1. PDF download/extraction
    2. Claude-powered analysis (with retry)
    3. Report generation
    4. Report upload to Supabase Storage
    5. Callback delivery (HMAC-signed, with retry)

    Args:
        analysis_id: Unique identifier for this analysis
        payload: Webhook payload or direct upload data
    """
    logger.info(f"Starting analysis workflow: {analysis_id}")
    local_path = None

    # Initialize status
    analysis_status_store[analysis_id] = {
        "analysis_id": analysis_id,
        "status": "started",
        "progress": "Initializing...",
        "started_at": datetime.utcnow().isoformat(),
        "completed_at": None,
        "error": None,
        "result": None,
    }

    try:
        # Extract metadata from payload
        client_name = payload.get("client_name", "Unknown Client")
        client_industry = payload.get("client_industry", "Other/General")
        policy_type = payload.get("policy_type", "cyber")
        is_renewal = payload.get("renewal", False)
        callback_url = payload.get("callback_url")

        # Persist initial status to DB
        await _persist_status(payload.get("policy_id"), "processing", analysis_id)

        # STEP 1: Get the PDF content
        _update_status(analysis_id, "extracting", "Extracting text from PDF...")
        await _persist_status(payload.get("policy_id"), "extracting", analysis_id)

        local_path = payload.get("_local_file_path")
        file_url = payload.get("file_url")

        if local_path:
            extraction = await extractor.extract_from_file(local_path)
        elif file_url:
            extraction = await extractor.extract_from_url(str(file_url))
        else:
            raise ValueError("No file path or URL provided")

        if not extraction.success:
            raise Exception(f"PDF extraction failed: {extraction.error}")

        logger.info(f"   Extracted {len(extraction.text)} chars from {extraction.page_count} pages")

        # STEP 2: Analyze with Claude (with retry logic)
        use_two_phase = getattr(settings, "USE_TWO_PHASE", True)
        analysis_result = None

        for attempt in range(MAX_RETRIES + 1):
            try:
                if use_two_phase:
                    logger.info(f"   Using TWO-PHASE analysis pipeline (attempt {attempt + 1})")

                    async def progress_cb(phase: str, message: str):
                        _update_status(analysis_id, phase, message)
                        await _persist_status(payload.get("policy_id"), phase, analysis_id)

                    analysis_result = await analyzer.analyze_policy_two_phase(
                        policy_text=extraction.text,
                        client_name=client_name,
                        client_industry=client_industry,
                        is_renewal=is_renewal,
                        metadata={
                            "file_name": payload.get("file_name"),
                            "carrier": payload.get("carrier"),
                        },
                        progress_callback=progress_cb,
                    )
                else:
                    logger.info(f"   Using SINGLE-PASS analysis pipeline (attempt {attempt + 1})")
                    _update_status(analysis_id, "analyzing", "Analyzing policy with Claude...")
                    await _persist_status(payload.get("policy_id"), "analyzing", analysis_id)

                    analysis_result = await analyzer.analyze_policy(
                        policy_text=extraction.text,
                        client_name=client_name,
                        client_industry=client_industry,
                        policy_type=policy_type,
                        is_renewal=is_renewal,
                    )
                break  # Success, exit retry loop

            except Exception as e:
                error_name = type(e).__name__
                is_retryable = any(keyword in error_name.lower() for keyword in [
                    'ratelimit', 'timeout', 'overloaded', 'serviceunav'
                ]) or any(keyword in str(e).lower() for keyword in [
                    'rate_limit', 'timeout', 'overloaded', '529', '503'
                ])

                if is_retryable and attempt < MAX_RETRIES:
                    delay = RETRY_DELAYS[attempt]
                    logger.warning(f"   Retryable error on attempt {attempt + 1}: {e}. Retrying in {delay}s...")
                    _update_status(analysis_id, "retrying", f"Retrying analysis (attempt {attempt + 2})...")

                    # Track retry count in DB
                    supa = _get_supabase_client()
                    if supa and payload.get("policy_id"):
                        try:
                            supa.table("insurance_policies") \
                                .update({"analysis_retries": attempt + 1}) \
                                .eq("id", payload["policy_id"]) \
                                .execute()
                        except Exception:
                            pass

                    await asyncio.sleep(delay)
                else:
                    raise  # Non-retryable or exhausted retries

        if not analysis_result or not analysis_result.success:
            error_msg = analysis_result.error if analysis_result else "Analysis returned no result"
            raise Exception(f"Claude analysis failed: {error_msg}")

        analysis_data = analysis_result.analysis_data
        logger.info(f"   Analysis complete, tokens used: {analysis_result.tokens_used}")

        # STEP 3: Generate PDF report
        _update_status(analysis_id, "generating", "Generating PDF report...")
        await _persist_status(payload.get("policy_id"), "generating", analysis_id)

        report_result = await generator.generate_report(
            analysis_data=analysis_data,
            output_dir=settings.REPORTS_DIR,
        )

        report_path = None
        report_storage_path = None

        if not report_result.success:
            logger.warning(f"   Report generation failed: {report_result.error}")
        else:
            report_path = report_result.report_path
            logger.info(f"   Report generated: {report_path}")

            # STEP 3.5: Upload report to Supabase Storage
            report_storage_path = await _upload_report_to_supabase(
                report_path=report_path,
                tenant_id=payload.get("tenant_id", "default"),
                company_id=payload.get("client_id", "unknown"),
                analysis_id=analysis_id,
                client_name=client_name,
            )

        # Store tokens used
        tokens_used = None
        if hasattr(analysis_result, 'tokens_used') and analysis_result.tokens_used:
            tokens_used = analysis_result.tokens_used if isinstance(analysis_result.tokens_used, dict) else {"total": analysis_result.tokens_used}

        # Build result summary
        exec_summary = analysis_data.get("executive_summary", {})
        key_metrics = exec_summary.get("key_metrics", {})

        result = {
            "analysis_id": analysis_id,
            "policy_id": payload.get("policy_id"),
            "client_id": payload.get("client_id"),
            "client_name": client_name,
            "status": "completed",
            "overall_score": key_metrics.get("overall_maturity_score"),
            "recommendation": exec_summary.get("recommendation"),
            "report_path": report_path,
            "report_storage_path": report_storage_path,
            "analysis_data": analysis_data,
            "completed_at": datetime.utcnow().isoformat(),
            "processing_time_seconds": _calculate_duration(analysis_id),
        }

        # Update in-memory status
        analysis_status_store[analysis_id].update({
            "status": "completed",
            "progress": "Analysis complete",
            "completed_at": result["completed_at"],
            "result": result,
        })

        # Persist completed status to DB
        await _persist_completed(payload.get("policy_id"), result, tokens_used)

        logger.info(f"Analysis complete: {analysis_id}")
        logger.info(f"   Score: {result['overall_score']}")
        logger.info(f"   Recommendation: {result['recommendation']}")

        # STEP 4: Send HMAC-signed callback (with retry)
        if callback_url:
            await _send_callback(callback_url, result)

    except Exception as e:
        logger.error(f"Analysis failed: {analysis_id} - {str(e)}")

        # Update in-memory status
        analysis_status_store[analysis_id].update({
            "status": "failed",
            "progress": "Analysis failed",
            "error": str(e),
            "completed_at": datetime.utcnow().isoformat(),
        })

        # Persist failed status to DB
        await _persist_status(payload.get("policy_id"), "failed", analysis_id, error=str(e))

        # Send failure callback if configured
        callback_url = payload.get("callback_url")
        if callback_url:
            await _send_callback(callback_url, {
                "analysis_id": analysis_id,
                "policy_id": payload.get("policy_id"),
                "client_id": payload.get("client_id"),
                "status": "failed",
                "error_message": str(e),
                "completed_at": datetime.utcnow().isoformat(),
            })

    finally:
        # Cleanup temp files
        if local_path and os.path.exists(local_path):
            try:
                os.remove(local_path)
                logger.info(f"   Cleaned up temp file: {local_path}")
            except Exception as e:
                logger.warning(f"   Failed to clean up temp file {local_path}: {e}")

        # Also clean up any report temp files
        if report_path and os.path.exists(report_path) and report_storage_path:
            try:
                os.remove(report_path)
                logger.info(f"   Cleaned up local report: {report_path}")
            except Exception:
                pass


async def _upload_report_to_supabase(
    report_path: str,
    tenant_id: str,
    company_id: str,
    analysis_id: str,
    client_name: str,
) -> Optional[str]:
    """Upload generated report PDF to Supabase Storage"""
    supa = _get_supabase_client()
    if not supa:
        logger.warning("   Supabase client not available - skipping report upload")
        return None

    try:
        # Build storage path
        safe_name = client_name.replace(" ", "_").replace("/", "_")[:50]
        storage_path = f"{tenant_id}/{company_id}/reports/{analysis_id}_{safe_name}_Analysis.pdf"

        with open(report_path, "rb") as f:
            report_bytes = f.read()

        supa.storage.from_("reports").upload(
            storage_path,
            report_bytes,
            file_options={"content-type": "application/pdf"}
        )

        logger.info(f"   Report uploaded to Supabase Storage: {storage_path}")
        return storage_path

    except Exception as e:
        logger.error(f"   Failed to upload report to Supabase: {e}")
        return None


async def _persist_status(
    policy_id: Optional[str],
    status: str,
    analysis_id: str,
    error: Optional[str] = None,
):
    """Persist analysis status to Supabase DB"""
    if not policy_id:
        return

    supa = _get_supabase_client()
    if not supa:
        return

    try:
        update_data: Dict[str, Any] = {
            "analysis_status": status,
            "analysis_id": analysis_id,
            "updated_at": datetime.utcnow().isoformat(),
        }
        if error:
            update_data["analysis_error"] = error
            update_data["analysis_completed_at"] = datetime.utcnow().isoformat()

        supa.table("insurance_policies") \
            .update(update_data) \
            .eq("id", policy_id) \
            .execute()
    except Exception as e:
        logger.warning(f"   Failed to persist status to DB: {e}")


async def _persist_completed(
    policy_id: Optional[str],
    result: Dict[str, Any],
    tokens_used: Optional[Dict] = None,
):
    """Persist completed analysis results to Supabase DB"""
    if not policy_id:
        return

    supa = _get_supabase_client()
    if not supa:
        return

    try:
        update_data: Dict[str, Any] = {
            "analysis_status": "completed",
            "analysis_id": result.get("analysis_id"),
            "analysis_score": result.get("overall_score"),
            "analysis_recommendation": result.get("recommendation"),
            "analysis_data": result.get("analysis_data"),
            "report_storage_path": result.get("report_storage_path"),
            "analysis_completed_at": result.get("completed_at"),
            "updated_at": datetime.utcnow().isoformat(),
        }
        if tokens_used:
            update_data["analysis_tokens_used"] = tokens_used

        supa.table("insurance_policies") \
            .update(update_data) \
            .eq("id", policy_id) \
            .execute()
        logger.info(f"   Persisted completed status to DB for policy {policy_id}")
    except Exception as e:
        logger.warning(f"   Failed to persist completed status to DB: {e}")


def _update_status(analysis_id: str, status: str, progress: str):
    """Update the in-memory status of an analysis"""
    if analysis_id in analysis_status_store:
        analysis_status_store[analysis_id].update({
            "status": status,
            "progress": progress,
        })
    logger.info(f"   [{analysis_id}] {progress}")


def _calculate_duration(analysis_id: str) -> float:
    """Calculate processing duration in seconds"""
    if analysis_id not in analysis_status_store:
        return 0

    started = analysis_status_store[analysis_id].get("started_at")
    if not started:
        return 0

    start_dt = datetime.fromisoformat(started)
    duration = (datetime.utcnow() - start_dt).total_seconds()
    return round(duration, 2)


def _sign_payload(payload: Dict[str, Any]) -> str:
    """Generate HMAC-SHA256 signature for a payload"""
    return hmac_mod.new(
        settings.WEBHOOK_SECRET.encode(),
        json.dumps(payload, default=str).encode(),
        hashlib.sha256
    ).hexdigest()


async def _send_callback(callback_url: str, result: Dict[str, Any]):
    """Send HMAC-signed analysis results to callback URL with retry"""
    logger.info(f"Sending callback to {callback_url}")

    for attempt in range(CALLBACK_MAX_RETRIES + 1):
        try:
            headers = {"Content-Type": "application/json"}

            # Sign the callback payload
            if settings.WEBHOOK_SECRET:
                signature = _sign_payload(result)
                headers["X-Webhook-Signature"] = f"sha256={signature}"

            async with aiohttp.ClientSession() as session:
                async with session.post(
                    callback_url,
                    json=result,
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=settings.CALLBACK_TIMEOUT),
                ) as response:
                    if response.status == 200:
                        logger.info(f"   Callback sent successfully")
                        return
                    else:
                        body = await response.text()
                        logger.warning(f"   Callback returned status {response.status}: {body}")

        except Exception as e:
            logger.error(f"   Callback attempt {attempt + 1} failed: {str(e)}")

        if attempt < CALLBACK_MAX_RETRIES:
            logger.info(f"   Retrying callback in {CALLBACK_RETRY_DELAY}s...")
            await asyncio.sleep(CALLBACK_RETRY_DELAY)

    logger.error(f"   Callback delivery failed after {CALLBACK_MAX_RETRIES + 1} attempts")
