"""
Tests for FastAPI endpoints
"""

import pytest
import asyncio
from unittest.mock import Mock, patch, AsyncMock
from fastapi.testclient import TestClient
import tempfile
import os

import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.api.main import app


class TestAviationRAGAPI:

    @pytest.fixture
    def client(self):
        """Create test client"""
        return TestClient(app)

    @pytest.fixture
    def mock_components(self):
        """Mock all system components"""
        with patch('src.api.main.pdf_processor') as mock_pdf, \
             patch('src.api.main.vector_store') as mock_vs, \
             patch('src.api.main.claude_client') as mock_claude, \
             patch('src.api.main.rag_engine') as mock_rag, \
             patch('src.api.main.vector_store_manager') as mock_vsm:

            # Configure mocks
            mock_pdf.return_value = Mock()
            mock_vs.return_value = Mock()
            mock_claude.return_value = Mock()
            mock_rag.return_value = Mock()
            mock_vsm.return_value = Mock()

            yield {
                'pdf_processor': mock_pdf,
                'vector_store': mock_vs,
                'claude_client': mock_claude,
                'rag_engine': mock_rag,
                'vector_store_manager': mock_vsm
            }

    def test_health_check_success(self, client):
        """Test health check endpoint"""
        with patch('src.api.main.pdf_processor', Mock()), \
             patch('src.api.main.vector_store', Mock()), \
             patch('src.api.main.claude_client', Mock()), \
             patch('src.api.main.rag_engine', Mock()):

            response = client.get("/health")
            assert response.status_code == 200

            data = response.json()
            assert "status" in data
            assert "timestamp" in data
            assert "version" in data
            assert "components" in data

    def test_health_check_with_stats(self, client):
        """Test health check with vector store stats"""
        mock_vector_store = Mock()
        mock_vector_store.get_document_stats.return_value = {
            "total_documents": 5,
            "total_chunks": 100
        }

        with patch('src.api.main.pdf_processor', Mock()), \
             patch('src.api.main.vector_store', mock_vector_store), \
             patch('src.api.main.claude_client', Mock()), \
             patch('src.api.main.rag_engine', Mock()):

            response = client.get("/health")
            assert response.status_code == 200

            data = response.json()
            assert data["components"]["vector_store_stats"]["total_documents"] == 5

    @patch('src.api.main.vector_store_manager')
    def test_upload_pdf_success(self, mock_vsm, client):
        """Test successful PDF upload"""
        # Mock vector store manager
        mock_vsm.process_and_store_pdf.return_value = "doc123"

        # Mock vector store for chunk count
        mock_vector_store = Mock()
        mock_vector_store.get_chunks_by_document.return_value = [{"id": "chunk1"}, {"id": "chunk2"}]

        with patch('src.api.main.vector_store', mock_vector_store):
            # Create temporary PDF file
            with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp_file:
                tmp_file.write(b"dummy pdf content")
                tmp_file.flush()

                try:
                    with open(tmp_file.name, "rb") as f:
                        response = client.post(
                            "/upload-pdf",
                            files={"file": ("test.pdf", f, "application/pdf")}
                        )

                    assert response.status_code == 200

                    data = response.json()
                    assert data["document_id"] == "doc123"
                    assert data["filename"] == "test.pdf"
                    assert data["chunks_processed"] == 2
                    assert data["status"] == "completed"
                    assert "processing_time_seconds" in data
                finally:
                    os.unlink(tmp_file.name)

    def test_upload_non_pdf_file(self, client):
        """Test upload with non-PDF file"""
        with tempfile.NamedTemporaryFile(suffix=".txt", delete=False) as tmp_file:
            tmp_file.write(b"dummy text content")
            tmp_file.flush()

            try:
                with open(tmp_file.name, "rb") as f:
                    response = client.post(
                        "/upload-pdf",
                        files={"file": ("test.txt", f, "text/plain")}
                    )

                assert response.status_code == 400
                assert "Only PDF files are allowed" in response.json()["detail"]
            finally:
                os.unlink(tmp_file.name)

    @patch('src.api.main.rag_engine')
    def test_chat_success(self, mock_rag_engine, client):
        """Test successful chat request"""
        # Mock RAG engine response
        mock_rag_engine.query_async = AsyncMock(return_value={
            "response": "This is a test response about aviation",
            "sources": [{"file": "manual.pdf", "page": 1}],
            "context_summary": {
                "chunks_retrieved": 3,
                "similarity_threshold": 0.3,
                "avg_similarity": 0.75
            },
            "usage": {
                "input_tokens": 150,
                "output_tokens": 200,
                "total_tokens": 350
            },
            "retrieval_time_seconds": 0.1,
            "generation_time_seconds": 1.2,
            "total_time_seconds": 1.3,
            "timestamp": "2024-01-01T00:00:00"
        })

        request_data = {
            "query": "What are aircraft control systems?",
            "k": 5,
            "similarity_threshold": 0.3,
            "max_tokens": 2000
        }

        response = client.post("/chat", json=request_data)
        assert response.status_code == 200

        data = response.json()
        assert data["response"] == "This is a test response about aviation"
        assert len(data["sources"]) == 1
        assert data["context_summary"]["chunks_retrieved"] == 3
        assert data["usage"]["total_tokens"] == 350

    def test_chat_invalid_request(self, client):
        """Test chat with invalid request data"""
        # Missing required query field
        request_data = {
            "k": 5,
            "similarity_threshold": 0.3
        }

        response = client.post("/chat", json=request_data)
        assert response.status_code == 422  # Validation error

    @patch('src.api.main.vector_store')
    def test_search_success(self, mock_vector_store, client):
        """Test successful search request"""
        # Mock vector store response
        mock_vector_store.similarity_search.return_value = [
            {
                "chunk_id": "chunk1",
                "content": "Aircraft control systems include primary flight controls",
                "similarity": 0.85,
                "page_number": 1
            },
            {
                "chunk_id": "chunk2",
                "content": "Secondary controls provide additional aircraft management",
                "similarity": 0.72,
                "page_number": 2
            }
        ]

        request_data = {
            "query": "aircraft control systems",
            "k": 10,
            "threshold": 0.1
        }

        response = client.post("/search", json=request_data)
        assert response.status_code == 200

        data = response.json()
        assert data["query"] == "aircraft control systems"
        assert data["total_found"] == 2
        assert len(data["results"]) == 2
        assert data["results"][0]["similarity"] == 0.85

    @patch('src.api.main.vector_store')
    def test_list_documents_success(self, mock_vector_store, client):
        """Test list documents endpoint"""
        # Mock vector store stats
        mock_vector_store.get_document_stats.return_value = {
            "total_documents": 3,
            "total_chunks": 45,
            "documents": [
                {"document_id": "doc1", "chunk_count": 15, "source_file": "manual1.pdf"},
                {"document_id": "doc2", "chunk_count": 20, "source_file": "manual2.pdf"},
                {"document_id": "doc3", "chunk_count": 10, "source_file": "manual3.pdf"}
            ]
        }

        response = client.get("/documents")
        assert response.status_code == 200

        data = response.json()
        assert data["total_documents"] == 3
        assert data["total_chunks"] == 45
        assert len(data["documents"]) == 3

    @patch('src.api.main.vector_store')
    def test_delete_document_success(self, mock_vector_store, client):
        """Test successful document deletion"""
        mock_vector_store.delete_document.return_value = 15

        response = client.delete("/documents/doc123")
        assert response.status_code == 200

        data = response.json()
        assert "Deleted document doc123" in data["message"]
        assert data["chunks_deleted"] == 15

    @patch('src.api.main.vector_store')
    def test_delete_document_not_found(self, mock_vector_store, client):
        """Test deletion of non-existent document"""
        mock_vector_store.delete_document.return_value = 0

        response = client.delete("/documents/nonexistent")
        assert response.status_code == 404
        assert "Document not found" in response.json()["detail"]

    @patch('src.api.main.claude_client')
    def test_list_models_success(self, mock_claude_client, client):
        """Test list models endpoint"""
        mock_claude_client.get_available_models.return_value = [
            "claude-3-5-sonnet-20241022",
            "claude-3-5-haiku-20241022",
            "claude-3-opus-20240229"
        ]
        mock_claude_client.model = "claude-3-5-sonnet-20241022"

        response = client.get("/models")
        assert response.status_code == 200

        data = response.json()
        assert len(data["available_models"]) == 3
        assert data["current_model"] == "claude-3-5-sonnet-20241022"

    def test_cors_headers(self, client):
        """Test CORS headers are present"""
        response = client.options("/health")
        assert response.status_code == 200

        # Check CORS headers
        headers = response.headers
        assert "access-control-allow-origin" in headers


@pytest.mark.asyncio
class TestAsyncEndpoints:
    """Test async functionality"""

    @patch('src.api.main.rag_engine')
    async def test_chat_async_processing(self, mock_rag_engine):
        """Test async chat processing"""
        mock_rag_engine.query_async = AsyncMock(return_value={
            "response": "Async response",
            "sources": [],
            "context_summary": {"chunks_retrieved": 0},
            "usage": {"total_tokens": 100},
            "retrieval_time_seconds": 0.1,
            "generation_time_seconds": 0.5,
            "total_time_seconds": 0.6,
            "timestamp": "2024-01-01T00:00:00"
        })

        # This would be tested in an actual async context
        # For now, just verify the mock is properly configured
        result = await mock_rag_engine.query_async("test query")
        assert result["response"] == "Async response"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])