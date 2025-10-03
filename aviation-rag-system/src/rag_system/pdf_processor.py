"""
PDF Processing Pipeline for Aviation RAG System
Extracts text from PDF documents and creates semantic chunks
"""

import os
import logging
from typing import List, Dict, Optional
from dataclasses import dataclass
from datetime import datetime
import hashlib

import PyPDF2
import pdfplumber
from sentence_transformers import SentenceTransformer


@dataclass
class DocumentChunk:
    """Represents a chunk of text from a PDF document"""
    chunk_id: str
    document_id: str
    content: str
    page_number: int
    chunk_index: int
    metadata: Dict
    created_at: datetime


class PDFProcessor:
    """Handles PDF text extraction and chunking"""

    def __init__(self,
                 chunk_size: int = 512,
                 chunk_overlap: int = 50,
                 embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.embedding_model = SentenceTransformer(embedding_model)
        self.logger = logging.getLogger(__name__)

    def extract_text_pypdf2(self, pdf_path: str) -> List[Dict]:
        """Extract text using PyPDF2 (backup method)"""
        pages = []
        try:
            with open(pdf_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                for page_num, page in enumerate(pdf_reader.pages):
                    text = page.extract_text()
                    if text.strip():
                        pages.append({
                            'page_number': page_num + 1,
                            'content': text.strip(),
                            'method': 'pypdf2'
                        })
        except Exception as e:
            self.logger.error(f"PyPDF2 extraction failed: {e}")
            raise

        return pages

    def extract_text_pdfplumber(self, pdf_path: str) -> List[Dict]:
        """Extract text using pdfplumber (primary method)"""
        pages = []
        try:
            with pdfplumber.open(pdf_path) as pdf:
                for page_num, page in enumerate(pdf.pages):
                    text = page.extract_text()
                    if text and text.strip():
                        pages.append({
                            'page_number': page_num + 1,
                            'content': text.strip(),
                            'method': 'pdfplumber'
                        })
        except Exception as e:
            self.logger.error(f"pdfplumber extraction failed: {e}")
            raise

        return pages

    def extract_text(self, pdf_path: str) -> List[Dict]:
        """Extract text from PDF with fallback methods"""
        if not os.path.exists(pdf_path):
            raise FileNotFoundError(f"PDF file not found: {pdf_path}")

        try:
            # Primary: pdfplumber
            pages = self.extract_text_pdfplumber(pdf_path)
            if pages:
                self.logger.info(f"Extracted {len(pages)} pages using pdfplumber")
                return pages
        except Exception as e:
            self.logger.warning(f"pdfplumber failed, trying PyPDF2: {e}")

        try:
            # Fallback: PyPDF2
            pages = self.extract_text_pypdf2(pdf_path)
            if pages:
                self.logger.info(f"Extracted {len(pages)} pages using PyPDF2")
                return pages
        except Exception as e:
            self.logger.error(f"All extraction methods failed: {e}")
            raise

        raise ValueError("Could not extract text from PDF")

    def clean_text(self, text: str) -> str:
        """Clean and normalize extracted text"""
        # Remove excessive whitespace
        text = ' '.join(text.split())

        # Handle common PDF extraction issues
        text = text.replace('\x00', '')  # Remove null characters
        text = text.replace('\uf0b7', '•')  # Replace bullet points

        # Basic Korean/English text normalization
        import re
        text = re.sub(r'\s+', ' ', text)  # Multiple spaces to single
        text = re.sub(r'\n+', '\n', text)  # Multiple newlines to single

        return text.strip()

    def create_chunks(self, pages: List[Dict], document_id: str) -> List[DocumentChunk]:
        """Split pages into semantic chunks"""
        chunks = []

        for page_data in pages:
            page_content = self.clean_text(page_data['content'])
            page_number = page_data['page_number']

            # Simple sentence-based chunking
            sentences = self._split_into_sentences(page_content)

            current_chunk = ""
            chunk_index = 0

            for sentence in sentences:
                # Check if adding sentence exceeds chunk size
                potential_chunk = current_chunk + " " + sentence if current_chunk else sentence

                if len(potential_chunk.split()) > self.chunk_size and current_chunk:
                    # Save current chunk
                    chunk = self._create_chunk(
                        content=current_chunk,
                        document_id=document_id,
                        page_number=page_number,
                        chunk_index=chunk_index,
                        page_data=page_data
                    )
                    chunks.append(chunk)

                    # Start new chunk with overlap
                    overlap_words = current_chunk.split()[-self.chunk_overlap:]
                    current_chunk = " ".join(overlap_words) + " " + sentence
                    chunk_index += 1
                else:
                    current_chunk = potential_chunk

            # Add remaining chunk
            if current_chunk.strip():
                chunk = self._create_chunk(
                    content=current_chunk,
                    document_id=document_id,
                    page_number=page_number,
                    chunk_index=chunk_index,
                    page_data=page_data
                )
                chunks.append(chunk)

        self.logger.info(f"Created {len(chunks)} chunks for document {document_id}")
        return chunks

    def _split_into_sentences(self, text: str) -> List[str]:
        """Split text into sentences (basic implementation)"""
        import re
        # Simple sentence splitting for Korean/English
        sentences = re.split(r'[.!?。]\s+', text)
        return [s.strip() for s in sentences if s.strip()]

    def _create_chunk(self, content: str, document_id: str, page_number: int,
                     chunk_index: int, page_data: Dict) -> DocumentChunk:
        """Create a DocumentChunk object"""
        chunk_id = self._generate_chunk_id(document_id, page_number, chunk_index)

        metadata = {
            'source_file': page_data.get('source_file'),
            'extraction_method': page_data.get('method'),
            'word_count': len(content.split()),
            'char_count': len(content)
        }

        return DocumentChunk(
            chunk_id=chunk_id,
            document_id=document_id,
            content=content,
            page_number=page_number,
            chunk_index=chunk_index,
            metadata=metadata,
            created_at=datetime.now()
        )

    def _generate_chunk_id(self, document_id: str, page_number: int, chunk_index: int) -> str:
        """Generate unique chunk ID"""
        content = f"{document_id}-{page_number}-{chunk_index}"
        return hashlib.md5(content.encode()).hexdigest()

    def process_pdf(self, pdf_path: str) -> List[DocumentChunk]:
        """Main method to process a PDF file"""
        # Generate document ID from file
        document_id = self._generate_document_id(pdf_path)

        # Extract text from pages
        pages = self.extract_text(pdf_path)

        # Add source file to metadata
        for page in pages:
            page['source_file'] = os.path.basename(pdf_path)

        # Create chunks
        chunks = self.create_chunks(pages, document_id)

        self.logger.info(f"Successfully processed {pdf_path}: {len(chunks)} chunks")
        return chunks

    def _generate_document_id(self, pdf_path: str) -> str:
        """Generate unique document ID from file path"""
        filename = os.path.basename(pdf_path)
        timestamp = str(int(datetime.now().timestamp()))
        content = f"{filename}-{timestamp}"
        return hashlib.md5(content.encode()).hexdigest()

    def generate_embeddings(self, chunks: List[DocumentChunk]) -> Dict[str, List[float]]:
        """Generate embeddings for chunks"""
        texts = [chunk.content for chunk in chunks]
        embeddings = self.embedding_model.encode(texts)

        # Return mapping of chunk_id to embedding
        return {
            chunk.chunk_id: embedding.tolist()
            for chunk, embedding in zip(chunks, embeddings)
        }


if __name__ == "__main__":
    # Example usage
    logging.basicConfig(level=logging.INFO)

    processor = PDFProcessor(chunk_size=512, chunk_overlap=50)

    # Example PDF processing
    pdf_path = "data/pdfs/aviation_manual.pdf"
    if os.path.exists(pdf_path):
        chunks = processor.process_pdf(pdf_path)
        embeddings = processor.generate_embeddings(chunks)

        print(f"Processed {len(chunks)} chunks")
        print(f"Generated {len(embeddings)} embeddings")
    else:
        print(f"Example PDF not found: {pdf_path}")