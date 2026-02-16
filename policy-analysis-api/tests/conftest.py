"""
Shared test fixtures for the Policy Analysis API test suite.
"""

import os
import sys
import pytest
from unittest.mock import MagicMock, AsyncMock

# Add src to path so imports work
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

# Set test environment before importing app modules
os.environ["ENVIRONMENT"] = "testing"
os.environ["ANTHROPIC_API_KEY"] = "test-key"
os.environ["WEBHOOK_SECRET"] = "test-webhook-secret-for-hmac-signing"
os.environ["SUPABASE_URL"] = ""
os.environ["SUPABASE_SERVICE_KEY"] = ""


@pytest.fixture
def sample_webhook_payload():
    """Sample webhook payload matching CRM dispatch format"""
    return {
        "event_type": "policy.uploaded",
        "policy_id": "test-policy-001",
        "tenant_id": "test-tenant-001",
        "client_id": "test-company-001",
        "client_name": "Acme Corp",
        "client_industry": "Technology",
        "file_url": "https://example.supabase.co/storage/v1/object/sign/test.pdf?token=abc",
        "file_name": "acme_cyber_policy.pdf",
        "file_size": 1024000,
        "uploaded_by": "tenant",
        "policy_type": "cyber",
        "renewal": False,
        "priority": "normal",
        "callback_url": "https://app.example.com/api/webhook/analysis-complete",
    }


@pytest.fixture
def sample_analysis_data():
    """Sample analysis output matching Claude analyzer format"""
    return {
        "executive_summary": {
            "recommendation": "This policy provides adequate cyber coverage with some notable gaps.",
            "key_metrics": {
                "overall_maturity_score": 72.5,
                "first_party_score": 80,
                "third_party_score": 65,
                "cyber_crime_score": 70,
            },
        },
        "coverage_analysis": {
            "first_party": {"score": 80, "findings": []},
            "third_party": {"score": 65, "findings": []},
        },
        "gaps_identified": [
            {"title": "No social engineering coverage", "severity": "high"},
        ],
    }


@pytest.fixture
def sample_extraction_result():
    """Sample PDF extraction result"""
    mock = MagicMock()
    mock.success = True
    mock.text = "CYBER LIABILITY INSURANCE POLICY\n\nThis policy provides coverage..."
    mock.page_count = 25
    mock.error = None
    return mock


@pytest.fixture
def sample_analysis_result(sample_analysis_data):
    """Sample Claude analysis result"""
    mock = MagicMock()
    mock.success = True
    mock.analysis_data = sample_analysis_data
    mock.tokens_used = {"input": 5000, "output": 3000}
    mock.error = None
    return mock


@pytest.fixture
def sample_report_result():
    """Sample report generation result"""
    mock = MagicMock()
    mock.success = True
    mock.report_path = "/tmp/test_report.pdf"
    mock.error = None
    return mock
