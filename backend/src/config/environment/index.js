require('dotenv').config();

class Config {
  constructor() {
    // Telegram Bot
    this.TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    
    // AI Providers
    this.GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    this.CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
    
    // Database Configuration
    this.DB_HOST = process.env.DB_HOST || 'localhost';
    this.DB_PORT = parseInt(process.env.DB_PORT) || 3306;
    this.DB_USER = process.env.DB_USER || 'root';
    this.DB_PASSWORD = process.env.DB_PASSWORD || 'admin';
    this.DB_NAME = process.env.DB_NAME || 'voyagerss';
    
    // Database Options - MySQL2 compatible
    this.DB_CONNECTION_LIMIT = parseInt(process.env.DB_CONNECTION_LIMIT) || 10;
    this.DB_ACQUIRE_TIMEOUT_MILLIS = parseInt(process.env.DB_ACQUIRE_TIMEOUT_MILLIS) || 60000;
    this.DB_CONNECT_TIMEOUT = parseInt(process.env.DB_CONNECT_TIMEOUT) || 60000;
    
    // Environment
    this.NODE_ENV = process.env.NODE_ENV || 'development';
    
    // Base Path
    this.BASE_PATH = process.env.BASE_PATH || '/Volumes/SSD-NVMe-2';
    
    this.validate();
  }

  validate() {
    // Bot Token validation
    if (!this.TELEGRAM_BOT_TOKEN) {
      console.error('❌ TELEGRAM_BOT_TOKEN is required in .env file');
      process.exit(1);
    }

    // AI Provider validation
    if (!this.GEMINI_API_KEY && !this.CLAUDE_API_KEY) {
      console.error('❌ At least one AI provider key required (GEMINI_API_KEY or CLAUDE_API_KEY)');
      process.exit(1);
    }

    // Database validation
    if (!this.DB_PASSWORD && this.NODE_ENV === 'production') {
      console.warn('⚠️ DB_PASSWORD not set - this may cause connection issues in production');
    }

    // Log configuration
    const providers = [];
    if (this.GEMINI_API_KEY) providers.push('Google AI Studio (Gemini)');
    if (this.CLAUDE_API_KEY) providers.push('Anthropic');
    
    console.log(`🔑 AI Providers: ${providers.join(', ')}`);
    console.log(`🗄️ Database: ${this.DB_HOST}:${this.DB_PORT}/${this.DB_NAME}`);
  }

  getConfig() {
    return {
      // Bot Configuration
      TELEGRAM_BOT_TOKEN: this.TELEGRAM_BOT_TOKEN,
      
      // AI Provider Keys
      GEMINI_API_KEY: this.GEMINI_API_KEY,
      CLAUDE_API_KEY: this.CLAUDE_API_KEY,
      
      // Database Configuration
      DB_HOST: this.DB_HOST,
      DB_PORT: this.DB_PORT,
      DB_USER: this.DB_USER,
      DB_PASSWORD: this.DB_PASSWORD,
      DB_NAME: this.DB_NAME,
      
      // Database Options - MySQL2 compatible
      dbOptions: {
        connectionLimit: this.DB_CONNECTION_LIMIT,
        acquireTimeoutMillis: this.DB_ACQUIRE_TIMEOUT_MILLIS,
        connectTimeout: this.DB_CONNECT_TIMEOUT
      },
      
      // Environment
      NODE_ENV: this.NODE_ENV,
      
      // Base Path
      BASE_PATH: this.BASE_PATH
    };
  }
}

module.exports = new Config();