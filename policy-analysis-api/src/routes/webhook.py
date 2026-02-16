"""
Webhook routes for receiving policy upload notifications
"""

import hmac
import hashlib
import logging
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, Header, BackgroundTasks, Request
from pydantic import BaseModel, HttpUrl

from config import settings
from services.orchestrator import run_policy_analysis

logger = logging.getLogger(__name__)

router = APIRouter()


class PolicyUploadedPayload(BaseModel):
    """Webhook payload when a policy is uploaded"""
    event_type: str = "policy.uploaded"
    policy_id: str
    client_id: str
    client_name: str
    client_industry: Optional[str] = "Other/General"
    file_url: HttpUrl  # Presigned URL to download the policy PDF
    file_name: str
    file_size: Optional[int] = None
    uploaded_by: Optional[str] = None
    policy_type: Optional[str] = "cyber"
    renewal: Optional[bool] = False
    priority: Optional[str] = "normal"
    callback_url: Optional[HttpUrl] = None
    tenant_id: Optional[str] = None


class WebhookResponse(BaseModel):
    """Response returned after webhook received"""
    success: bool
    analysis_id: str
    message: str
    estimated_time_seconds: int


def verify_signature(payload: bytes, signature: str, secret: str) -> bool:
    """Verify HMAC-SHA256 webhook signature"""
    if not secret:
        logger.warning("No webhook secret configured - skipping verification")
        return True

    expected = hmac.new(
        secret.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()

    provided = signature.replace("sha256=", "")
    return hmac.compare_digest(expected, provided)


@router.post("/policy-uploaded", response_model=WebhookResponse)
async def handle_policy_uploaded(
    request: Request,
    background_tasks: BackgroundTasks,
):
    """
    Receive notification that a policy has been uploaded.

    This endpoint triggers the asynchronous policy analysis workflow:
    1. Verifies HMAC signature (required when WEBHOOK_SECRET is set)
    2. Downloads the PDF from the presigned URL
    3. Extracts text from the policy document
    4. Analyzes the policy using Claude API
    5. Generates a branded PDF report
    6. Uploads report to Supabase Storage
    7. POSTs HMAC-signed results to the callback_url (if provided)

    The analysis runs in the background - this endpoint returns immediately
    with an analysis_id that can be used to track progress.
    """
    # STEP 0: Enforce signature verification
    raw_body = await request.body()
    signature = request.headers.get("X-Webhook-Signature", "")

    if settings.WEBHOOK_SECRET:
        if not signature:
            logger.warning("Webhook received without signature - rejecting")
            raise HTTPException(status_code=401, detail="Missing webhook signature")
        if not verify_signature(raw_body, signature, settings.WEBHOOK_SECRET):
            logger.warning("Webhook received with invalid signature - rejecting")
            raise HTTPException(status_code=401, detail="Invalid webhook signature")
    else:
        logger.warning("No WEBHOOK_SECRET configured - accepting unsigned request")

    # Parse payload after signature verification
    payload = PolicyUploadedPayload.model_validate_json(raw_body)

    logger.info(f"Received policy upload webhook for client: {payload.client_name}")
    logger.info(f"   Policy ID: {payload.policy_id}")
    logger.info(f"   Industry: {payload.client_industry}")
    logger.info(f"   File: {payload.file_name}")

    # Generate unique analysis ID
    analysis_id = f"analysis_{uuid.uuid4().hex[:12]}"

    # Queue the analysis to run in background
    background_tasks.add_task(
        run_policy_analysis,
        analysis_id=analysis_id,
        payload=payload.model_dump(),
    )

    logger.info(f"Analysis queued: {analysis_id}")

    return WebhookResponse(
        success=True,
        analysis_id=analysis_id,
        message="Policy analysis queued successfully",
        estimated_time_seconds=120,  # ~2 minutes typical
    )


@router.post("/test")
async def test_webhook():
    """
    Test endpoint to verify webhook connectivity.
    Returns current configuration status.
    """
    return {
        "status": "connected",
        "timestamp": datetime.utcnow().isoformat(),
        "webhook_secret_configured": bool(settings.WEBHOOK_SECRET),
        "anthropic_configured": bool(settings.ANTHROPIC_API_KEY),
        "supabase_configured": bool(settings.SUPABASE_URL and settings.SUPABASE_SERVICE_KEY),
    }
