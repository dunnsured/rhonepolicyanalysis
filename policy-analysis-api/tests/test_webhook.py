"""
Tests for webhook endpoint + signature verification.
"""

import hmac
import hashlib
import json
import pytest
from fastapi.testclient import TestClient

from main import app


client = TestClient(app)

WEBHOOK_SECRET = "test-webhook-secret-for-hmac-signing"


def _sign_payload(payload: dict, secret: str = WEBHOOK_SECRET) -> str:
    """Generate HMAC signature for a payload"""
    return hmac.new(
        secret.encode(),
        json.dumps(payload).encode(),
        hashlib.sha256,
    ).hexdigest()


class TestHealthEndpoints:
    def test_root(self):
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "operational"

    def test_health(self):
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"

    def test_webhook_test(self):
        response = client.post("/webhook/test")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "connected"
        assert data["webhook_secret_configured"] is True


class TestWebhookSignatureVerification:
    def test_reject_missing_signature(self, sample_webhook_payload):
        """Webhook should reject requests without a signature when secret is configured"""
        response = client.post(
            "/webhook/policy-uploaded",
            content=json.dumps(sample_webhook_payload),
            headers={"Content-Type": "application/json"},
        )
        assert response.status_code == 401
        assert "Missing webhook signature" in response.json()["detail"]

    def test_reject_invalid_signature(self, sample_webhook_payload):
        """Webhook should reject requests with an invalid signature"""
        response = client.post(
            "/webhook/policy-uploaded",
            content=json.dumps(sample_webhook_payload),
            headers={
                "Content-Type": "application/json",
                "X-Webhook-Signature": "sha256=invalid_signature_here",
            },
        )
        assert response.status_code == 401
        assert "Invalid webhook signature" in response.json()["detail"]

    def test_accept_valid_signature(self, sample_webhook_payload):
        """Webhook should accept requests with a valid HMAC signature"""
        payload_bytes = json.dumps(sample_webhook_payload)
        signature = _sign_payload(sample_webhook_payload)

        response = client.post(
            "/webhook/policy-uploaded",
            content=payload_bytes,
            headers={
                "Content-Type": "application/json",
                "X-Webhook-Signature": f"sha256={signature}",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["analysis_id"].startswith("analysis_")
        assert data["estimated_time_seconds"] > 0

    def test_signature_is_case_sensitive(self, sample_webhook_payload):
        """Signature verification should be exact match"""
        payload_bytes = json.dumps(sample_webhook_payload)
        signature = _sign_payload(sample_webhook_payload)

        # Uppercase the signature - should fail
        response = client.post(
            "/webhook/policy-uploaded",
            content=payload_bytes,
            headers={
                "Content-Type": "application/json",
                "X-Webhook-Signature": f"sha256={signature.upper()}",
            },
        )
        # HMAC hex digest is lowercase, so uppercase should fail
        assert response.status_code == 401


class TestWebhookPayloadValidation:
    def test_reject_missing_required_fields(self):
        """Webhook should reject payloads missing required fields"""
        incomplete_payload = {"event_type": "policy.uploaded"}
        signature = _sign_payload(incomplete_payload)

        response = client.post(
            "/webhook/policy-uploaded",
            content=json.dumps(incomplete_payload),
            headers={
                "Content-Type": "application/json",
                "X-Webhook-Signature": f"sha256={signature}",
            },
        )
        assert response.status_code == 422  # Pydantic validation error

    def test_accept_minimal_required_fields(self):
        """Webhook should accept payload with only required fields"""
        minimal_payload = {
            "policy_id": "test-001",
            "client_id": "client-001",
            "client_name": "Test Corp",
            "file_url": "https://example.com/test.pdf",
            "file_name": "test.pdf",
        }
        signature = _sign_payload(minimal_payload)

        response = client.post(
            "/webhook/policy-uploaded",
            content=json.dumps(minimal_payload),
            headers={
                "Content-Type": "application/json",
                "X-Webhook-Signature": f"sha256={signature}",
            },
        )
        assert response.status_code == 200


class TestRequestBodySizeLimit:
    def test_reject_oversized_request(self):
        """Requests exceeding 50MB should be rejected"""
        response = client.post(
            "/webhook/policy-uploaded",
            content=b"x",
            headers={
                "Content-Type": "application/json",
                "Content-Length": str(60 * 1024 * 1024),  # 60MB
            },
        )
        assert response.status_code == 413
