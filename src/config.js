const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

function getConfig() {
  return {
    // Bot Configuration
    BOT_TOKEN: process.env.BOT_TOKEN,
    
    // AI Provider Configuration
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    CLAUDE_API_KEY: process.env.CLAUDE_API_KEY,
    
    // Instagram Configuration
    INSTAGRAM_ACCESS_TOKEN: process.env.INSTAGRAM_ACCESS_TOKEN,
    INSTAGRAM_PAGE_ID: process.env.INSTAGRAM_PAGE_ID,
    
    // Database Configuration
    DB_HOST: process.env.DB_HOST || 'local.voyagerss.com',
    DB_PORT: process.env.DB_PORT || 43306,
    DB_USER: process.env.DB_USER || 'voyagerss',
    DB_PASSWORD: process.env.DB_PASSWORD,
    DB_NAME: process.env.DB_NAME || 'voyagerss',
    
    // Environment
    NODE_ENV: process.env.NODE_ENV || 'development',
    
    // Logging
    LOG_LEVEL: process.env.LOG_LEVEL || 'info'
  };
}

// Validate required environment variables
function validateConfig() {
  const config = getConfig();
  const required = ['BOT_TOKEN'];
  const missing = required.filter(key => !config[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  // Check AI providers
  if (!config.GEMINI_API_KEY && !config.CLAUDE_API_KEY) {
    console.warn('⚠️ No AI provider API keys found. Some features may not work.');
  }
  
  // Check Instagram configuration
  if (!config.INSTAGRAM_ACCESS_TOKEN || !config.INSTAGRAM_PAGE_ID) {
    console.warn('⚠️ Instagram configuration missing. Reels automation will not work.');
  }
  
  return config;
}

module.exports = {
  getConfig: validateConfig
};