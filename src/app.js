const TelegramBot = require('node-telegram-bot-api');
const config = require('./config');
const AIProviderManager = require('./providers/aiProvider');
const SubscriberManager = require('./features/subscriberManager');
const MessageGenerator = require('./features/messageGenerator');
const CommandHandlers = require('./features/commandHandlers');
const Scheduler = require('./features/scheduler');

class AviationBot {
  constructor() {
    this.config = config.getConfig();
    this.bot = null;
    this.aiProvider = null;
    this.subscriberManager = null;
    this.messageGenerator = null;
    this.commandHandlers = null;
    this.scheduler = null;
  }

  async initialize() {
    try {
      console.log('🤖 항공지식 알림 봇을 초기화하는 중...');
      
      // Initialize Telegram Bot
      this.bot = new TelegramBot(this.config.BOT_TOKEN, { polling: true });
      
      // Initialize AI Provider Manager
      this.aiProvider = new AIProviderManager(this.config);
      
      // Check AI provider availability
      const providerStatus = await this.aiProvider.checkAvailability();
      console.log('🔍 AI Provider 상태:', providerStatus);
      
      // Initialize other components
      this.subscriberManager = new SubscriberManager();
      this.messageGenerator = new MessageGenerator(this.aiProvider);
      this.commandHandlers = new CommandHandlers(
        this.bot, 
        this.subscriberManager, 
        this.messageGenerator
      );
      this.scheduler = new Scheduler(
        this.bot,
        this.subscriberManager,
        this.messageGenerator
      );
      
      console.log('✅ 모든 모듈이 성공적으로 초기화되었습니다');
      
    } catch (error) {
      console.error('❌ 초기화 중 오류 발생:', error);
      process.exit(1);
    }
  }

  start() {
    console.log('🚀 봇 시작 중...');
    
    // Start scheduler
    this.scheduler.start();
    
    console.log('🤖 항공지식 알림 봇이 시작되었습니다!');
    console.log('📅 스케줄: 오전 9시, 오후 2시, 저녁 8시 (KST)');
    console.log(`🎯 활성 AI 제공자: ${this.aiProvider.getActiveProviders().join(', ')}`);
  }

  async stop() {
    console.log('⏹️ 봇 중지 중...');
    
    if (this.scheduler) {
      this.scheduler.stop();
    }
    
    if (this.bot) {
      await this.bot.stopPolling();
    }
    
    console.log('✅ 봇이 정상적으로 중지되었습니다');
  }
}

// Error handling
process.on('unhandledRejection', (error) => {
  console.error('처리되지 않은 Promise 거부:', error);
});

process.on('SIGINT', async () => {
  console.log('\n🔄 종료 신호를 받았습니다...');
  if (global.aviationBot) {
    await global.aviationBot.stop();
  }
  process.exit(0);
});

// Start the bot
async function main() {
  const aviationBot = new AviationBot();
  global.aviationBot = aviationBot;
  
  await aviationBot.initialize();
  aviationBot.start();
}

main().catch(console.error);

module.exports = AviationBot;