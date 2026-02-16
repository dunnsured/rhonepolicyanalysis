"""
Tests for PDF extraction service.
"""

import os
import sys
import pytest
from unittest.mock import patch, MagicMock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from services.pdf_extractor import extractor


class TestPDFExtractor:
    @pytest.mark.asyncio
    async def test_extract_from_nonexistent_file(self):
        """Should return failure for non-existent files"""
        result = await extractor.extract_from_file("/nonexistent/path/to/file.pdf")
        assert result.success is False
        assert result.error is not None

    @pytest.mark.asyncio
    async def test_extract_from_empty_file(self, tmp_path):
        """Should handle empty files gracefully"""
        empty_file = tmp_path / "empty.pdf"
        empty_file.write_bytes(b"")

        result = await extractor.extract_from_file(str(empty_file))
        assert result.success is False

    @pytest.mark.asyncio
    async def test_extract_from_non_pdf(self, tmp_path):
        """Should handle non-PDF files gracefully"""
        text_file = tmp_path / "not_a_pdf.pdf"
        text_file.write_text("This is just plain text, not a PDF")

        result = await extractor.extract_from_file(str(text_file))
        # Should fail since it's not a valid PDF
        assert result.success is False

    @pytest.mark.asyncio
    async def test_extract_from_invalid_url(self):
        """Should return failure for unreachable URLs"""
        result = await extractor.extract_from_url("https://invalid.example.com/nonexistent.pdf")
        assert result.success is False
        assert result.error is not None
