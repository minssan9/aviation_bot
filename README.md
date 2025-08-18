# Aviation Knowledge Telegram Bot

Enterprise-grade Telegram bot delivering structured aviation knowledge with AI-powered content generation, multi-database persistence, and comprehensive scheduling automation.

## 🏗️ Architecture Overview

### Core Design Principles
- **Feature-Based Architecture**: Domain-driven module organization
- **Multi-Provider AI Integration**: Anthropic Claude & Google Gemini
- **Database Agnostic**: MySQL & SQLite dual support
- **Microservice-Ready**: Modular, loosely-coupled components
- **Production Hardened**: Error handling, logging, health monitoring

### Technology Stack
```
Runtime:     Node.js 18+ | TypeScript-ready
Framework:   Express.js | Telegram Bot API
AI:          Anthropic Claude-3.5 | Google Gemini Pro
Database:    MySQL 8+ | SQLite 3
Scheduling:  node-cron | moment-timezone (KST)
DevOps:      Docker | docker-compose | nodemon
```

## 🎯 Business Features

### Daily Knowledge Distribution
- **Automated Scheduling**: 3x daily (09:00, 14:00, 20:00 KST)
- **Content Curation**: 7-day rotating aviation curriculum
- **AI Generation**: Dynamic quiz creation with explanations
- **Subscriber Management**: Persistent user state & preferences

### Learning Curriculum (Weekly Rotation)
| Day | Domain | Topics |
|-----|--------|---------|
| Mon | 항공역학 | Lift, Drag, Performance Calculations |
| Tue | 항법 | VOR, GPS, Dead Reckoning |
| Wed | 기상학 | Weather Patterns, METAR/TAF |
| Thu | 항공기 시스템 | Engine, Hydraulics, Avionics |
| Fri | 비행 규정 | ICAO Standards, ATC Procedures |
| Sat | 비행 계획 | Flight Planning, Performance |
| Sun | 응급상황 | Emergency Procedures, Safety |

### Interactive Commands
```bash
/start    # User onboarding & subscription
/stop     # Graceful unsubscribe
/status   # Current topic & user state  
/now      # On-demand knowledge delivery
/quiz     # Interactive quiz generation
/weather  # Aviation weather integration
```

## 🏛️ System Architecture

```
src/
├── features/                    # Domain-Driven Design
│   ├── aviation-knowledge/      # Core domain logic
│   │   ├── aviationKnowledgeService.js    # Knowledge management
│   │   └── topicService.js                # Topic rotation logic
│   ├── bot-interface/          # Telegram integration layer
│   │   ├── botController.js               # Main bot orchestration
│   │   └── commandHandlers.js             # Command processing
│   ├── message-generation/     # AI content pipeline
│   │   ├── messageGenerator.js            # Content orchestration
│   │   └── aiProviders/                   # Multi-provider AI
│   │       ├── aiProvider.js              # Provider management
│   │       ├── anthropic.js               # Claude integration
│   │       └── gemini.js                  # Gemini integration
│   ├── quiz-system/           # Interactive learning
│   │   ├── quizService.js                 # SQLite quiz engine
│   │   └── mysqlQuizService.js            # MySQL quiz engine
│   ├── scheduling/            # Time-based automation
│   │   └── scheduler.js                   # Cron job management
│   ├── user-management/       # User lifecycle
│   │   ├── userService.js                 # User persistence
│   │   └── subscriberManager.js           # Subscription logic
│   └── weather/              # External integrations
│       └── simpleWeatherService.js        # KMA weather API
├── shared/                    # Cross-cutting concerns
│   ├── config/               # Environment management
│   │   └── index.js                      # Config validation
│   ├── database/             # Data access layer
│   │   ├── database.js                   # SQLite implementation
│   │   └── mysqlDatabase.js              # MySQL implementation
│   └── utils/                # Shared utilities
├── admin/                    # Management interface
│   └── adminServer.js                    # Express admin panel
├── migrations/              # Database versioning
│   ├── 001_create_users_table.sql
│   ├── 002_create_quizzes_table.sql
│   ├── 003_create_message_logs_table.sql
│   ├── 004_create_system_stats_table.sql
│   ├── 005_create_topics_table.sql
│   └── 006_insert_initial_topics_data.sql
├── data/                   # Application data
└── app.js                 # Application bootstrap
```

## 🔧 Technical Implementation

### Configuration Management
```javascript
// Environment-based configuration with validation
class Config {
  constructor() {
    this.BOT_TOKEN = process.env.BOT_TOKEN;           // Telegram bot token
    this.GEMINI_API_KEY = process.env.GEMINI_API_KEY; // Google AI
    this.CLAUDE_API_KEY = process.env.CLAUDE_API_KEY; // Anthropic AI
    // MySQL configuration
    this.DB_HOST = process.env.DB_HOST || 'localhost';
    this.DB_CONNECTION_LIMIT = parseInt(process.env.DB_CONNECTION_LIMIT) || 10;
    // Validation & environment detection
    this.NODE_ENV = process.env.NODE_ENV || 'development';
  }
}
```

### Database Strategy
```javascript
// Dual database support with abstraction layer
class DatabaseAbstraction {
  constructor(type) {
    this.implementation = type === 'mysql' 
      ? new MySQLDatabase() 
      : new SQLiteDatabase();
  }
  
  // Unified interface across implementations
  async initialize() { return this.implementation.initialize(); }
  async query(sql, params) { return this.implementation.query(sql, params); }
}
```

### AI Provider Management
```javascript
// Multi-provider AI with failover
class AIProviderManager {
  constructor() {
    this.providers = [
      new GeminiProvider(config.GEMINI_API_KEY),     // Primary
      new AnthropicProvider(config.CLAUDE_API_KEY)   // Fallback
    ];
  }
  
  async generateQuiz(topic) {
    for (const provider of this.providers) {
      try {
        return await provider.generateContent(topic);
      } catch (error) {
        console.warn(`Provider failed: ${provider.name}, trying next...`);
      }
    }
  }
}
```

### Scheduling Architecture
```javascript
// Timezone-aware scheduling with error recovery
class Scheduler {
  constructor() {
    this.timezone = 'Asia/Seoul';
    this.schedules = [
      { time: '00 09 * * *', slot: 'morning' },   // 09:00 KST
      { time: '00 14 * * *', slot: 'afternoon' }, // 14:00 KST
      { time: '00 20 * * *', slot: 'evening' }    // 20:00 KST
    ];
  }
}
```

## 🚀 Development Workflow

### Environment Setup
```bash
# Clone & dependencies
git clone <repository>
cd aviation-bot
npm install

# Environment configuration
cp .env.example .env
# Configure: BOT_TOKEN, GEMINI_API_KEY, CLAUDE_API_KEY, DB_*

# Development server
npm run dev          # Hot reload with nodemon
npm start           # Production mode
npm run legacy      # Legacy compatibility mode
```

### Docker Deployment
```bash
# Development environment
docker-compose up -d

# Production build
npm run docker:build
docker run -d --env-file .env aviation-bot:latest

# Container management
npm run compose:up    # Start services
npm run compose:down  # Stop services
```

### Database Management
```sql
-- Migration execution (automatic on startup)
-- MySQL: Requires manual database creation
CREATE DATABASE aviation_bot CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- SQLite: Automatic file creation in data/aviation_bot.db
-- Migrations run automatically via mysqlDatabase.js initialization
```

## 📊 Operational Monitoring

### Health Check Endpoints
```
GET /health          # Application health status
GET /admin          # Administrative interface
GET /admin/stats    # Usage statistics & metrics
POST /admin/backup  # Database backup creation
```

### Logging Strategy
```javascript
// Structured logging with correlation IDs
console.log('✅ Database initialized successfully');
console.error('❌ AI Provider failed:', error.message);
console.warn('⚠️ Subscriber limit approaching:', count);
```

### Error Handling Pattern
```javascript
// Graceful degradation with fallbacks
try {
  return await aiProvider.generateContent(topic);
} catch (error) {
  console.error('AI generation failed:', error);
  return fallbackContent[topic] || defaultMessage;
}
```

## 🔒 Production Considerations

### Security
- Environment variable validation
- Database connection encryption
- Rate limiting on bot commands
- Input sanitization for AI prompts

### Performance
- Connection pooling (MySQL: 10 concurrent)
- Content caching for repeated requests
- Async/await throughout for non-blocking I/O
- Batch processing for bulk operations

### Reliability
- Multi-provider AI failover
- Database connection retry logic
- Graceful shutdown handling
- Health monitoring endpoints

### Scalability
- Stateless application design
- Database abstraction for horizontal scaling  
- Feature-based architecture for team scaling
- Docker containerization for deployment scaling

## 🧪 Testing Strategy

```bash
# Unit tests (recommended additions)
npm test                    # Run test suite
npm run test:watch         # Watch mode
npm run test:coverage      # Coverage reports

# Integration testing
npm run test:integration   # Database & API tests
npm run test:e2e          # End-to-end bot testing
```

## 📈 Roadmap & Extensions

### Immediate Enhancements
- [ ] TypeScript migration for type safety
- [ ] Comprehensive test coverage (Jest)
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Redis caching layer
- [ ] Prometheus metrics integration

### Advanced Features
- [ ] Multi-language support (i18n)
- [ ] User progress tracking & analytics
- [ ] Advanced quiz difficulty adaptation
- [ ] Integration with aviation APIs (FlightAware, etc.)
- [ ] Voice message support
- [ ] Web dashboard for content management

---

**Architecture Version**: 2.0.0 | **Node.js**: 18+ | **Maintainers**: Senior Development Team