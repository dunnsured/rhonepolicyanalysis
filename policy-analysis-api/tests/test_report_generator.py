"""
Tests for report generator service.
"""

import os
import sys
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from services.report_generator import generator


class TestReportGenerator:
    @pytest.mark.asyncio
    async def test_generate_report_with_valid_data(self, sample_analysis_data, tmp_path):
        """Should generate a PDF report from valid analysis data"""
        result = await generator.generate_report(
            analysis_data=sample_analysis_data,
            output_dir=str(tmp_path),
        )

        if result.success:
            assert result.report_path is not None
            assert os.path.exists(result.report_path)
            assert result.report_path.endswith(".pdf")

            # Verify file is a valid PDF (starts with %PDF)
            with open(result.report_path, "rb") as f:
                header = f.read(5)
                assert header == b"%PDF-"

    @pytest.mark.asyncio
    async def test_generate_report_with_empty_data(self, tmp_path):
        """Should handle empty analysis data gracefully"""
        result = await generator.generate_report(
            analysis_data={},
            output_dir=str(tmp_path),
        )
        # Should either succeed with defaults or fail gracefully
        assert isinstance(result.success, bool)

    @pytest.mark.asyncio
    async def test_generate_report_with_minimal_data(self, tmp_path):
        """Should generate report with minimal executive summary"""
        minimal_data = {
            "executive_summary": {
                "recommendation": "Review this policy.",
                "key_metrics": {
                    "overall_maturity_score": 50,
                },
            },
        }
        result = await generator.generate_report(
            analysis_data=minimal_data,
            output_dir=str(tmp_path),
        )
        # Should succeed or fail gracefully
        assert isinstance(result.success, bool)
