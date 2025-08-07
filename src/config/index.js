require('dotenv').config();

class Config {
  constructor() {
    this.BOT_TOKEN = process.env.BOT_TOKEN;
    this.GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    this.CLAUDE_API_KEY = process.env.CLAUDE_API_KEY; // Fallback
    
    this.validate();
  }

  validate() {
    if (!this.BOT_TOKEN) {
      console.error('❌ BOT_TOKEN is not set in .env file');
      process.exit(1);
    }

    if (!this.GEMINI_API_KEY && !this.CLAUDE_API_KEY) {
      console.error('❌ Either GEMINI_API_KEY or CLAUDE_API_KEY must be set in .env file');
      process.exit(1);
    }

    // Log available providers
    const providers = [];
    if (this.GEMINI_API_KEY) providers.push('Gemini');
    if (this.CLAUDE_API_KEY) providers.push('Anthropic');
    
    console.log(`🔑 Available AI providers: ${providers.join(', ')}`);
  }

  getConfig() {
    return {
      BOT_TOKEN: this.BOT_TOKEN,
      GEMINI_API_KEY: this.GEMINI_API_KEY,
      CLAUDE_API_KEY: this.CLAUDE_API_KEY
    };
  }
}

module.exports = new Config();