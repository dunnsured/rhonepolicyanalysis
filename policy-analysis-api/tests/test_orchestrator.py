"""
Tests for the analysis orchestrator — full pipeline with mocked services.
"""

import os
import json
import hmac
import hashlib
import pytest
from unittest.mock import patch, MagicMock, AsyncMock

# Must set env before imports
os.environ["WEBHOOK_SECRET"] = "test-webhook-secret-for-hmac-signing"

from services.orchestrator import (
    run_policy_analysis,
    analysis_status_store,
    _sign_payload,
    _update_status,
    _calculate_duration,
)


class TestSignPayload:
    def test_generates_hmac_hex(self):
        """_sign_payload should produce a valid HMAC-SHA256 hex digest"""
        payload = {"key": "value", "nested": {"a": 1}}
        signature = _sign_payload(payload)
        assert len(signature) == 64  # SHA256 hex = 64 chars
        assert all(c in "0123456789abcdef" for c in signature)

    def test_deterministic(self):
        """Same payload + secret should produce same signature"""
        payload = {"analysis_id": "test-123", "status": "completed"}
        sig1 = _sign_payload(payload)
        sig2 = _sign_payload(payload)
        assert sig1 == sig2

    def test_different_payloads_different_sigs(self):
        """Different payloads should produce different signatures"""
        sig1 = _sign_payload({"a": 1})
        sig2 = _sign_payload({"a": 2})
        assert sig1 != sig2


class TestUpdateStatus:
    def test_updates_in_memory_store(self):
        """_update_status should update the analysis_status_store"""
        aid = "test-status-001"
        analysis_status_store[aid] = {"status": "started", "progress": "init"}

        _update_status(aid, "extracting", "Extracting text...")

        assert analysis_status_store[aid]["status"] == "extracting"
        assert analysis_status_store[aid]["progress"] == "Extracting text..."

    def test_handles_missing_id_gracefully(self):
        """_update_status should not crash for unknown analysis IDs"""
        _update_status("nonexistent-id", "failed", "error")
        # Should not raise


class TestCalculateDuration:
    def test_returns_zero_for_unknown(self):
        """Should return 0 for unknown analysis IDs"""
        assert _calculate_duration("does-not-exist") == 0

    def test_returns_positive_duration(self):
        """Should return a positive duration for known analyses"""
        from datetime import datetime, timedelta
        aid = "test-duration-001"
        analysis_status_store[aid] = {
            "started_at": (datetime.utcnow() - timedelta(seconds=10)).isoformat()
        }
        duration = _calculate_duration(aid)
        assert duration >= 9.0  # Allow 1s tolerance


@pytest.mark.asyncio
class TestRunPolicyAnalysis:
    @patch("services.orchestrator.extractor")
    @patch("services.orchestrator.analyzer")
    @patch("services.orchestrator.generator")
    @patch("services.orchestrator._get_supabase_client")
    @patch("services.orchestrator._send_callback", new_callable=AsyncMock)
    async def test_happy_path_no_callback(
        self,
        mock_callback,
        mock_supa,
        mock_generator,
        mock_analyzer,
        mock_extractor,
        sample_extraction_result,
        sample_analysis_result,
        sample_report_result,
    ):
        """Full pipeline should complete without errors when all services succeed"""
        mock_supa.return_value = None  # No supabase in test
        mock_extractor.extract_from_url = AsyncMock(return_value=sample_extraction_result)
        mock_analyzer.analyze_policy_two_phase = AsyncMock(return_value=sample_analysis_result)
        mock_generator.generate_report = AsyncMock(return_value=sample_report_result)

        payload = {
            "policy_id": "policy-happy-001",
            "client_id": "company-001",
            "client_name": "Test Corp",
            "client_industry": "Technology",
            "file_url": "https://example.com/test.pdf",
            "file_name": "test.pdf",
            "policy_type": "cyber",
            "renewal": False,
            # No callback_url
        }

        await run_policy_analysis("analysis-happy-001", payload)

        # Verify status updated to completed
        status = analysis_status_store["analysis-happy-001"]
        assert status["status"] == "completed"
        assert status["result"]["overall_score"] == 72.5
        assert status["result"]["policy_id"] == "policy-happy-001"

        # No callback should be sent
        mock_callback.assert_not_called()

    @patch("services.orchestrator.extractor")
    @patch("services.orchestrator.analyzer")
    @patch("services.orchestrator.generator")
    @patch("services.orchestrator._get_supabase_client")
    @patch("services.orchestrator._send_callback", new_callable=AsyncMock)
    async def test_happy_path_with_callback(
        self,
        mock_callback,
        mock_supa,
        mock_generator,
        mock_analyzer,
        mock_extractor,
        sample_extraction_result,
        sample_analysis_result,
        sample_report_result,
    ):
        """Full pipeline should send HMAC-signed callback when URL is provided"""
        mock_supa.return_value = None
        mock_extractor.extract_from_url = AsyncMock(return_value=sample_extraction_result)
        mock_analyzer.analyze_policy_two_phase = AsyncMock(return_value=sample_analysis_result)
        mock_generator.generate_report = AsyncMock(return_value=sample_report_result)

        payload = {
            "policy_id": "policy-cb-001",
            "client_id": "company-001",
            "client_name": "Test Corp",
            "client_industry": "Technology",
            "file_url": "https://example.com/test.pdf",
            "file_name": "test.pdf",
            "callback_url": "https://app.example.com/api/webhook/analysis-complete",
        }

        await run_policy_analysis("analysis-cb-001", payload)

        # Callback should be sent
        mock_callback.assert_called_once()
        callback_url, result = mock_callback.call_args[0]
        assert callback_url == "https://app.example.com/api/webhook/analysis-complete"
        assert result["status"] == "completed"

    @patch("services.orchestrator.extractor")
    @patch("services.orchestrator._get_supabase_client")
    @patch("services.orchestrator._send_callback", new_callable=AsyncMock)
    async def test_extraction_failure_sends_error_callback(
        self,
        mock_callback,
        mock_supa,
        mock_extractor,
    ):
        """Failed extraction should update status to failed and send error callback"""
        mock_supa.return_value = None
        failed_extraction = MagicMock()
        failed_extraction.success = False
        failed_extraction.error = "Corrupted PDF"
        mock_extractor.extract_from_url = AsyncMock(return_value=failed_extraction)

        payload = {
            "policy_id": "policy-fail-001",
            "client_id": "company-001",
            "client_name": "Test Corp",
            "file_url": "https://example.com/corrupted.pdf",
            "file_name": "corrupted.pdf",
            "callback_url": "https://app.example.com/callback",
        }

        await run_policy_analysis("analysis-fail-001", payload)

        status = analysis_status_store["analysis-fail-001"]
        assert status["status"] == "failed"
        assert "Corrupted PDF" in status["error"]

        # Error callback should be sent
        mock_callback.assert_called_once()
        _, result = mock_callback.call_args[0]
        assert result["status"] == "failed"

    @patch("services.orchestrator.extractor")
    @patch("services.orchestrator._get_supabase_client")
    async def test_no_file_raises_error(self, mock_supa, mock_extractor):
        """Missing file_url and _local_file_path should raise ValueError"""
        mock_supa.return_value = None

        payload = {
            "policy_id": "policy-nofile-001",
            "client_id": "company-001",
            "client_name": "Test Corp",
            # No file_url or _local_file_path
        }

        await run_policy_analysis("analysis-nofile-001", payload)

        status = analysis_status_store["analysis-nofile-001"]
        assert status["status"] == "failed"
        assert "No file path or URL" in status["error"]

    @patch("services.orchestrator.extractor")
    @patch("services.orchestrator.analyzer")
    @patch("services.orchestrator.generator")
    @patch("services.orchestrator._get_supabase_client")
    async def test_temp_file_cleanup(
        self,
        mock_supa,
        mock_generator,
        mock_analyzer,
        mock_extractor,
        sample_extraction_result,
        sample_analysis_result,
        sample_report_result,
        tmp_path,
    ):
        """Temp files should be cleaned up after processing"""
        mock_supa.return_value = None
        mock_extractor.extract_from_file = AsyncMock(return_value=sample_extraction_result)
        mock_analyzer.analyze_policy_two_phase = AsyncMock(return_value=sample_analysis_result)
        mock_generator.generate_report = AsyncMock(return_value=sample_report_result)

        # Create a temp file
        temp_file = tmp_path / "test_policy.pdf"
        temp_file.write_bytes(b"%PDF-1.4 test content")

        payload = {
            "policy_id": "policy-cleanup-001",
            "client_id": "company-001",
            "client_name": "Test Corp",
            "_local_file_path": str(temp_file),
            "file_name": "test_policy.pdf",
        }

        await run_policy_analysis("analysis-cleanup-001", payload)

        # Temp file should be cleaned up
        assert not temp_file.exists()
