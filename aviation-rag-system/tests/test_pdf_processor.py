"""
Tests for PDF processor component
"""

import pytest
import tempfile
import os
from unittest.mock import Mock, patch
from datetime import datetime

import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.rag_system.pdf_processor import PDFProcessor, DocumentChunk


class TestPDFProcessor:

    @pytest.fixture
    def pdf_processor(self):
        """Create a PDF processor instance for testing"""
        return PDFProcessor(chunk_size=100, chunk_overlap=10)

    def test_initialization(self, pdf_processor):
        """Test PDF processor initialization"""
        assert pdf_processor.chunk_size == 100
        assert pdf_processor.chunk_overlap == 10
        assert pdf_processor.embedding_model is not None

    def test_clean_text(self, pdf_processor):
        """Test text cleaning functionality"""
        dirty_text = "  This  is   a  test\n\n\nwith   multiple  spaces\x00  "
        clean_text = pdf_processor.clean_text(dirty_text)

        assert clean_text == "This is a test with multiple spaces"
        assert "\x00" not in clean_text

    def test_split_into_sentences(self, pdf_processor):
        """Test sentence splitting"""
        text = "First sentence. Second sentence! Third sentence? Fourth sentence."
        sentences = pdf_processor._split_into_sentences(text)

        assert len(sentences) == 4
        assert "First sentence" in sentences[0]
        assert "Second sentence" in sentences[1]

    def test_generate_chunk_id(self, pdf_processor):
        """Test chunk ID generation"""
        chunk_id = pdf_processor._generate_chunk_id("doc123", 1, 0)

        assert isinstance(chunk_id, str)
        assert len(chunk_id) == 32  # MD5 hash length

    def test_generate_document_id(self, pdf_processor):
        """Test document ID generation"""
        doc_id = pdf_processor._generate_document_id("/path/to/test.pdf")

        assert isinstance(doc_id, str)
        assert len(doc_id) == 32  # MD5 hash length

    def test_create_chunk(self, pdf_processor):
        """Test chunk creation"""
        chunk = pdf_processor._create_chunk(
            content="Test content",
            document_id="doc123",
            page_number=1,
            chunk_index=0,
            page_data={"source_file": "test.pdf", "method": "pdfplumber"}
        )

        assert isinstance(chunk, DocumentChunk)
        assert chunk.content == "Test content"
        assert chunk.document_id == "doc123"
        assert chunk.page_number == 1
        assert chunk.chunk_index == 0
        assert chunk.metadata["source_file"] == "test.pdf"
        assert isinstance(chunk.created_at, datetime)

    def test_create_chunks_simple(self, pdf_processor):
        """Test chunk creation from pages"""
        pages = [
            {
                "page_number": 1,
                "content": "This is a simple test document. " * 20,  # Make it long enough to split
                "source_file": "test.pdf",
                "method": "pdfplumber"
            }
        ]

        chunks = pdf_processor.create_chunks(pages, "doc123")

        assert len(chunks) > 0
        assert all(isinstance(chunk, DocumentChunk) for chunk in chunks)
        assert chunks[0].document_id == "doc123"
        assert chunks[0].page_number == 1

    @patch('src.rag_system.pdf_processor.pdfplumber')
    def test_extract_text_pdfplumber_success(self, mock_pdfplumber, pdf_processor):
        """Test successful text extraction with pdfplumber"""
        # Mock pdfplumber
        mock_pdf = Mock()
        mock_page = Mock()
        mock_page.extract_text.return_value = "Test content from PDF"
        mock_pdf.pages = [mock_page]
        mock_pdfplumber.open.return_value.__enter__.return_value = mock_pdf

        # Create temporary PDF file
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp_file:
            pdf_path = tmp_file.name

        try:
            pages = pdf_processor.extract_text_pdfplumber(pdf_path)

            assert len(pages) == 1
            assert pages[0]["content"] == "Test content from PDF"
            assert pages[0]["page_number"] == 1
            assert pages[0]["method"] == "pdfplumber"
        finally:
            os.unlink(pdf_path)

    @patch('src.rag_system.pdf_processor.PyPDF2')
    def test_extract_text_pypdf2_success(self, mock_pypdf2, pdf_processor):
        """Test successful text extraction with PyPDF2"""
        # Mock PyPDF2
        mock_reader = Mock()
        mock_page = Mock()
        mock_page.extract_text.return_value = "Test content from PyPDF2"
        mock_reader.pages = [mock_page]
        mock_pypdf2.PdfReader.return_value = mock_reader

        # Create temporary PDF file
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp_file:
            pdf_path = tmp_file.name

        try:
            pages = pdf_processor.extract_text_pypdf2(pdf_path)

            assert len(pages) == 1
            assert pages[0]["content"] == "Test content from PyPDF2"
            assert pages[0]["page_number"] == 1
            assert pages[0]["method"] == "pypdf2"
        finally:
            os.unlink(pdf_path)

    def test_extract_text_file_not_found(self, pdf_processor):
        """Test error handling for non-existent file"""
        with pytest.raises(FileNotFoundError):
            pdf_processor.extract_text("non_existent.pdf")

    @patch('src.rag_system.pdf_processor.PDFProcessor.extract_text')
    def test_process_pdf_success(self, mock_extract_text, pdf_processor):
        """Test complete PDF processing"""
        # Mock extract_text
        mock_extract_text.return_value = [
            {
                "page_number": 1,
                "content": "Test content from page 1. " * 50,
                "method": "pdfplumber"
            }
        ]

        # Create temporary PDF file
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp_file:
            pdf_path = tmp_file.name

        try:
            chunks = pdf_processor.process_pdf(pdf_path)

            assert len(chunks) > 0
            assert all(isinstance(chunk, DocumentChunk) for chunk in chunks)
            assert chunks[0].metadata["source_file"] == os.path.basename(pdf_path)
        finally:
            os.unlink(pdf_path)

    @patch('src.rag_system.pdf_processor.SentenceTransformer')
    def test_generate_embeddings(self, mock_transformer, pdf_processor):
        """Test embedding generation"""
        # Mock sentence transformer
        mock_model = Mock()
        mock_model.encode.return_value = [[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]]
        mock_transformer.return_value = mock_model
        pdf_processor.embedding_model = mock_model

        # Create test chunks
        chunks = [
            DocumentChunk(
                chunk_id="chunk1",
                document_id="doc1",
                content="First chunk content",
                page_number=1,
                chunk_index=0,
                metadata={},
                created_at=datetime.now()
            ),
            DocumentChunk(
                chunk_id="chunk2",
                document_id="doc1",
                content="Second chunk content",
                page_number=1,
                chunk_index=1,
                metadata={},
                created_at=datetime.now()
            )
        ]

        embeddings = pdf_processor.generate_embeddings(chunks)

        assert len(embeddings) == 2
        assert "chunk1" in embeddings
        assert "chunk2" in embeddings
        assert embeddings["chunk1"] == [0.1, 0.2, 0.3]
        assert embeddings["chunk2"] == [0.4, 0.5, 0.6]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])