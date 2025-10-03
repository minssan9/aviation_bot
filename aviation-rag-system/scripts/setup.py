#!/usr/bin/env python3
"""
Setup script for Aviation RAG System
Initializes environment, validates configuration, and sets up dependencies
"""

import os
import sys
import subprocess
import logging
from pathlib import Path
import argparse


def setup_logging():
    """Configure logging for setup script"""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s'
    )
    return logging.getLogger(__name__)


def check_python_version():
    """Check Python version compatibility"""
    if sys.version_info < (3, 11):
        raise SystemError("Python 3.11 or higher is required")
    return True


def check_mongodb_connection(uri):
    """Test MongoDB connection"""
    try:
        from pymongo import MongoClient
        client = MongoClient(uri, serverSelectionTimeoutMS=5000)
        client.admin.command('ismaster')
        client.close()
        return True
    except Exception as e:
        logging.error(f"MongoDB connection failed: {e}")
        return False


def validate_claude_api_key(api_key):
    """Validate Claude API key"""
    if not api_key:
        return False

    try:
        from anthropic import Anthropic
        client = Anthropic(api_key=api_key)
        # Test with minimal request
        response = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1,
            messages=[{"role": "user", "content": "test"}]
        )
        return True
    except Exception as e:
        logging.error(f"Claude API key validation failed: {e}")
        return False


def install_dependencies(requirements_file="requirements.txt"):
    """Install Python dependencies"""
    logger = logging.getLogger(__name__)

    try:
        logger.info("Installing Python dependencies...")
        subprocess.check_call([
            sys.executable, "-m", "pip", "install", "-r", requirements_file
        ])
        logger.info("✅ Dependencies installed successfully")
        return True
    except subprocess.CalledProcessError as e:
        logger.error(f"❌ Failed to install dependencies: {e}")
        return False


def create_directories():
    """Create necessary directories"""
    logger = logging.getLogger(__name__)

    directories = [
        "data/pdfs",
        "data/vectors",
        "logs",
        "tests"
    ]

    for directory in directories:
        path = Path(directory)
        path.mkdir(parents=True, exist_ok=True)
        logger.info(f"Created directory: {directory}")

    return True


def setup_environment():
    """Setup environment configuration"""
    logger = logging.getLogger(__name__)

    env_example = Path(".env.example")
    env_file = Path(".env")

    if not env_file.exists() and env_example.exists():
        logger.info("Creating .env file from template...")
        env_file.write_text(env_example.read_text())
        logger.warning("⚠️  Please edit .env file with your configuration")
        return False
    elif env_file.exists():
        logger.info("✅ .env file already exists")
        return True
    else:
        logger.error("❌ No .env.example file found")
        return False


def validate_configuration():
    """Validate system configuration"""
    logger = logging.getLogger(__name__)

    # Load environment variables
    from dotenv import load_dotenv
    load_dotenv()

    success = True

    # Check Claude API key
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        logger.error("❌ ANTHROPIC_API_KEY not set in .env")
        success = False
    else:
        logger.info("✅ Claude API key found")

    # Check MongoDB URI
    mongodb_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    if check_mongodb_connection(mongodb_uri):
        logger.info("✅ MongoDB connection successful")
    else:
        logger.warning("⚠️  MongoDB connection failed - start MongoDB or update MONGODB_URI")
        success = False

    return success


def run_tests():
    """Run test suite"""
    logger = logging.getLogger(__name__)

    try:
        logger.info("Running test suite...")
        subprocess.check_call([sys.executable, "-m", "pytest", "tests/", "-v"])
        logger.info("✅ All tests passed")
        return True
    except subprocess.CalledProcessError as e:
        logger.error(f"❌ Tests failed: {e}")
        return False


def start_services():
    """Start services using Docker Compose"""
    logger = logging.getLogger(__name__)

    try:
        logger.info("Starting services with Docker Compose...")
        subprocess.check_call(["docker-compose", "up", "-d"])
        logger.info("✅ Services started successfully")
        return True
    except subprocess.CalledProcessError as e:
        logger.error(f"❌ Failed to start services: {e}")
        return False
    except FileNotFoundError:
        logger.warning("⚠️  Docker Compose not found - start MongoDB manually")
        return False


def main():
    """Main setup function"""
    parser = argparse.ArgumentParser(description="Aviation RAG System Setup")
    parser.add_argument("--skip-deps", action="store_true", help="Skip dependency installation")
    parser.add_argument("--skip-tests", action="store_true", help="Skip running tests")
    parser.add_argument("--skip-docker", action="store_true", help="Skip Docker services")
    parser.add_argument("--validate-only", action="store_true", help="Only validate configuration")

    args = parser.parse_args()

    logger = setup_logging()
    logger.info("🚀 Starting Aviation RAG System setup...")

    try:
        # Check Python version
        check_python_version()
        logger.info("✅ Python version check passed")

        # Create directories
        create_directories()

        # Setup environment
        if not setup_environment():
            logger.error("❌ Environment setup incomplete - please edit .env file")
            return 1

        if args.validate_only:
            success = validate_configuration()
            return 0 if success else 1

        # Install dependencies
        if not args.skip_deps:
            if not install_dependencies():
                return 1

        # Validate configuration
        if not validate_configuration():
            logger.error("❌ Configuration validation failed")
            return 1

        # Start Docker services
        if not args.skip_docker:
            start_services()

        # Run tests
        if not args.skip_tests:
            if not run_tests():
                logger.warning("⚠️  Some tests failed - check configuration")

        logger.info("🎉 Aviation RAG System setup completed!")
        logger.info("Next steps:")
        logger.info("  1. Edit .env file with your API keys")
        logger.info("  2. Start the API: python -m uvicorn src.api.main:app --reload")
        logger.info("  3. Visit http://localhost:8000/docs for API documentation")

        return 0

    except Exception as e:
        logger.error(f"❌ Setup failed: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())