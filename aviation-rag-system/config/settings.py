"""
Configuration settings for Aviation RAG System
"""

import os
from typing import Optional
from pydantic import BaseSettings, Field


class Settings(BaseSettings):
    """Application settings with environment variable support"""

    # Claude API Configuration
    anthropic_api_key: str = Field(..., env="ANTHROPIC_API_KEY")
    claude_model: str = Field("claude-3-5-sonnet-20241022", env="CLAUDE_MODEL")

    # MongoDB Configuration
    mongodb_uri: str = Field("mongodb://localhost:27017", env="MONGODB_URI")
    database_name: str = Field("aviation_rag", env="DATABASE_NAME")
    collection_name: str = Field("document_chunks", env="COLLECTION_NAME")

    # API Configuration
    api_host: str = Field("0.0.0.0", env="API_HOST")
    api_port: int = Field(8000, env="API_PORT")
    api_workers: int = Field(1, env="API_WORKERS")

    # ML Model Configuration
    embedding_model: str = Field("sentence-transformers/all-MiniLM-L6-v2", env="EMBEDDING_MODEL")

    # Processing Configuration
    chunk_size: int = Field(512, env="CHUNK_SIZE")
    chunk_overlap: int = Field(50, env="CHUNK_OVERLAP")
    max_upload_size_mb: int = Field(50, env="MAX_UPLOAD_SIZE_MB")

    # Search Configuration
    similarity_threshold: float = Field(0.3, env="SIMILARITY_THRESHOLD")
    default_k: int = Field(5, env="DEFAULT_K")
    max_tokens: int = Field(2000, env="MAX_TOKENS")
    temperature: float = Field(0.1, env="TEMPERATURE")

    # Logging Configuration
    log_level: str = Field("INFO", env="LOG_LEVEL")
    log_format: str = Field("json", env="LOG_FORMAT")

    # Development Configuration
    debug: bool = Field(False, env="DEBUG")
    reload: bool = Field(True, env="RELOAD")

    # Performance Configuration
    vector_search_cache_size: int = Field(1000, env="VECTOR_SEARCH_CACHE_SIZE")
    embedding_batch_size: int = Field(32, env="EMBEDDING_BATCH_SIZE")
    max_concurrent_requests: int = Field(10, env="MAX_CONCURRENT_REQUESTS")

    # Optional Monitoring
    sentry_dsn: Optional[str] = Field(None, env="SENTRY_DSN")
    prometheus_port: int = Field(9090, env="PROMETHEUS_PORT")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False

    def validate_settings(self) -> bool:
        """Validate critical settings"""
        if not self.anthropic_api_key:
            raise ValueError("ANTHROPIC_API_KEY is required")

        if self.chunk_size <= 0:
            raise ValueError("CHUNK_SIZE must be positive")

        if self.chunk_overlap >= self.chunk_size:
            raise ValueError("CHUNK_OVERLAP must be less than CHUNK_SIZE")

        if not (0.0 <= self.similarity_threshold <= 1.0):
            raise ValueError("SIMILARITY_THRESHOLD must be between 0.0 and 1.0")

        if not (0.0 <= self.temperature <= 1.0):
            raise ValueError("TEMPERATURE must be between 0.0 and 1.0")

        return True


# Global settings instance
settings = Settings()

# Validate on import
settings.validate_settings()


def get_settings() -> Settings:
    """Get application settings"""
    return settings


# Environment detection helpers
def is_development() -> bool:
    """Check if running in development mode"""
    return settings.debug or settings.reload


def is_production() -> bool:
    """Check if running in production mode"""
    return not is_development()


# Logging configuration
def get_log_config() -> dict:
    """Get logging configuration"""
    return {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "default": {
                "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
            },
            "json": {
                "format": "%(asctime)s %(name)s %(levelname)s %(message)s",
                "class": "pythonjsonlogger.jsonlogger.JsonFormatter",
            },
        },
        "handlers": {
            "default": {
                "formatter": "json" if settings.log_format == "json" else "default",
                "class": "logging.StreamHandler",
                "stream": "ext://sys.stdout",
            },
        },
        "root": {
            "level": settings.log_level,
            "handlers": ["default"],
        },
        "loggers": {
            "aviation_rag": {
                "level": settings.log_level,
                "handlers": ["default"],
                "propagate": False,
            },
            "uvicorn": {
                "level": "INFO",
                "handlers": ["default"],
                "propagate": False,
            },
        },
    }


if __name__ == "__main__":
    # Print configuration for debugging
    print("Aviation RAG System Configuration:")
    print(f"  Claude Model: {settings.claude_model}")
    print(f"  MongoDB URI: {settings.mongodb_uri}")
    print(f"  Database: {settings.database_name}")
    print(f"  Collection: {settings.collection_name}")
    print(f"  Embedding Model: {settings.embedding_model}")
    print(f"  Chunk Size: {settings.chunk_size}")
    print(f"  Chunk Overlap: {settings.chunk_overlap}")
    print(f"  API Host: {settings.api_host}:{settings.api_port}")
    print(f"  Debug Mode: {settings.debug}")
    print(f"  Log Level: {settings.log_level}")
    print(f"  Environment: {'Development' if is_development() else 'Production'}")