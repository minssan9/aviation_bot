# Aviation RAG System

A production-ready Retrieval-Augmented Generation (RAG) system specifically designed for aviation knowledge management. The system processes PDF documents, stores them as vector embeddings, and provides intelligent question-answering using Claude AI with retrieved context.

## 🏗️ Architecture

```
PDF Documents → Text Extraction → Chunking → Vector Embeddings → MongoDB Storage
                                                                        ↓
User Query → Vector Search → Context Retrieval → Claude API → Enhanced Response
```

## 🚀 Features

- **PDF Processing**: Intelligent text extraction and semantic chunking
- **Vector Storage**: MongoDB-based vector storage with similarity search
- **Claude Integration**: Anthropic Claude API with context-aware responses
- **REST API**: FastAPI-based web service with async support
- **Bilingual Support**: Korean and English query processing
- **Production Ready**: Docker containerization, health checks, monitoring

## 📁 Project Structure

```
aviation-rag-system/
├── src/
│   ├── rag_system/
│   │   ├── pdf_processor.py      # PDF text extraction and chunking
│   │   ├── vector_store.py       # MongoDB vector storage
│   │   └── claude_client.py      # Claude API integration
│   └── api/
│       └── main.py              # FastAPI REST endpoints
├── config/
│   └── settings.py              # Configuration management
├── tests/                       # Test suite
├── data/
│   ├── pdfs/                   # PDF storage
│   └── vectors/                # Vector cache
├── scripts/
│   └── init-mongo.js           # MongoDB initialization
├── docker-compose.yml          # Container orchestration
├── Dockerfile                  # Container configuration
├── requirements.txt            # Python dependencies
└── .env.example               # Environment template
```

## 🔧 Quick Start

### Prerequisites

- Python 3.11+
- MongoDB 7.0+
- Anthropic Claude API key

### Local Development

1. **Clone and setup**:
   ```bash
   git clone <repository>
   cd aviation-rag-system
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your API keys and settings
   ```

3. **Start MongoDB**:
   ```bash
   # Option 1: Local MongoDB
   mongod --dbpath ./data/mongodb

   # Option 2: Docker
   docker run -d -p 27017:27017 --name mongodb mongo:7.0
   ```

4. **Initialize database**:
   ```bash
   mongosh < scripts/init-mongo.js
   ```

5. **Run the API**:
   ```bash
   python -m uvicorn src.api.main:app --reload --host 0.0.0.0 --port 8000
   ```

### Docker Deployment

1. **Start all services**:
   ```bash
   docker-compose up -d
   ```

2. **Check health**:
   ```bash
   curl http://localhost:8000/health
   ```

## 🌐 API Endpoints

### Base URL: `http://localhost:8000`

#### Health Check
```
GET /health
```

#### Upload PDF
```
POST /upload-pdf
Content-Type: multipart/form-data

file: [PDF file]
```

#### Chat with RAG
```
POST /chat
Content-Type: application/json

{
  "query": "항공기 시스템에 대해 설명해주세요",
  "k": 5,
  "similarity_threshold": 0.3,
  "max_tokens": 2000
}
```

#### Search Documents
```
POST /search
Content-Type: application/json

{
  "query": "aircraft systems",
  "k": 10,
  "threshold": 0.1
}
```

#### List Documents
```
GET /documents
```

#### Delete Document
```
DELETE /documents/{document_id}
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ANTHROPIC_API_KEY` | Claude API key | Required |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017` |
| `DATABASE_NAME` | Database name | `aviation_rag` |
| `EMBEDDING_MODEL` | Sentence transformer model | `all-MiniLM-L6-v2` |
| `CHUNK_SIZE` | Text chunk size | `512` |
| `CHUNK_OVERLAP` | Chunk overlap size | `50` |
| `API_PORT` | API server port | `8000` |
| `LOG_LEVEL` | Logging level | `INFO` |

### Model Configuration

```python
# PDF Processing
CHUNK_SIZE = 512           # Tokens per chunk
CHUNK_OVERLAP = 50         # Overlap between chunks

# Vector Search
SIMILARITY_THRESHOLD = 0.3 # Minimum similarity score
DEFAULT_K = 5              # Number of context chunks

# Claude API
CLAUDE_MODEL = "claude-3-5-sonnet-20241022"
MAX_TOKENS = 2000         # Maximum response tokens
TEMPERATURE = 0.1         # Response creativity (0.0-1.0)
```

## 📊 Usage Examples

### Python Client

```python
import requests

# Upload PDF
with open("aviation_manual.pdf", "rb") as f:
    response = requests.post(
        "http://localhost:8000/upload-pdf",
        files={"file": f}
    )
    print(response.json())

# Ask question
response = requests.post(
    "http://localhost:8000/chat",
    json={
        "query": "What are the main aircraft control systems?",
        "k": 5
    }
)
print(response.json()["response"])
```

### cURL Examples

```bash
# Upload PDF
curl -X POST "http://localhost:8000/upload-pdf" \
     -H "Content-Type: multipart/form-data" \
     -F "file=@aviation_manual.pdf"

# Chat query
curl -X POST "http://localhost:8000/chat" \
     -H "Content-Type: application/json" \
     -d '{
       "query": "항공기 엔진 시스템의 작동 원리는?",
       "k": 3,
       "similarity_threshold": 0.3
     }'

# Search documents
curl -X POST "http://localhost:8000/search" \
     -H "Content-Type: application/json" \
     -d '{
       "query": "hydraulic system",
       "k": 10
     }'
```

## 🧪 Testing

```bash
# Install test dependencies
pip install pytest pytest-asyncio pytest-cov

# Run tests
pytest tests/

# Run with coverage
pytest --cov=src tests/

# Run specific test
pytest tests/test_pdf_processor.py -v
```

## 🔍 Monitoring

### Health Checks

The system provides comprehensive health monitoring:

```bash
# Basic health check
curl http://localhost:8000/health

# Detailed status
curl http://localhost:8000/health | jq .
```

### Logs

```bash
# View API logs
docker-compose logs -f aviation_rag_api

# View MongoDB logs
docker-compose logs -f mongodb

# Application logs location
tail -f logs/aviation_rag.log
```

### Metrics

- Response time tracking
- Token usage monitoring
- Vector search performance
- Database connection health

## 🚀 Production Deployment

### Performance Tuning

```yaml
# docker-compose.prod.yml
services:
  aviation_rag_api:
    environment:
      API_WORKERS: 4
      MAX_CONCURRENT_REQUESTS: 20
      VECTOR_SEARCH_CACHE_SIZE: 5000
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 2G
          cpus: '1.0'
```

### Security

- Use environment variables for secrets
- Enable MongoDB authentication
- Set up SSL/TLS certificates
- Configure CORS appropriately
- Implement rate limiting

### Scaling

- Horizontal API scaling with load balancer
- MongoDB replica sets for high availability
- Redis caching for frequently accessed data
- CDN for static content

## 🤝 Integration with Aviation Bot

This RAG system can be integrated with the existing Node.js aviation bot:

```javascript
// Node.js integration
const axios = require('axios');

class RAGService {
  constructor(ragApiUrl = 'http://localhost:8000') {
    this.apiUrl = ragApiUrl;
  }

  async queryRAG(userQuestion) {
    try {
      const response = await axios.post(`${this.apiUrl}/chat`, {
        query: userQuestion,
        k: 3,
        similarity_threshold: 0.3
      });

      return {
        answer: response.data.response,
        sources: response.data.sources,
        usage: response.data.usage
      };
    } catch (error) {
      console.error('RAG query failed:', error);
      throw error;
    }
  }
}

// Usage in aviation bot
const ragService = new RAGService();
const answer = await ragService.queryRAG(userMessage);
```

## 📝 License

MIT License - see LICENSE file for details.

## 🆘 Troubleshooting

### Common Issues

1. **MongoDB connection failed**:
   ```bash
   # Check MongoDB status
   docker-compose ps mongodb

   # Restart MongoDB
   docker-compose restart mongodb
   ```

2. **Claude API errors**:
   ```bash
   # Verify API key
   curl -H "x-api-key: $ANTHROPIC_API_KEY" https://api.anthropic.com/v1/messages
   ```

3. **PDF processing errors**:
   ```bash
   # Check PDF file permissions
   ls -la data/pdfs/

   # Test PDF manually
   python -c "from src.rag_system.pdf_processor import PDFProcessor; print(PDFProcessor().extract_text('test.pdf'))"
   ```

4. **Memory issues**:
   ```bash
   # Increase Docker memory limits
   # Reduce embedding batch size in config
   ```

### Debug Mode

Enable debug logging:

```bash
export DEBUG=true
export LOG_LEVEL=DEBUG
python -m uvicorn src.api.main:app --reload
```

## 📞 Support

For issues and questions:
- Check the troubleshooting guide above
- Review logs for specific error messages
- Open an issue with detailed error information
- Include environment configuration (without secrets)