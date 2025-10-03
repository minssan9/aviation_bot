"""
FastAPI REST API for Aviation RAG System
Provides endpoints for PDF upload, chat, and search
"""

import os
import logging
from typing import List, Dict, Optional
from datetime import datetime
import asyncio
from pathlib import Path

from fastapi import FastAPI, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
import uvicorn

# Import our RAG system components
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from rag_system.pdf_processor import PDFProcessor
from rag_system.vector_store import VectorStore, VectorStoreManager
from rag_system.claude_client import ClaudeClient, RAGEngine


# Pydantic models for API
class ChatRequest(BaseModel):
    query: str = Field(..., description="User query")
    session_id: Optional[str] = Field(None, description="Session ID for conversation tracking")
    k: int = Field(5, description="Number of context chunks to retrieve", ge=1, le=20)
    similarity_threshold: float = Field(0.3, description="Minimum similarity threshold", ge=0.0, le=1.0)
    max_tokens: int = Field(2000, description="Maximum tokens in response", ge=100, le=4000)


class ChatResponse(BaseModel):
    response: str
    session_id: Optional[str]
    sources: List[Dict]
    context_summary: Dict
    usage: Dict
    retrieval_time_seconds: float
    generation_time_seconds: float
    total_time_seconds: float
    timestamp: str


class SearchRequest(BaseModel):
    query: str = Field(..., description="Search query")
    k: int = Field(10, description="Number of results to return", ge=1, le=50)
    threshold: float = Field(0.1, description="Minimum similarity threshold", ge=0.0, le=1.0)
    document_id: Optional[str] = Field(None, description="Filter by specific document")


class SearchResponse(BaseModel):
    results: List[Dict]
    query: str
    total_found: int
    execution_time_seconds: float


class UploadResponse(BaseModel):
    document_id: str
    filename: str
    chunks_processed: int
    processing_time_seconds: float
    status: str


class HealthResponse(BaseModel):
    status: str
    timestamp: str
    version: str
    components: Dict


# Initialize FastAPI app
app = FastAPI(
    title="Aviation RAG API",
    description="REST API for Aviation Knowledge Retrieval-Augmented Generation System",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global components
pdf_processor: Optional[PDFProcessor] = None
vector_store: Optional[VectorStore] = None
claude_client: Optional[ClaudeClient] = None
rag_engine: Optional[RAGEngine] = None
vector_store_manager: Optional[VectorStoreManager] = None

# Configuration
UPLOAD_DIR = Path("data/pdfs")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Logging setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def startup_event():
    """Initialize components on startup"""
    global pdf_processor, vector_store, claude_client, rag_engine, vector_store_manager

    try:
        logger.info("Initializing Aviation RAG System...")

        # Initialize PDF processor
        pdf_processor = PDFProcessor(
            chunk_size=512,
            chunk_overlap=50
        )
        logger.info("✅ PDF processor initialized")

        # Initialize vector store
        mongodb_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
        vector_store = VectorStore(mongodb_uri=mongodb_uri)
        vector_store.connect()
        logger.info("✅ Vector store connected")

        # Initialize Claude client
        claude_client = ClaudeClient()
        if not claude_client.validate_api_key():
            logger.error("❌ Invalid Claude API key")
            raise ValueError("Invalid Claude API key")
        logger.info("✅ Claude client initialized")

        # Initialize RAG engine
        rag_engine = RAGEngine(vector_store, claude_client)
        logger.info("✅ RAG engine initialized")

        # Initialize vector store manager
        vector_store_manager = VectorStoreManager(vector_store)
        logger.info("✅ Vector store manager initialized")

        logger.info("🚀 Aviation RAG System ready!")

    except Exception as e:
        logger.error(f"❌ Startup failed: {e}")
        raise


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    global vector_store

    if vector_store:
        vector_store.close()
        logger.info("Vector store connection closed")


# API Endpoints

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    components = {
        "pdf_processor": pdf_processor is not None,
        "vector_store": vector_store is not None,
        "claude_client": claude_client is not None,
        "rag_engine": rag_engine is not None
    }

    # Test vector store connection
    if vector_store:
        try:
            stats = vector_store.get_document_stats()
            components["vector_store_stats"] = stats
        except Exception as e:
            components["vector_store_error"] = str(e)

    return HealthResponse(
        status="healthy" if all(components.values()) else "unhealthy",
        timestamp=datetime.now().isoformat(),
        version="1.0.0",
        components=components
    )


@app.post("/upload-pdf", response_model=UploadResponse)
async def upload_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="PDF file to upload")
):
    """Upload and process a PDF file"""
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    try:
        start_time = datetime.now()

        # Save uploaded file
        file_path = UPLOAD_DIR / file.filename
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)

        # Process PDF in background
        document_id = await asyncio.get_event_loop().run_in_executor(
            None,
            vector_store_manager.process_and_store_pdf,
            str(file_path),
            pdf_processor
        )

        processing_time = (datetime.now() - start_time).total_seconds()

        # Get chunk count
        chunks = vector_store.get_chunks_by_document(document_id)
        chunks_processed = len(chunks)

        logger.info(f"Successfully processed PDF {file.filename}: {chunks_processed} chunks")

        return UploadResponse(
            document_id=document_id,
            filename=file.filename,
            chunks_processed=chunks_processed,
            processing_time_seconds=processing_time,
            status="completed"
        )

    except Exception as e:
        logger.error(f"PDF upload failed: {e}")
        raise HTTPException(status_code=500, detail=f"PDF processing failed: {str(e)}")


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Chat endpoint with RAG"""
    try:
        # Process query through RAG engine
        result = await rag_engine.query_async(
            user_query=request.query,
            k=request.k,
            similarity_threshold=request.similarity_threshold,
            max_tokens=request.max_tokens
        )

        return ChatResponse(
            response=result["response"],
            session_id=request.session_id,
            sources=result["sources"],
            context_summary=result["context_summary"],
            usage=result["usage"],
            retrieval_time_seconds=result["retrieval_time_seconds"],
            generation_time_seconds=result["generation_time_seconds"],
            total_time_seconds=result["total_time_seconds"],
            timestamp=result["timestamp"]
        )

    except Exception as e:
        logger.error(f"Chat request failed: {e}")
        raise HTTPException(status_code=500, detail=f"Chat processing failed: {str(e)}")


@app.post("/search", response_model=SearchResponse)
async def search(request: SearchRequest):
    """Search for similar chunks in vector store"""
    try:
        start_time = datetime.now()

        # Perform similarity search
        results = vector_store.similarity_search(
            query=request.query,
            k=request.k,
            threshold=request.threshold,
            document_id=request.document_id
        )

        execution_time = (datetime.now() - start_time).total_seconds()

        return SearchResponse(
            results=results,
            query=request.query,
            total_found=len(results),
            execution_time_seconds=execution_time
        )

    except Exception as e:
        logger.error(f"Search request failed: {e}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@app.get("/documents")
async def list_documents():
    """List all processed documents"""
    try:
        stats = vector_store.get_document_stats()
        return {
            "documents": stats.get("documents", []),
            "total_documents": stats.get("total_documents", 0),
            "total_chunks": stats.get("total_chunks", 0)
        }
    except Exception as e:
        logger.error(f"Failed to list documents: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list documents: {str(e)}")


@app.delete("/documents/{document_id}")
async def delete_document(document_id: str):
    """Delete a document and all its chunks"""
    try:
        deleted_count = vector_store.delete_document(document_id)
        if deleted_count > 0:
            return {
                "message": f"Deleted document {document_id}",
                "chunks_deleted": deleted_count
            }
        else:
            raise HTTPException(status_code=404, detail="Document not found")
    except Exception as e:
        logger.error(f"Failed to delete document {document_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Delete failed: {str(e)}")


@app.get("/models")
async def list_models():
    """List available Claude models"""
    try:
        models = claude_client.get_available_models()
        return {
            "available_models": models,
            "current_model": claude_client.model
        }
    except Exception as e:
        logger.error(f"Failed to list models: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list models: {str(e)}")


# Development server
if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )