/**
 * Vercel Serverless Function - Telegram Webhook Handler
 *
 * This function handles incoming Telegram bot updates via webhook.
 * It replaces the polling mechanism used in the standalone version.
 */

const TelegramBot = require('node-telegram-bot-api');
const config = require('../src/config');
const AIProviderManager = require('../src/providers/aiProvider');
const UserService = require('../src/services/userService');
const TopicService = require('../src/services/topicService');
const { AviationKnowledgeService, AviationKnowledgeManager } = require('../src/services/aviationKnowledgeService');
const MessageGenerator = require('../src/features/messageGenerator');
const moment = require('moment-timezone');

// Initialize services (singleton pattern for serverless)
let servicesInitialized = false;
let bot, aiProvider, userService, topicService, aviationKnowledgeService, messageGenerator;

async function initializeServices() {
  if (servicesInitialized) {
    return;
  }

  try {
    console.log('🔧 Initializing services...');

    const botConfig = config.getConfig();

    // Initialize bot without polling (webhook mode)
    bot = new TelegramBot(botConfig.BOT_TOKEN);

    // Initialize AI Provider
    aiProvider = new AIProviderManager(botConfig);
    await aiProvider.initialize();

    // Initialize User Service
    userService = new UserService(botConfig);
    await userService.initialize();

    // Get database instance
    const database = userService.getDatabase();

    // Initialize Topic and Aviation Knowledge services
    topicService = new TopicService(database);
    aviationKnowledgeService = new AviationKnowledgeService(database, topicService);
    AviationKnowledgeManager.setInstance(aviationKnowledgeService);

    // Initialize Message Generator
    messageGenerator = new MessageGenerator(aiProvider, aviationKnowledgeService);

    servicesInitialized = true;
    console.log('✅ Services initialized successfully');
  } catch (error) {
    console.error('❌ Service initialization failed:', error);
    throw error;
  }
}

// Command handlers
async function handleStartCommand(chatId) {
  try {
    await userService.subscribe(chatId);

    const message = `
✈️ **항공지식 알림 봇에 오신 것을 환영합니다!**

🎯 **기능:**
- 하루 3번 (오전 9시, 오후 2시, 저녁 8시) 항공지식 알림
- 사업용 조종사 수준의 전문 지식 제공
- 요일별 다른 주제로 체계적 학습

📅 **주간 학습 계획:**
• 월요일: 항공역학
• 화요일: 항법
• 수요일: 기상학
• 목요일: 항공기 시스템
• 금요일: 비행 규정
• 토요일: 비행 계획 및 성능
• 일요일: 응급상황 및 안전

🚀 알림이 설정되었습니다! 매일 정해진 시간에 항공지식을 받아보세요.

**명령어:**
/stop - 알림 중지
/status - 현재 상태 확인
/now - 지금 즉시 학습 메시지 받기
/quiz - AI가 생성하는 4지 선다 문제 받기
/quiz [주제] - 특정 주제로 맞춤 퀴즈 생성
    `;

    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Start command error:', error);
    await bot.sendMessage(chatId, '⚠️ 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
  }
}

async function handleStopCommand(chatId) {
  try {
    await userService.unsubscribe(chatId);
    await bot.sendMessage(chatId, '✅ 알림이 중지되었습니다. /start 명령어로 다시 시작할 수 있습니다.');
  } catch (error) {
    console.error('Stop command error:', error);
    await bot.sendMessage(chatId, '⚠️ 오류가 발생했습니다.');
  }
}

async function handleStatusCommand(chatId) {
  try {
    const subscribers = await userService.getSubscribers();
    const isSubscribed = subscribers.some(sub => sub.chat_id === chatId.toString());
    const now = moment().tz('Asia/Seoul');
    const todayKnowledge = await AviationKnowledgeManager.getKnowledgeByDay(now.day());

    const message = `
📊 **현재 상태**
• 알림 상태: ${isSubscribed ? '✅ 활성화' : '❌ 비활성화'}
• 오늘의 주제: ${todayKnowledge.topic}
• 다음 알림: 오전 9시, 오후 2시, 저녁 8시
• 전체 구독자: ${subscribers.length}명
• 플랫폼: Vercel Serverless
    `;

    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Status command error:', error);
    await bot.sendMessage(chatId, '⚠️ 상태 조회 중 오류가 발생했습니다.');
  }
}

async function handleNowCommand(chatId) {
  try {
    const now = moment().tz('Asia/Seoul');
    const hour = now.hour();

    let timeSlot;
    if (hour < 13) timeSlot = 'morning';
    else if (hour < 19) timeSlot = 'afternoon';
    else timeSlot = 'evening';

    const message = await messageGenerator.generateMessage(timeSlot);
    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Now command error:', error);
    await bot.sendMessage(chatId, '⚠️ 메시지 생성 중 오류가 발생했습니다.');
  }
}

async function handleQuizCommand(chatId, customTopic) {
  try {
    let topic, knowledgeArea;

    if (customTopic) {
      topic = "맞춤 주제";
      knowledgeArea = customTopic;
    } else {
      const now = moment().tz('Asia/Seoul');
      const dayOfWeek = now.day();
      const todayKnowledge = await AviationKnowledgeManager.getKnowledgeByDay(dayOfWeek);
      topic = todayKnowledge.topic;
      knowledgeArea = await AviationKnowledgeManager.getRandomSubject(dayOfWeek);
    }

    await bot.sendMessage(chatId, '🤖 AI가 문제를 생성하고 있습니다... 잠시만 기다려 주세요!');

    const quiz = await messageGenerator.generateQuiz(topic, knowledgeArea);

    if (quiz) {
      let message = `🧠 **맞춤형 퀴즈**\n\n`;
      message += `📚 **주제**: ${topic}\n`;
      message += `🎯 **영역**: ${knowledgeArea}\n\n`;
      message += quiz;

      await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    } else {
      await bot.sendMessage(chatId, '❌ 퀴즈 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    }
  } catch (error) {
    console.error('Quiz command error:', error);
    await bot.sendMessage(chatId, '⚠️ 퀴즈 생성 중 오류가 발생했습니다.');
  }
}

// Process incoming update
async function processUpdate(update) {
  try {
    if (!update.message) {
      return;
    }

    const message = update.message;
    const chatId = message.chat.id;
    const text = message.text;

    if (!text) {
      return;
    }

    // Handle commands
    if (text.startsWith('/start')) {
      await handleStartCommand(chatId);
    } else if (text.startsWith('/stop')) {
      await handleStopCommand(chatId);
    } else if (text.startsWith('/status')) {
      await handleStatusCommand(chatId);
    } else if (text.startsWith('/now')) {
      await handleNowCommand(chatId);
    } else if (text.startsWith('/quiz')) {
      const customTopic = text.replace('/quiz', '').trim();
      await handleQuizCommand(chatId, customTopic || null);
    } else {
      // Unknown command
      await bot.sendMessage(
        chatId,
        '❓ 알 수 없는 명령어입니다. /start를 입력하여 사용 가능한 명령어를 확인하세요.'
      );
    }
  } catch (error) {
    console.error('Error processing update:', error);
  }
}

// Main webhook handler
module.exports = async (req, res) => {
  try {
    // Only accept POST requests
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Initialize services on first request
    await initializeServices();

    // Process the update
    const update = req.body;

    if (!update) {
      return res.status(400).json({ error: 'No update provided' });
    }

    // Process update asynchronously
    processUpdate(update).catch(error => {
      console.error('Error in processUpdate:', error);
    });

    // Respond immediately to Telegram
    res.status(200).json({ ok: true });

  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
