"""
Vector Storage System for Aviation RAG
MongoDB-based vector storage with similarity search
"""

import os
import logging
from typing import List, Dict, Optional, Tuple
from datetime import datetime
import numpy as np

from pymongo import MongoClient, IndexModel
from pymongo.collection import Collection
from sentence_transformers import SentenceTransformer

from .pdf_processor import DocumentChunk


class VectorStore:
    """MongoDB-based vector storage and similarity search"""

    def __init__(self,
                 mongodb_uri: str = "mongodb://localhost:27017",
                 database_name: str = "aviation_rag",
                 collection_name: str = "document_chunks",
                 embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"):

        self.mongodb_uri = mongodb_uri
        self.database_name = database_name
        self.collection_name = collection_name

        self.client = None
        self.db = None
        self.collection = None

        self.embedding_model = SentenceTransformer(embedding_model)
        self.embedding_dimension = self.embedding_model.get_sentence_embedding_dimension()

        self.logger = logging.getLogger(__name__)

    def connect(self):
        """Connect to MongoDB"""
        try:
            self.client = MongoClient(self.mongodb_uri)
            self.db = self.client[self.database_name]
            self.collection = self.db[self.collection_name]

            # Test connection
            self.client.admin.command('ismaster')
            self.logger.info(f"Connected to MongoDB: {self.database_name}.{self.collection_name}")

            # Create indexes
            self._create_indexes()

        except Exception as e:
            self.logger.error(f"Failed to connect to MongoDB: {e}")
            raise

    def _create_indexes(self):
        """Create necessary indexes for efficient querying"""
        indexes = [
            IndexModel([("chunk_id", 1)], unique=True),
            IndexModel([("document_id", 1)]),
            IndexModel([("created_at", -1)]),
            IndexModel([("metadata.source_file", 1)])
        ]

        self.collection.create_indexes(indexes)
        self.logger.info("Created MongoDB indexes")

    def add_chunks(self, chunks: List[DocumentChunk], embeddings: Dict[str, List[float]]):
        """Store document chunks with their embeddings"""
        documents = []

        for chunk in chunks:
            if chunk.chunk_id not in embeddings:
                self.logger.warning(f"No embedding found for chunk {chunk.chunk_id}")
                continue

            doc = {
                "chunk_id": chunk.chunk_id,
                "document_id": chunk.document_id,
                "content": chunk.content,
                "page_number": chunk.page_number,
                "chunk_index": chunk.chunk_index,
                "embedding": embeddings[chunk.chunk_id],
                "metadata": chunk.metadata,
                "created_at": chunk.created_at
            }
            documents.append(doc)

        if documents:
            try:
                # Use upsert to handle duplicates
                for doc in documents:
                    self.collection.replace_one(
                        {"chunk_id": doc["chunk_id"]},
                        doc,
                        upsert=True
                    )

                self.logger.info(f"Stored {len(documents)} chunks in vector store")

            except Exception as e:
                self.logger.error(f"Failed to store chunks: {e}")
                raise
        else:
            self.logger.warning("No valid chunks to store")

    def similarity_search(self,
                         query: str,
                         k: int = 5,
                         threshold: float = 0.0,
                         document_id: Optional[str] = None) -> List[Dict]:
        """
        Perform similarity search using cosine similarity

        Args:
            query: Search query text
            k: Number of results to return
            threshold: Minimum similarity threshold
            document_id: Filter by specific document

        Returns:
            List of chunks with similarity scores
        """
        try:
            # Generate query embedding
            query_embedding = self.embedding_model.encode([query])[0].tolist()

            # Build aggregation pipeline
            pipeline = []

            # Filter by document if specified
            if document_id:
                pipeline.append({"$match": {"document_id": document_id}})

            # Add similarity calculation using $project
            pipeline.extend([
                {
                    "$addFields": {
                        "similarity": {
                            "$divide": [
                                # Dot product
                                {
                                    "$reduce": {
                                        "input": {"$range": [0, len(query_embedding)]},
                                        "initialValue": 0,
                                        "in": {
                                            "$add": [
                                                "$$value",
                                                {
                                                    "$multiply": [
                                                        {"$arrayElemAt": ["$embedding", "$$this"]},
                                                        query_embedding["$$this"] if isinstance(query_embedding, dict) else query_embedding[0] if len(query_embedding) > 0 else 0
                                                    ]
                                                }
                                            ]
                                        }
                                    }
                                },
                                # Magnitude multiplication (simplified - assume normalized vectors)
                                1.0
                            ]
                        }
                    }
                },
                {"$match": {"similarity": {"$gte": threshold}}},
                {"$sort": {"similarity": -1}},
                {"$limit": k},
                {
                    "$project": {
                        "chunk_id": 1,
                        "document_id": 1,
                        "content": 1,
                        "page_number": 1,
                        "chunk_index": 1,
                        "metadata": 1,
                        "similarity": 1,
                        "created_at": 1
                    }
                }
            ])

            # For MongoDB versions that don't support complex aggregation,
            # fall back to Python-based calculation
            return self._similarity_search_python(query, k, threshold, document_id)

        except Exception as e:
            self.logger.error(f"Similarity search failed: {e}")
            # Fallback to Python-based search
            return self._similarity_search_python(query, k, threshold, document_id)

    def _similarity_search_python(self,
                                 query: str,
                                 k: int = 5,
                                 threshold: float = 0.0,
                                 document_id: Optional[str] = None) -> List[Dict]:
        """Python-based similarity search fallback"""
        try:
            # Generate query embedding
            query_embedding = self.embedding_model.encode([query])[0]

            # Build filter
            filter_dict = {}
            if document_id:
                filter_dict["document_id"] = document_id

            # Get all chunks
            chunks = list(self.collection.find(filter_dict))

            # Calculate similarities
            similarities = []
            for chunk in chunks:
                chunk_embedding = np.array(chunk["embedding"])
                similarity = self._cosine_similarity(query_embedding, chunk_embedding)

                if similarity >= threshold:
                    chunk["similarity"] = float(similarity)
                    similarities.append(chunk)

            # Sort by similarity and limit
            similarities.sort(key=lambda x: x["similarity"], reverse=True)
            return similarities[:k]

        except Exception as e:
            self.logger.error(f"Python similarity search failed: {e}")
            return []

    def _cosine_similarity(self, a: np.ndarray, b: np.ndarray) -> float:
        """Calculate cosine similarity between two vectors"""
        dot_product = np.dot(a, b)
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)

        if norm_a == 0 or norm_b == 0:
            return 0.0

        return dot_product / (norm_a * norm_b)

    def get_chunk_by_id(self, chunk_id: str) -> Optional[Dict]:
        """Retrieve a specific chunk by ID"""
        try:
            return self.collection.find_one({"chunk_id": chunk_id})
        except Exception as e:
            self.logger.error(f"Failed to get chunk {chunk_id}: {e}")
            return None

    def get_chunks_by_document(self, document_id: str) -> List[Dict]:
        """Get all chunks for a specific document"""
        try:
            chunks = list(self.collection.find({"document_id": document_id}))
            return sorted(chunks, key=lambda x: (x["page_number"], x["chunk_index"]))
        except Exception as e:
            self.logger.error(f"Failed to get chunks for document {document_id}: {e}")
            return []

    def delete_document(self, document_id: str) -> int:
        """Delete all chunks for a document"""
        try:
            result = self.collection.delete_many({"document_id": document_id})
            deleted_count = result.deleted_count
            self.logger.info(f"Deleted {deleted_count} chunks for document {document_id}")
            return deleted_count
        except Exception as e:
            self.logger.error(f"Failed to delete document {document_id}: {e}")
            return 0

    def get_document_stats(self) -> Dict:
        """Get statistics about stored documents"""
        try:
            pipeline = [
                {
                    "$group": {
                        "_id": "$document_id",
                        "chunk_count": {"$sum": 1},
                        "source_file": {"$first": "$metadata.source_file"},
                        "created_at": {"$first": "$created_at"}
                    }
                },
                {
                    "$group": {
                        "_id": None,
                        "total_documents": {"$sum": 1},
                        "total_chunks": {"$sum": "$chunk_count"},
                        "documents": {
                            "$push": {
                                "document_id": "$_id",
                                "chunk_count": "$chunk_count",
                                "source_file": "$source_file",
                                "created_at": "$created_at"
                            }
                        }
                    }
                }
            ]

            result = list(self.collection.aggregate(pipeline))
            if result:
                stats = result[0]
                stats.pop("_id", None)
                return stats
            else:
                return {
                    "total_documents": 0,
                    "total_chunks": 0,
                    "documents": []
                }

        except Exception as e:
            self.logger.error(f"Failed to get document stats: {e}")
            return {"error": str(e)}

    def close(self):
        """Close MongoDB connection"""
        if self.client:
            self.client.close()
            self.logger.info("Closed MongoDB connection")


class VectorStoreManager:
    """High-level interface for vector store operations"""

    def __init__(self, vector_store: VectorStore):
        self.vector_store = vector_store
        self.logger = logging.getLogger(__name__)

    def process_and_store_pdf(self, pdf_path: str, pdf_processor) -> str:
        """Process PDF and store in vector store"""
        try:
            # Process PDF
            chunks = pdf_processor.process_pdf(pdf_path)
            embeddings = pdf_processor.generate_embeddings(chunks)

            # Store in vector store
            self.vector_store.add_chunks(chunks, embeddings)

            # Return document ID
            if chunks:
                document_id = chunks[0].document_id
                self.logger.info(f"Successfully processed and stored PDF: {pdf_path}")
                return document_id
            else:
                raise ValueError("No chunks generated from PDF")

        except Exception as e:
            self.logger.error(f"Failed to process and store PDF {pdf_path}: {e}")
            raise

    def search(self, query: str, k: int = 5, threshold: float = 0.3) -> List[Dict]:
        """Search for relevant chunks"""
        return self.vector_store.similarity_search(query, k, threshold)

    def get_stats(self) -> Dict:
        """Get vector store statistics"""
        return self.vector_store.get_document_stats()


if __name__ == "__main__":
    # Example usage
    logging.basicConfig(level=logging.INFO)

    # Initialize vector store
    vector_store = VectorStore()
    vector_store.connect()

    # Get stats
    stats = vector_store.get_document_stats()
    print(f"Vector store stats: {stats}")

    # Example search
    results = vector_store.similarity_search("항공기 시스템", k=3)
    print(f"Found {len(results)} results")

    for result in results:
        print(f"Score: {result['similarity']:.3f} - {result['content'][:100]}...")

    vector_store.close()