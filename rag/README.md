# LangChain Chatbot with DocumentDB and Ollama

A production-ready chatbot implementation using LangChain, MongoDB (DocumentDB), and Ollama for local LLM inference.

## 🚀 Quick Start

1. **Clone and setup**:
   ```bash
   git clone <repository>
   cd langchain-chatbot
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. **Start services**:
   ```bash
   docker-compose up -d
   ```

3. **Install Ollama and download model**:
   ```bash
   curl -fsSL https://ollama.com/install.sh | sh
   ollama pull llama3.2:1b
   ```

4. **Ingest sample data**:
   ```bash
   python ingest_data.py
   ```

5. **Run chatbot**:
   ```bash
   # CLI version
   python cli_chat.py
   
   # API version
   python api.py
   ```

## 📁 Project Structure

```
langchain-chatbot/
├── config.py              # Configuration settings
├── vector_store.py         # MongoDB vector store management
├── chatbot.py             # Core chatbot engine
├── api.py                 # FastAPI REST endpoints
├── cli_chat.py            # Command-line interface
├── ingest_data.py         # Data ingestion script
├── memory.py              # Advanced memory management
├── docker-compose.yml     # Docker services
├── Dockerfile             # Container configuration
├── requirements.txt       # Python dependencies
├── .env.example          # Environment variables template
└── data/                 # Sample documents
    ├── python_basics.txt
    ├── api_guide.txt
    └── database_intro.txt
```

## 🔧 Configuration

Copy `.env.example` to `.env` and modify as needed:

```bash
cp .env.example .env
```

## 🐳 Docker Usage

Run the complete stack with Docker:

```bash
docker-compose up -d
docker exec -it chatbot_ollama ollama pull llama3.2:1b
```

## 📚 API Documentation

Once the API is running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Endpoints

- `POST /chat` - Send a message to the chatbot
- `GET /health` - Health check endpoint

Example request:
```json
{
  "query": "What is Python?"
}
```

## 🧠 Features

- **Local LLM**: Uses Ollama for private, offline inference
- **Vector Storage**: MongoDB for efficient document retrieval
- **Memory**: Conversation history management
- **REST API**: FastAPI for web integration
- **CLI Interface**: Direct command-line interaction
- **Docker Support**: Containerized deployment

## 📖 Tutorial

See `chatbot-tutorial.md` for a comprehensive step-by-step guide.

## 🔍 Troubleshooting

**Common Issues**:

1. **Ollama model not found**:
   ```bash
   ollama pull llama3.2:1b
   ```

2. **MongoDB connection error**:
   ```bash
   docker-compose restart mongodb
   ```

3. **Import errors**:
   ```bash
   pip install -r requirements.txt
   ```

## 🚀 Production Deployment

1. **Environment Setup**:
   - Set production MongoDB URI
   - Configure proper authentication
   - Set up SSL/TLS certificates

2. **Scaling**:
   - Use multiple Ollama instances
   - Implement load balancing
   - Set up MongoDB replica sets

3. **Monitoring**:
   - Add logging and metrics
   - Implement health checks
   - Set up alerting

## 📄 License

MIT License - see LICENSE file for details.