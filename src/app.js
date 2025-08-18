const TelegramBot = require('node-telegram-bot-api');
const config = require('./shared/config');
const AIProviderManager = require('./features/message-generation/aiProviders/aiProvider');
const UserService = require('./features/user-management/userService');
const TopicService = require('./features/aviation-knowledge/topicService');
const { AviationKnowledgeService, AviationKnowledgeManager } = require('./features/aviation-knowledge/aviationKnowledgeService');
const MessageGenerator = require('./features/message-generation/messageGenerator');
const CommandHandlers = require('./features/bot-interface/commandHandlers');
const Scheduler = require('./features/scheduling/scheduler');
const AdminServer = require('./admin/adminServer');

class AviationBot {
  constructor() {
    this.config = config.getConfig();
    this.bot = null;
    this.aiProvider = null;
    this.userService = null;
    this.topicService = null;
    this.aviationKnowledgeService = null;
    this.messageGenerator = null;
    this.commandHandlers = null;
    this.scheduler = null;
    this.adminServer = null;
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
      
      // Initialize AI Provider database
      await this.aiProvider.initialize();

      // Initialize User Service with MySQL
      this.userService = new UserService(this.config);
      await this.userService.initialize();
      
      // Get database instance from user service
      const database = this.userService.getDatabase();
      
      // Initialize Topic and Aviation Knowledge services
      this.topicService = new TopicService(database);
      this.aviationKnowledgeService = new AviationKnowledgeService(database, this.topicService);
      
      // Set global instance for backward compatibility
      AviationKnowledgeManager.setInstance(this.aviationKnowledgeService);
      
      console.log('✅ Database-driven aviation knowledge system initialized');

      // Initialize other components with aviation knowledge service
      this.messageGenerator = new MessageGenerator(this.aiProvider, this.aviationKnowledgeService);
      this.scheduler = new Scheduler(
        this.bot,
        this.userService,
        this.messageGenerator
      );
      this.commandHandlers = new CommandHandlers(
        this.bot, 
        this.userService, 
        this.messageGenerator,
        this.aiProvider,
        this.scheduler
      );

      // Initialize Admin Server with database
      this.adminServer = new AdminServer(database);
      
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
    
    // Start admin server
    this.adminServer.start();
    
    console.log('🤖 항공지식 알림 봇이 시작되었습니다!');
    console.log('📅 스케줄: 오전 9시, 오후 2시, 저녁 8시 (KST)');
    console.log(`🎯 활성 AI 제공자: ${this.aiProvider.getActiveProviders().join(', ')}`);
    console.log('🌐 어드민 페이지: http://localhost:3000');
    
    // Log aviation knowledge stats
    this._logAviationKnowledgeStats();
  }

  async stop() {
    console.log('⏹️ 봇 중지 중...');
    
    if (this.scheduler) {
      this.scheduler.stop();
    }
    
    if (this.adminServer) {
      this.adminServer.stop();
    }

    if (this.aiProvider) {
      await this.aiProvider.close();
    }

    if (this.userService) {
      await this.userService.close();
    }
    
    if (this.bot) {
      await this.bot.stopPolling();
    }
    
    console.log('✅ 봇이 정상적으로 중지되었습니다');
  }
  
  async _logAviationKnowledgeStats() {
    try {
      const stats = await this.aviationKnowledgeService.getStats();
      console.log(`📊 항공지식 DB 통계: ${stats.totalTopics}개 토픽, ${stats.totalSubjects}개 주제`);
      console.log(`📈 토픽당 평균 주제 수: ${stats.averageSubjectsPerTopic}개`);
      
      if (stats.subjectsByDifficulty) {
        const difficultyStats = Object.entries(stats.subjectsByDifficulty)
          .map(([level, count]) => `${level}: ${count}개`)
          .join(', ');
        console.log(`🎯 난이도별 분포: ${difficultyStats}`);
      }
    } catch (error) {
      console.warn('⚠️ 항공지식 통계 조회 실패:', error.message);
    }
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