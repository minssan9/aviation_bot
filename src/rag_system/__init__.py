"""
Aviation RAG System
A production-ready RAG system for aviation knowledge management
"""

__version__ = "1.0.0"
__author__ = "Aviation RAG Team"

from .pdf_processor import PDFProcessor, DocumentChunk
from .vector_store import VectorStore, VectorStoreManager
from .claude_client import ClaudeClient, RAGEngine

__all__ = [
    "PDFProcessor",
    "DocumentChunk",
    "VectorStore",
    "VectorStoreManager",
    "ClaudeClient",
    "RAGEngine"
]