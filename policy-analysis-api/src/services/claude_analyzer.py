"""
Two-Phase Claude Analyzer for Cyber Insurance Policy Analysis — v2.0

Phase 1 (Extraction): Extracts structured data from raw policy text into markdown.
    - Uses Claude Haiku for speed and cost efficiency
    - Focuses purely on data extraction, no scoring
    - Produces structured markdown with all policy details

Phase 2 (Analysis): Applies Rhône Risk scoring methodology to extracted data.
    - Uses Claude Sonnet for deep analytical reasoning
    - Applies 5-factor scoring, 5-dimension maturity assessment
    - Produces full YAML analysis with scores, red flags, recommendations

Also provides single-pass analysis (legacy) and backward-compatible ClaudeAnalyzer class.
"""

import json
import logging
import re
from dataclasses import dataclass
from datetime import date, datetime
from typing import Any, Dict, List, Optional, Tuple

import anthropic

try:
    import yaml
    HAS_YAML = True
except ImportError:
    HAS_YAML = False

from config import settings
from prompts.system_prompt import (
    get_analysis_prompt,
    get_extraction_prompt,
    get_full_analysis_prompt,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Model configuration
# ---------------------------------------------------------------------------

# Phase 1 uses a faster model for extraction (data extraction is less complex)
EXTRACTION_MODEL = getattr(settings, "EXTRACTION_MODEL", "claude-haiku-4-5-20251001")
# Phase 2 uses the configured analysis model (defaults to Sonnet)
ANALYSIS_MODEL = getattr(settings, "CLAUDE_MODEL", "claude-sonnet-4-20250514")
# Max tokens for extraction (policy text can be long)
EXTRACTION_MAX_TOKENS = 8192
# Max tokens for analysis (YAML output is very detailed)
ANALYSIS_MAX_TOKENS = getattr(settings, "CLAUDE_MAX_TOKENS", 16384)


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

@dataclass
class AnalysisResult:
    """Result from Claude policy analysis"""
    success: bool
    analysis_data: Optional[Dict[str, Any]] = None
    raw_response: Optional[str] = None
    tokens_used: Optional[int] = None
    error: Optional[str] = None
    extracted_data: Optional[str] = None  # Phase 1 output (markdown)


# ===========================================================================
# OUTPUT PARSING
# ===========================================================================

def _parse_yaml_or_json(raw_output: str) -> Dict[str, Any]:
    """
    Parse Claude's output as YAML (primary) or JSON (fallback).

    Handles common formatting issues:
    - Code fence wrappers (```yaml ... ```)
    - Leading/trailing whitespace
    - Mixed YAML/JSON output
    """
    cleaned = raw_output.strip()

    # Strip code fences if present
    if cleaned.startswith("```"):
        first_newline = cleaned.index("\n") if "\n" in cleaned else len(cleaned)
        cleaned = cleaned[first_newline + 1:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    cleaned = cleaned.strip()

    # Try YAML first (our requested format)
    if HAS_YAML:
        try:
            result = yaml.safe_load(cleaned)
            if isinstance(result, dict):
                logger.info("📄 Output parsed as YAML")
                return result
        except Exception as e:
            logger.warning(f"YAML parse failed: {e}")

    # Fallback: try JSON
    try:
        result = json.loads(cleaned)
        if isinstance(result, dict):
            logger.info("📄 Output parsed as JSON (fallback)")
            return result
    except json.JSONDecodeError as e:
        logger.warning(f"JSON parse also failed: {e}")

    # Try to extract from code blocks in the original output
    yaml_match = re.search(r"```ya?ml\s*\n(.*?)```", raw_output, re.DOTALL)
    if yaml_match and HAS_YAML:
        try:
            result = yaml.safe_load(yaml_match.group(1))
            if isinstance(result, dict):
                logger.info("📄 Output extracted from YAML code block")
                return result
        except Exception:
            pass

    json_match = re.search(r"```json\s*\n(.*?)```", raw_output, re.DOTALL)
    if json_match:
        try:
            result = json.loads(json_match.group(1))
            if isinstance(result, dict):
                logger.info("📄 Output extracted from JSON code block")
                return result
        except json.JSONDecodeError:
            pass

    # Last resort: find any JSON object
    brace_match = re.search(r"\{[\s\S]*\}", raw_output)
    if brace_match:
        try:
            result = json.loads(brace_match.group())
            if isinstance(result, dict):
                logger.info("📄 Output extracted from embedded JSON object")
                return result
        except json.JSONDecodeError:
            pass

    logger.error("❌ Could not parse output as YAML or JSON")
    return {
        "parse_error": True,
        "raw_output": raw_output,
        "client_company": "Parse Error",
        "executive_summary": {
            "overview": "The analysis output could not be parsed. Raw output preserved for manual review.",
            "recommendation": "MANUAL REVIEW REQUIRED",
        },
    }


def _enrich_analysis(
    analysis_data: Dict[str, Any],
    client_name: str,
    client_industry: str,
    is_renewal: bool,
    token_usage: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Enrich analysis data with metadata and computed fields."""

    # Ensure required fields
    analysis_data.setdefault("client_company", client_name)
    analysis_data.setdefault("client_industry", client_industry)
    analysis_data.setdefault("analysis_date", date.today().strftime("%B %d, %Y"))
    analysis_data.setdefault("policy_type", "renewal" if is_renewal else "new")
    analysis_data.setdefault("prepared_by", "Rhône Risk Advisory")

    # Compute overall score from maturity dimensions if present
    if "maturity_dimensions" in analysis_data:
        dims = analysis_data["maturity_dimensions"]
        total_weighted = 0.0
        total_weight = 0.0
        for _dim_name, dim_data in dims.items():
            if isinstance(dim_data, dict):
                score = dim_data.get("score", 0)
                weight = dim_data.get("weight", 1.0)
                if isinstance(score, (int, float)) and isinstance(weight, (int, float)):
                    total_weighted += score * weight
                    total_weight += weight
        if total_weight > 0:
            computed_score = round(total_weighted / total_weight, 1)
            exec_summary = analysis_data.setdefault("executive_summary", {})
            key_metrics = exec_summary.setdefault("key_metrics", {})
            if not key_metrics.get("overall_maturity_score"):
                key_metrics["overall_maturity_score"] = computed_score
                if computed_score >= 8.5:
                    key_metrics["maturity_level"] = "Optimized"
                elif computed_score >= 7.0:
                    key_metrics["maturity_level"] = "Managed"
                elif computed_score >= 5.5:
                    key_metrics["maturity_level"] = "Defined"
                elif computed_score >= 3.5:
                    key_metrics["maturity_level"] = "Developing"
                else:
                    key_metrics["maturity_level"] = "Initial"

    # Processing metadata
    analysis_data["_metadata"] = {
        "processed_at": datetime.utcnow().isoformat(),
        "analyzer_version": "2.0",
    }
    if token_usage:
        analysis_data["_metadata"]["token_usage"] = token_usage

    return analysis_data


def _validate_analysis(analysis_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate the analysis output for completeness.

    Returns dict with 'valid' bool and list of 'warnings'.
    """
    warnings: List[str] = []

    if analysis_data.get("parse_error"):
        return {"valid": False, "warnings": ["Output could not be parsed"]}

    for field in ["client_company", "executive_summary", "sections", "policy_summary"]:
        if field not in analysis_data:
            warnings.append(f"Missing required field: {field}")

    exec_summary = analysis_data.get("executive_summary", {})
    if not exec_summary.get("recommendation"):
        warnings.append("Missing binding recommendation")
    if not exec_summary.get("overview"):
        warnings.append("Missing executive summary overview")
    if not exec_summary.get("key_metrics", {}).get("overall_maturity_score"):
        warnings.append("Missing overall maturity score")

    sections = analysis_data.get("sections", [])
    if len(sections) < 10:
        warnings.append(f"Only {len(sections)} coverage sections found (expected 14+)")

    scored_items = 0
    for section in sections:
        for item in section.get("items", []):
            for carrier_data in item.get("carrier_values", {}).values():
                if isinstance(carrier_data, dict) and "maturity_score" in carrier_data:
                    scored_items += 1
    if scored_items < 10:
        warnings.append(f"Only {scored_items} items have maturity scores (expected 30+)")

    if "maturity_dimensions" not in analysis_data:
        warnings.append("Missing maturity dimensions assessment")
    if "red_flags" not in analysis_data:
        warnings.append("Missing red flags section")
    if "recommendations" not in analysis_data:
        warnings.append("Missing recommendations section")

    return {"valid": len(warnings) == 0, "warnings": warnings}


# ===========================================================================
# PHASE 1: EXTRACTION
# ===========================================================================

async def extract_policy_data(
    client: anthropic.Anthropic,
    policy_text: str,
    metadata: Optional[Dict[str, Any]] = None,
) -> str:
    """
    Phase 1: Extract structured data from raw policy text.

    Reads raw PDF-extracted text and produces a clean, structured markdown
    document with all policy details organized for analysis.
    Does NOT score or analyze — only extracts.

    Args:
        client: Anthropic client instance
        policy_text: Raw text from PDF extraction (with page markers)
        metadata: Optional metadata (client name, file name, etc.)

    Returns:
        Structured markdown string with extracted policy data
    """
    system_prompt = get_extraction_prompt()

    user_parts = []
    if metadata:
        user_parts.append("## CONTEXT")
        if metadata.get("client_name"):
            user_parts.append(f"Client: {metadata['client_name']}")
        if metadata.get("client_industry"):
            user_parts.append(f"Industry: {metadata['client_industry']}")
        if metadata.get("file_name"):
            user_parts.append(f"Document: {metadata['file_name']}")
        user_parts.append("")

    user_parts.append("## POLICY DOCUMENT TEXT\n")
    user_parts.append(policy_text)
    user_message = "\n".join(user_parts)

    logger.info("📋 Phase 1 — Extraction starting")
    logger.info(f"   Model: {EXTRACTION_MODEL}")
    logger.info(f"   Input length: {len(policy_text):,} chars")

    response = client.messages.create(
        model=EXTRACTION_MODEL,
        max_tokens=EXTRACTION_MAX_TOKENS,
        system=system_prompt,
        messages=[{"role": "user", "content": user_message}],
    )

    extracted_text = response.content[0].text
    tokens = response.usage.input_tokens + response.usage.output_tokens

    logger.info("✅ Phase 1 — Extraction complete")
    logger.info(f"   Output length: {len(extracted_text):,} chars")
    logger.info(f"   Tokens used: {tokens:,}")

    return extracted_text


# ===========================================================================
# PHASE 2: ANALYSIS
# ===========================================================================

async def analyze_extracted_data(
    client: anthropic.Anthropic,
    extracted_data: str,
    client_name: str,
    client_industry: str = "Other/General",
    is_renewal: bool = False,
    metadata: Optional[Dict[str, Any]] = None,
) -> Tuple[Dict[str, Any], int]:
    """
    Phase 2: Analyze extracted policy data using Rhône Risk methodology.

    Takes the structured extraction from Phase 1 and applies the full
    scoring framework.

    Args:
        client: Anthropic client instance
        extracted_data: Structured markdown from Phase 1 extraction
        client_name: Client company name
        client_industry: Industry classification
        is_renewal: Whether this is a renewal policy
        metadata: Optional context

    Returns:
        Tuple of (analysis_dict, tokens_used)
    """
    system_prompt = get_analysis_prompt(
        client_industry=client_industry,
        is_renewal=is_renewal,
    )

    user_parts = [
        "## POLICY ANALYSIS REQUEST",
        "",
        f"**Client:** {client_name}",
        f"**Industry:** {client_industry}",
        f"**Policy Type:** {'Renewal' if is_renewal else 'New'}",
        f"**Analysis Date:** {date.today().strftime('%B %d, %Y')}",
        "",
    ]
    if metadata:
        for key in ("carrier", "file_name"):
            if metadata.get(key):
                user_parts.append(f"**{key.replace('_', ' ').title()}:** {metadata[key]}")
        user_parts.append("")

    user_parts.extend([
        "## EXTRACTED POLICY DATA",
        "",
        "Below is the structured extraction from the policy document.",
        "Analyze this data using the Rhône Risk scoring methodology",
        "and produce the complete YAML analysis output.",
        "",
        extracted_data,
    ])
    user_message = "\n".join(user_parts)

    logger.info("🔍 Phase 2 — Analysis starting")
    logger.info(f"   Model: {ANALYSIS_MODEL}")
    logger.info(f"   Client: {client_name} ({client_industry})")
    logger.info(f"   Input length: {len(user_message):,} chars")

    response = client.messages.create(
        model=ANALYSIS_MODEL,
        max_tokens=ANALYSIS_MAX_TOKENS,
        system=system_prompt,
        messages=[{"role": "user", "content": user_message}],
    )

    raw_output = response.content[0].text
    tokens = response.usage.input_tokens + response.usage.output_tokens

    logger.info("✅ Phase 2 — Analysis complete")
    logger.info(f"   Output length: {len(raw_output):,} chars")
    logger.info(f"   Tokens used: {tokens:,}")

    analysis_data = _parse_yaml_or_json(raw_output)
    return analysis_data, tokens


# ===========================================================================
# ClaudeAnalyzer CLASS (Backward Compatible + Two-Phase)
# ===========================================================================

class ClaudeAnalyzer:
    """
    Analyzes cyber insurance policies using Claude API.

    Supports both:
    - Two-phase analysis (extract → analyze) for higher quality
    - Single-pass analysis (legacy) for simplicity
    """

    def __init__(self):
        if not settings.ANTHROPIC_API_KEY:
            raise ValueError("ANTHROPIC_API_KEY is not configured")
        self.client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        self.model = ANALYSIS_MODEL
        self.max_tokens = ANALYSIS_MAX_TOKENS

    # ------------------------------------------------------------------
    # Two-phase analysis (NEW — recommended)
    # ------------------------------------------------------------------

    async def analyze_policy_two_phase(
        self,
        policy_text: str,
        client_name: str,
        client_industry: str = "Other/General",
        is_renewal: bool = False,
        metadata: Optional[Dict[str, Any]] = None,
        progress_callback=None,
    ) -> AnalysisResult:
        """
        Run the complete two-phase analysis pipeline.

        Phase 1: Extract structured data (fast, uses Haiku)
        Phase 2: Deep analysis with scoring (thorough, uses Sonnet)

        Args:
            policy_text: Raw text from PDF extraction
            client_name: Client company name
            client_industry: Industry classification
            is_renewal: Whether this is a renewal
            metadata: Optional context
            progress_callback: Optional async callback(phase, message)

        Returns:
            AnalysisResult with both extracted data and analysis
        """
        logger.info(f"🚀 Two-phase analysis starting for: {client_name}")
        total_tokens = 0

        try:
            # Phase 1: Extraction
            if progress_callback:
                await progress_callback("extracting_data", "Extracting structured data from policy document...")

            extracted_data = await extract_policy_data(
                client=self.client,
                policy_text=policy_text,
                metadata={
                    "client_name": client_name,
                    "client_industry": client_industry,
                    **(metadata or {}),
                },
            )
            logger.info(f"📊 Extraction produced {len(extracted_data):,} chars")

            # Phase 2: Analysis
            if progress_callback:
                await progress_callback("analyzing", "Applying Rhône Risk scoring methodology...")

            analysis_data, analysis_tokens = await analyze_extracted_data(
                client=self.client,
                extracted_data=extracted_data,
                client_name=client_name,
                client_industry=client_industry,
                is_renewal=is_renewal,
                metadata=metadata,
            )
            total_tokens += analysis_tokens

            # Enrich
            analysis_data = _enrich_analysis(
                analysis_data,
                client_name=client_name,
                client_industry=client_industry,
                is_renewal=is_renewal,
                token_usage={
                    "total_tokens": total_tokens,
                    "extraction_model": EXTRACTION_MODEL,
                    "analysis_model": ANALYSIS_MODEL,
                    "mode": "two_phase",
                },
            )

            # Validate
            validation = _validate_analysis(analysis_data)
            if not validation["valid"]:
                logger.warning(f"⚠️  Validation warnings: {validation['warnings']}")
                analysis_data["_validation_warnings"] = validation["warnings"]

            score = analysis_data.get("executive_summary", {}).get("key_metrics", {}).get("overall_maturity_score", "N/A")
            rec = analysis_data.get("executive_summary", {}).get("recommendation", "N/A")
            logger.info(f"✅ Two-phase complete — Score: {score}, Recommendation: {rec}")

            return AnalysisResult(
                success=True,
                analysis_data=analysis_data,
                raw_response=None,
                tokens_used=total_tokens,
                extracted_data=extracted_data,
            )

        except anthropic.APIError as e:
            logger.error(f"❌ Anthropic API error: {e}")
            return AnalysisResult(success=False, error=f"API error: {str(e)}")
        except Exception as e:
            logger.error(f"❌ Two-phase analysis failed: {e}")
            return AnalysisResult(success=False, error=str(e))

    # ------------------------------------------------------------------
    # Single-pass analysis (legacy — backward compatible)
    # ------------------------------------------------------------------

    async def analyze_policy(
        self,
        policy_text: str,
        client_name: str,
        client_industry: str,
        policy_type: str = "cyber",
        is_renewal: bool = False,
    ) -> AnalysisResult:
        """
        Single-pass analysis (backward compatible with existing orchestrator).

        Now uses the enriched prompt with YAML output format and few-shot example.

        Args:
            policy_text: Extracted text from the policy PDF
            client_name: Name of the client company
            client_industry: Industry classification
            policy_type: Type of policy (default: cyber)
            is_renewal: Whether this is a renewal

        Returns:
            AnalysisResult containing structured analysis data
        """
        logger.info(f"🤖 Single-pass analysis for {client_name}")
        logger.info(f"   Industry: {client_industry}")
        logger.info(f"   Policy text length: {len(policy_text):,} chars")

        if not settings.ANTHROPIC_API_KEY:
            return AnalysisResult(success=False, error="Anthropic API key not configured")

        # Build the enriched prompt (now includes few-shot example)
        system_prompt = get_full_analysis_prompt(
            client_industry=client_industry,
            is_renewal=is_renewal,
        )

        user_message = f"""## POLICY ANALYSIS REQUEST

**Client:** {client_name}
**Industry:** {client_industry}
**Policy Type:** {policy_type}
**Renewal:** {"Yes" if is_renewal else "No (New Policy)"}
**Analysis Date:** {date.today().strftime('%B %d, %Y')}

---

## POLICY DOCUMENT TEXT

{policy_text}

---

Produce your complete analysis as valid YAML following the structure in your instructions.
Score every coverage sub-item using the 5-factor methodology.
Apply industry-specific criteria for {client_industry}.
Include maturity dimensions, red flags, and binding recommendation.
"""

        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=self.max_tokens,
                system=system_prompt,
                messages=[{"role": "user", "content": user_message}],
            )

            raw_text = response.content[0].text
            tokens_used = response.usage.input_tokens + response.usage.output_tokens

            logger.info(f"   Response: {len(raw_text):,} chars, {tokens_used:,} tokens")

            analysis_data = _parse_yaml_or_json(raw_text)

            analysis_data = _enrich_analysis(
                analysis_data,
                client_name=client_name,
                client_industry=client_industry,
                is_renewal=is_renewal,
                token_usage={
                    "total_tokens": tokens_used,
                    "model": self.model,
                    "mode": "single_pass",
                },
            )

            score = analysis_data.get("executive_summary", {}).get("key_metrics", {}).get("overall_maturity_score", "N/A")
            logger.info(f"✅ Analysis complete — Score: {score}")

            return AnalysisResult(
                success=True,
                analysis_data=analysis_data,
                raw_response=raw_text,
                tokens_used=tokens_used,
            )

        except anthropic.APIError as e:
            logger.error(f"❌ Anthropic API error: {e}")
            return AnalysisResult(success=False, error=f"API error: {str(e)}")
        except Exception as e:
            logger.error(f"❌ Analysis failed: {e}")
            return AnalysisResult(success=False, error=str(e))

    # ------------------------------------------------------------------
    # Legacy JSON parser (kept for backward compat, delegates to new one)
    # ------------------------------------------------------------------

    def _parse_analysis_json(self, text: str) -> Optional[Dict[str, Any]]:
        """Parse analysis output (YAML or JSON). Backward compatible."""
        result = _parse_yaml_or_json(text)
        if result.get("parse_error"):
            return None
        return result


# Module-level instance
analyzer = ClaudeAnalyzer()
