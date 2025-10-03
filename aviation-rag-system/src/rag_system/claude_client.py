"""
Claude API Integration for Aviation RAG System
Handles Claude API calls with retrieved context
"""

import os
import logging
from typing import List, Dict, Optional, Tuple
from datetime import datetime
import asyncio

import anthropic
from anthropic import Anthropic


class ClaudeClient:
    """Client for Claude API with RAG integration"""

    def __init__(self, api_key: Optional[str] = None, model: str = "claude-3-5-sonnet-20241022"):
        self.api_key = api_key or os.getenv("ANTHROPIC_API_KEY")
        self.model = model

        if not self.api_key:
            raise ValueError("ANTHROPIC_API_KEY environment variable or api_key parameter required")

        self.client = Anthropic(api_key=self.api_key)
        self.logger = logging.getLogger(__name__)

        # System prompt for aviation domain
        self.system_prompt = """You are an expert aviation assistant with comprehensive knowledge of:
- Aircraft systems and operations
- Aviation meteorology and weather interpretation
- Flight regulations and procedures
- Navigation and flight planning
- Emergency procedures and safety protocols
- Aircraft performance and aerodynamics

When provided with context from aviation documents, use it to give accurate, detailed answers.
Always prioritize safety and cite relevant regulations when applicable.

Respond in Korean if the question is in Korean, otherwise respond in English.
If the context doesn't contain relevant information, clearly state this limitation."""

    def create_prompt_with_context(self, user_query: str, context_chunks: List[Dict]) -> str:
        """Create a prompt combining user query with retrieved context"""

        if not context_chunks:
            return f"User Question: {user_query}\n\nNote: No relevant context found in documents."

        # Format context chunks
        context_parts = []
        for i, chunk in enumerate(context_chunks, 1):
            source_info = ""
            if chunk.get("metadata", {}).get("source_file"):
                source_info = f" (Source: {chunk['metadata']['source_file']}, Page {chunk.get('page_number', 'N/A')})"

            context_parts.append(
                f"Context {i}{source_info}:\n{chunk['content']}\n"
            )

        context_text = "\n".join(context_parts)

        prompt = f"""Based on the following context from aviation documents, please answer the user's question.

Context Information:
{context_text}

User Question: {user_query}

Please provide a comprehensive answer based on the context above. If the context doesn't fully address the question, clearly indicate what information is missing."""

        return prompt

    def generate_response(self,
                         user_query: str,
                         context_chunks: List[Dict] = None,
                         max_tokens: int = 2000,
                         temperature: float = 0.1) -> Dict:
        """
        Generate response using Claude API with optional context

        Args:
            user_query: User's question
            context_chunks: Retrieved context chunks from vector store
            max_tokens: Maximum tokens in response
            temperature: Response temperature (0.0-1.0)

        Returns:
            Dict with response, usage info, and metadata
        """
        try:
            context_chunks = context_chunks or []

            # Create prompt with context
            prompt = self.create_prompt_with_context(user_query, context_chunks)

            # Make API call
            response = self.client.messages.create(
                model=self.model,
                max_tokens=max_tokens,
                temperature=temperature,
                system=self.system_prompt,
                messages=[
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            )

            # Extract response content
            response_text = response.content[0].text

            # Prepare result
            result = {
                "response": response_text,
                "model": self.model,
                "usage": {
                    "input_tokens": response.usage.input_tokens,
                    "output_tokens": response.usage.output_tokens,
                    "total_tokens": response.usage.input_tokens + response.usage.output_tokens
                },
                "context_chunks_used": len(context_chunks),
                "sources": self._extract_sources(context_chunks),
                "timestamp": datetime.now().isoformat()
            }

            self.logger.info(f"Generated response with {len(context_chunks)} context chunks")
            return result

        except anthropic.APIError as e:
            self.logger.error(f"Claude API error: {e}")
            raise
        except Exception as e:
            self.logger.error(f"Error generating response: {e}")
            raise

    def _extract_sources(self, context_chunks: List[Dict]) -> List[Dict]:
        """Extract source information from context chunks"""
        sources = []
        seen_sources = set()

        for chunk in context_chunks:
            source_file = chunk.get("metadata", {}).get("source_file")
            page_number = chunk.get("page_number")

            if source_file:
                source_key = f"{source_file}:{page_number}"
                if source_key not in seen_sources:
                    sources.append({
                        "file": source_file,
                        "page": page_number,
                        "similarity": chunk.get("similarity", 0.0)
                    })
                    seen_sources.add(source_key)

        return sources

    async def generate_response_async(self,
                                    user_query: str,
                                    context_chunks: List[Dict] = None,
                                    max_tokens: int = 2000,
                                    temperature: float = 0.1) -> Dict:
        """Async version of generate_response"""
        # Run the sync method in a thread pool
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None,
            self.generate_response,
            user_query,
            context_chunks,
            max_tokens,
            temperature
        )

    def validate_api_key(self) -> bool:
        """Validate API key by making a test call"""
        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=10,
                messages=[
                    {
                        "role": "user",
                        "content": "Test"
                    }
                ]
            )
            return True
        except Exception as e:
            self.logger.error(f"API key validation failed: {e}")
            return False

    def get_available_models(self) -> List[str]:
        """Get list of available Claude models"""
        return [
            "claude-3-5-sonnet-20241022",
            "claude-3-5-haiku-20241022",
            "claude-3-opus-20240229",
            "claude-3-sonnet-20240229",
            "claude-3-haiku-20240307"
        ]


class RAGEngine:
    """Main RAG engine combining vector search and Claude API"""

    def __init__(self, vector_store, claude_client: ClaudeClient):
        self.vector_store = vector_store
        self.claude_client = claude_client
        self.logger = logging.getLogger(__name__)

    def query(self,
              user_query: str,
              k: int = 5,
              similarity_threshold: float = 0.3,
              max_tokens: int = 2000) -> Dict:
        """
        Process user query through RAG pipeline

        Args:
            user_query: User's question
            k: Number of context chunks to retrieve
            similarity_threshold: Minimum similarity for context chunks
            max_tokens: Maximum tokens in Claude response

        Returns:
            Dict with response and metadata
        """
        try:
            # Step 1: Retrieve relevant context
            start_time = datetime.now()
            context_chunks = self.vector_store.similarity_search(
                query=user_query,
                k=k,
                threshold=similarity_threshold
            )

            retrieval_time = (datetime.now() - start_time).total_seconds()

            # Step 2: Generate response with Claude
            start_time = datetime.now()
            claude_response = self.claude_client.generate_response(
                user_query=user_query,
                context_chunks=context_chunks,
                max_tokens=max_tokens
            )

            generation_time = (datetime.now() - start_time).total_seconds()

            # Step 3: Combine results
            result = {
                **claude_response,
                "user_query": user_query,
                "retrieval_time_seconds": retrieval_time,
                "generation_time_seconds": generation_time,
                "total_time_seconds": retrieval_time + generation_time,
                "context_summary": {
                    "chunks_retrieved": len(context_chunks),
                    "similarity_threshold": similarity_threshold,
                    "avg_similarity": self._calculate_avg_similarity(context_chunks)
                }
            }

            self.logger.info(f"RAG query completed in {result['total_time_seconds']:.2f}s")
            return result

        except Exception as e:
            self.logger.error(f"RAG query failed: {e}")
            raise

    def _calculate_avg_similarity(self, chunks: List[Dict]) -> float:
        """Calculate average similarity score of retrieved chunks"""
        if not chunks:
            return 0.0

        similarities = [chunk.get("similarity", 0.0) for chunk in chunks]
        return sum(similarities) / len(similarities)

    async def query_async(self,
                         user_query: str,
                         k: int = 5,
                         similarity_threshold: float = 0.3,
                         max_tokens: int = 2000) -> Dict:
        """Async version of query method"""
        try:
            # Retrieve context (sync)
            start_time = datetime.now()
            context_chunks = self.vector_store.similarity_search(
                query=user_query,
                k=k,
                threshold=similarity_threshold
            )
            retrieval_time = (datetime.now() - start_time).total_seconds()

            # Generate response (async)
            start_time = datetime.now()
            claude_response = await self.claude_client.generate_response_async(
                user_query=user_query,
                context_chunks=context_chunks,
                max_tokens=max_tokens
            )
            generation_time = (datetime.now() - start_time).total_seconds()

            # Combine results
            result = {
                **claude_response,
                "user_query": user_query,
                "retrieval_time_seconds": retrieval_time,
                "generation_time_seconds": generation_time,
                "total_time_seconds": retrieval_time + generation_time,
                "context_summary": {
                    "chunks_retrieved": len(context_chunks),
                    "similarity_threshold": similarity_threshold,
                    "avg_similarity": self._calculate_avg_similarity(context_chunks)
                }
            }

            return result

        except Exception as e:
            self.logger.error(f"Async RAG query failed: {e}")
            raise


if __name__ == "__main__":
    # Example usage
    logging.basicConfig(level=logging.INFO)

    # Initialize Claude client
    claude_client = ClaudeClient()

    # Validate API key
    if claude_client.validate_api_key():
        print("✅ Claude API key is valid")

        # Example query without context
        response = claude_client.generate_response(
            user_query="항공기의 양력 원리에 대해 설명해주세요.",
            context_chunks=[]
        )

        print(f"Response: {response['response'][:200]}...")
        print(f"Usage: {response['usage']}")
    else:
        print("❌ Invalid Claude API key")