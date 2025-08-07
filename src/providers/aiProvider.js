const GeminiProvider = require('./gemini');
const AnthropicProvider = require('./anthropic');

class AIProviderManager {
  constructor(config) {
    this.providers = [];
    
    // Primary: Gemini
    if (config.GEMINI_API_KEY) {
      this.providers.push({
        name: 'gemini',
        instance: new GeminiProvider(config.GEMINI_API_KEY),
        priority: 1
      });
    }
    
    // Fallback: Anthropic
    if (config.CLAUDE_API_KEY) {
      this.providers.push({
        name: 'anthropic',
        instance: new AnthropicProvider(config.CLAUDE_API_KEY),
        priority: 2
      });
    }
    
    // Sort by priority
    this.providers.sort((a, b) => a.priority - b.priority);
    
    if (this.providers.length === 0) {
      throw new Error('No AI providers available. Please configure GEMINI_API_KEY or CLAUDE_API_KEY.');
    }
  }

  async generateQuiz(topic, knowledgeArea) {
    let lastError;
    
    for (const provider of this.providers) {
      try {
        console.log(`🤖 Using ${provider.name} provider for quiz generation...`);
        const result = await provider.instance.generateQuiz(topic, knowledgeArea);
        console.log(`✅ Successfully generated quiz using ${provider.name}`);
        return result;
      } catch (error) {
        console.warn(`⚠️ ${provider.name} provider failed:`, error.message);
        lastError = error;
        continue;
      }
    }
    
    console.error('❌ All AI providers failed');
    throw lastError || new Error('All AI providers unavailable');
  }

  async checkAvailability() {
    const status = {};
    
    for (const provider of this.providers) {
      try {
        status[provider.name] = await provider.instance.isAvailable();
      } catch (error) {
        status[provider.name] = false;
      }
    }
    
    return status;
  }

  getActiveProviders() {
    return this.providers.map(p => p.name);
  }
}

module.exports = AIProviderManager;