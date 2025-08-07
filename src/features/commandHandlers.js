const moment = require('moment-timezone');
const { AviationKnowledgeManager } = require('../data/aviationKnowledge');

class CommandHandlers {
  constructor(bot, userService, messageGenerator, aiProvider = null) {
    this.bot = bot;
    this.userService = userService;
    this.messageGenerator = messageGenerator;
    this.aiProvider = aiProvider;
    this.setupHandlers();
  }

  setupHandlers() {
    // /start 명령어
    this.bot.onText(/\/start/, async (msg) => {
      const chatId = msg.chat.id;
      const telegramData = {
        username: msg.from?.username,
        first_name: msg.from?.first_name,
        last_name: msg.from?.last_name,
        language_code: msg.from?.language_code
      };
      
      try {
        await this.userService.subscribe(chatId, telegramData);
        const welcomeMessage = this.messageGenerator.getWelcomeMessage();
        const sentMessage = await this.bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
        
        // 메시지 로그
        await this.userService.logMessage(chatId, 'custom', {
          contentPreview: welcomeMessage.substring(0, 200),
          telegramMessageId: sentMessage.message_id,
          status: 'sent'
        });
      } catch (error) {
        console.error('Start command error:', error);
        this.bot.sendMessage(chatId, '⚠️ 서비스 초기화 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
      }
    });

    // /stop 명령어
    this.bot.onText(/\/stop/, async (msg) => {
      const chatId = msg.chat.id;
      try {
        await this.userService.unsubscribe(chatId);
        this.bot.sendMessage(chatId, '✅ 알림이 중지되었습니다. /start 명령어로 다시 시작할 수 있습니다.');
      } catch (error) {
        console.error('Stop command error:', error);
        this.bot.sendMessage(chatId, '⚠️ 구독 해제 중 오류가 발생했습니다.');
      }
    });

    // /status 명령어
    this.bot.onText(/\/status/, async (msg) => {
      const chatId = msg.chat.id;
      try {
        const isSubscribed = await this.userService.isSubscribed(chatId);
        const subscriberCount = await this.userService.getSubscriberCount();
        
        const statusMessage = this.messageGenerator.getStatusMessage(isSubscribed, subscriberCount);
        this.bot.sendMessage(chatId, statusMessage, { parse_mode: 'Markdown' });
      } catch (error) {
        console.error('Status command error:', error);
        this.bot.sendMessage(chatId, '⚠️ 상태 조회 중 오류가 발생했습니다.');
      }
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

    // /quiz 명령어 - DB에서 랜덤 퀴즈 조회
    this.bot.onText(/\/quiz$/, async (msg) => {
      const chatId = msg.chat.id;
      
      try {
        if (!this.aiProvider) {
          this.bot.sendMessage(chatId, '⚠️ AI 제공자가 초기화되지 않았습니다.');
          return;
        }
        
        const quizService = this.aiProvider.getQuizService();
        const randomQuiz = await quizService.getRandomQuiz();
        
        if (randomQuiz) {
          const formattedQuiz = quizService.formatQuizForTelegram(randomQuiz);
          this.bot.sendMessage(chatId, formattedQuiz, { parse_mode: 'Markdown' });
        } else {
          this.bot.sendMessage(chatId, '📝 저장된 퀴즈가 없습니다. 새로운 퀴즈를 생성합니다...');
          
          // 오늘의 주제로 새 퀴즈 생성
          const now = moment().tz('Asia/Seoul');
          const dayOfWeek = now.day();
          const todayKnowledge = AviationKnowledgeManager.getKnowledgeByDay(dayOfWeek);
          const randomSubject = AviationKnowledgeManager.getRandomSubject(dayOfWeek);
          
          const quizMessage = await this.messageGenerator.generateCustomQuiz(todayKnowledge.topic, randomSubject);
          this.bot.sendMessage(chatId, quizMessage, { parse_mode: 'Markdown' });
        }
        
      } catch (error) {
        console.error('퀴즈 조회 오류:', error);
        this.bot.sendMessage(chatId, '⚠️ 퀴즈 조회 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
      }
    });

    // /quiz [주제] 명령어 - 특정 주제 퀴즈 생성
    this.bot.onText(/\/quiz (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const customTopic = match[1].trim();
      
      try {
        this.bot.sendMessage(chatId, '🤖 AI가 맞춤 문제를 생성하고 있습니다... 잠시만 기다려 주세요!');
        
        const quizMessage = await this.messageGenerator.generateCustomQuiz("맞춤 주제", customTopic);
        this.bot.sendMessage(chatId, quizMessage, { parse_mode: 'Markdown' });
        
      } catch (error) {
        console.error('맞춤 퀴즈 생성 오류:', error);
        this.bot.sendMessage(chatId, '⚠️ 퀴즈 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
      }
    });

    // /quizstats 명령어 - 퀴즈 통계
    this.bot.onText(/\/quizstats/, async (msg) => {
      const chatId = msg.chat.id;
      
      try {
        if (!this.aiProvider) {
          this.bot.sendMessage(chatId, '⚠️ AI 제공자가 초기화되지 않았습니다.');
          return;
        }
        
        const quizService = this.aiProvider.getQuizService();
        const stats = await quizService.getQuizStats();
        
        let message = `📊 **퀴즈 통계**\n\n`;
        message += `전체 퀴즈: ${stats.total}개\n\n`;
        
        if (stats.byTopic.length > 0) {
          message += `**주제별 분포:**\n`;
          stats.byTopic.forEach(item => {
            message += `• ${item.topic}: ${item.count}개\n`;
          });
          message += '\n';
        }
        
        if (stats.byProvider.length > 0) {
          message += `**AI 제공자별:**\n`;
          stats.byProvider.forEach(item => {
            message += `• ${item.provider}: ${item.count}개\n`;
          });
        }
        
        this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
        
      } catch (error) {
        console.error('퀴즈 통계 조회 오류:', error);
        this.bot.sendMessage(chatId, '⚠️ 통계 조회 중 오류가 발생했습니다.');
      }
    });

    // Error handling
    this.bot.on('error', (error) => {
      console.error('봇 에러:', error);
    });
  }
}

module.exports = CommandHandlers;