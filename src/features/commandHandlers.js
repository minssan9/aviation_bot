const moment = require('moment-timezone');
const { AviationKnowledgeManager } = require('../data/aviationKnowledge');

class CommandHandlers {
  constructor(bot, subscriberManager, messageGenerator) {
    this.bot = bot;
    this.subscriberManager = subscriberManager;
    this.messageGenerator = messageGenerator;
    this.setupHandlers();
  }

  setupHandlers() {
    // /start 명령어
    this.bot.onText(/\/start/, (msg) => {
      const chatId = msg.chat.id;
      this.subscriberManager.subscribe(chatId);
      
      const welcomeMessage = this.messageGenerator.getWelcomeMessage();
      this.bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
    });

    // /stop 명령어
    this.bot.onText(/\/stop/, (msg) => {
      const chatId = msg.chat.id;
      this.subscriberManager.unsubscribe(chatId);
      this.bot.sendMessage(chatId, '✅ 알림이 중지되었습니다. /start 명령어로 다시 시작할 수 있습니다.');
    });

    // /status 명령어
    this.bot.onText(/\/status/, (msg) => {
      const chatId = msg.chat.id;
      const isSubscribed = this.subscriberManager.isSubscribed(chatId);
      const subscriberCount = this.subscriberManager.getSubscriberCount();
      
      const statusMessage = this.messageGenerator.getStatusMessage(isSubscribed, subscriberCount);
      this.bot.sendMessage(chatId, statusMessage, { parse_mode: 'Markdown' });
    });

    // /now 명령어
    this.bot.onText(/\/now/, async (msg) => {
      const chatId = msg.chat.id;
      const now = moment().tz('Asia/Seoul');
      const hour = now.hour();
      
      let timeSlot;
      if (hour < 13) timeSlot = 'morning';
      else if (hour < 19) timeSlot = 'afternoon';
      else timeSlot = 'evening';
      
      try {
        const message = await this.messageGenerator.generateMessage(timeSlot);
        this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      } catch (error) {
        console.error('메시지 생성 오류:', error);
        this.bot.sendMessage(chatId, '⚠️ 메시지 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
      }
    });

    // /quiz 명령어
    this.bot.onText(/\/quiz( (.+))?/, async (msg, match) => {
      const chatId = msg.chat.id;
      const customTopic = match && match[2] ? match[2].trim() : null;
      
      try {
        let topic, knowledgeArea;
        
        if (customTopic) {
          // 사용자가 특정 주제 요청
          topic = "맞춤 주제";
          knowledgeArea = customTopic;
        } else {
          // 오늘의 주제에서 랜덤 선택
          const now = moment().tz('Asia/Seoul');
          const dayOfWeek = now.day();
          const todayKnowledge = AviationKnowledgeManager.getKnowledgeByDay(dayOfWeek);
          topic = todayKnowledge.topic;
          knowledgeArea = AviationKnowledgeManager.getRandomSubject(dayOfWeek);
        }
        
        this.bot.sendMessage(chatId, '🤖 AI가 문제를 생성하고 있습니다... 잠시만 기다려 주세요!');
        
        const quizMessage = await this.messageGenerator.generateCustomQuiz(topic, knowledgeArea);
        this.bot.sendMessage(chatId, quizMessage, { parse_mode: 'Markdown' });
        
      } catch (error) {
        console.error('퀴즈 생성 오류:', error);
        this.bot.sendMessage(chatId, '⚠️ 퀴즈 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
      }
    });

    // Error handling
    this.bot.on('error', (error) => {
      console.error('봇 에러:', error);
    });
  }
}

module.exports = CommandHandlers;