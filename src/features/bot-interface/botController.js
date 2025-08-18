const TelegramBot = require('node-telegram-bot-api');
const cron = require('node-cron');
const moment = require('moment-timezone');
const Anthropic = require('@anthropic-ai/sdk');
const MySQLDatabase = require('../../shared/database/mysqlDatabase');
const TopicService = require('../aviation-knowledge/topicService');
const { AviationKnowledgeService, AviationKnowledgeManager } = require('../aviation-knowledge/aviationKnowledgeService');
require('dotenv').config();

// 봇 토큰 & Claude API Key (환경 변수에서 가져오기)
const BOT_TOKEN = process.env.BOT_TOKEN;
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN is not set in .env file');
  process.exit(1);
}

if (!CLAUDE_API_KEY) {
  console.error('❌ CLAUDE_API_KEY is not set in .env file');
  process.exit(1);
}

const bot = new TelegramBot(BOT_TOKEN, { polling: true });
const anthropic = new Anthropic({ apiKey: CLAUDE_API_KEY });

// 데이터베이스 초기화
let database, topicService, aviationKnowledgeService;
let subscribers = new Set(); // 임시 저장소 (DB 연결 실패시 fallback)

// 데이터베이스 초기화 함수
async function initializeDatabase() {
  try {
    database = new MySQLDatabase({
      DB_HOST: process.env.DB_HOST,
      DB_PORT: process.env.DB_PORT,
      DB_USER: process.env.DB_USER,
      DB_PASSWORD: process.env.DB_PASSWORD,
      DB_NAME: process.env.DB_NAME
    });
    
    await database.initialize();
    console.log('✅ Database initialized successfully');
    
    topicService = new TopicService(database);
    aviationKnowledgeService = new AviationKnowledgeService(database, topicService);
    
    // Static manager 인스턴스 설정
    AviationKnowledgeManager.setInstance(aviationKnowledgeService);
    
    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    console.log('⚠️ Falling back to hardcoded data');
    return false;
  }
}

// 요일별 항공지식 데이터 (DB 연결 실패시 fallback용)
const fallbackAviationKnowledge = {
  0: { topic: "응급상황 및 안전", subjects: ["Engine Failure 시 Best Glide Speed와 Landing Site 선정", "Spatial Disorientation 예방과 발생 시 대응방법"] },
  1: { topic: "항공역학", subjects: ["Bernoulli's Principle과 실제 양력 생성 원리의 차이점", "Wing Loading이 항공기 성능에 미치는 영향"] },
  2: { topic: "항법", subjects: ["ILS Approach의 구성요소와 Category별 최저기상조건", "GPS WAAS와 기존 GPS의 차이점 및 정밀접근 가능성"] },
  3: { topic: "기상학", subjects: ["Thunderstorm의 생성과정과 3단계 (Cumulus, Mature, Dissipating)", "Wind Shear의 종류와 조종사 대응절차"] },
  4: { topic: "항공기 시스템", subjects: ["Turbocharged vs Supercharged Engine의 차이점과 운용방법", "Electrical System 구성과 Generator/Alternator 고장 시 절차"] },
  5: { topic: "비행 규정", subjects: ["Class A, B, C, D, E Airspace의 입장 요건과 장비 요구사항", "사업용 조종사의 Duty Time과 Rest Requirements"] },
  6: { topic: "비행 계획 및 성능", subjects: ["Weight & Balance 계산과 CG Envelope 내 유지 방법", "Takeoff/Landing Performance Chart 해석과 실제 적용"] }
};

// 데이터 소스 함수 (DB 우선, fallback 지원)
async function getKnowledgeByDay(dayOfWeek) {
  try {
    if (aviationKnowledgeService) {
      return await AviationKnowledgeManager.getKnowledgeByDay(dayOfWeek);
    }
  } catch (error) {
    console.error('DB query failed, using fallback:', error);
  }
  return fallbackAviationKnowledge[dayOfWeek];
}

async function getRandomSubject(dayOfWeek) {
  try {
    if (aviationKnowledgeService) {
      return await AviationKnowledgeManager.getRandomSubject(dayOfWeek);
    }
  } catch (error) {
    console.error('DB query failed, using fallback:', error);
  }
  const knowledge = fallbackAviationKnowledge[dayOfWeek];
  return knowledge.subjects[Math.floor(Math.random() * knowledge.subjects.length)];
}

// Claude API를 사용한 지식 쿼리 함수
async function queryClaudeKnowledge(topic, knowledgeArea) {
  try {
    const prompt = `항공 전문가로서 "${knowledgeArea}" 주제에 대한 상세한 4지 선다 문제를 1개 만들어 주세요.

요구사항:
1. 문제는 사업용 조종사 수준의 전문적인 내용
2. 4개의 선택지 (A, B, C, D)와 명확한 정답 1개
3. 각 선택지는 현실적이고 그럴듯한 내용
4. 정답 해설도 포함
5. 실무에 적용 가능한 실용적 내용

다음 형식으로 답변해 주세요:
**문제:**
[문제 내용]

**선택지:**
A) [선택지 1]
B) [선택지 2] 
C) [선택지 3]
D) [선택지 4]

**정답:** [정답 번호]

**해설:**
[정답 해설 및 추가 설명]`;

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    return response.content[0].text;
  } catch (error) {
    console.error('Claude API 호출 오류:', error);
    return null;
  }
}

// 메시지 생성 함수 (DB 통합)
async function generateMessage(timeSlot) {
  const now = moment().tz('Asia/Seoul');
  const dayOfWeek = now.day();
  
  const todayKnowledge = await getKnowledgeByDay(dayOfWeek);
  const randomSubject = await getRandomSubject(dayOfWeek);
  
  const timeEmojis = {
    morning: '🌅',
    afternoon: '☀️', 
    evening: '🌙'
  };
  
  let message = `${timeEmojis[timeSlot]} **${timeSlot === 'morning' ? '오늘의' : timeSlot === 'afternoon' ? '오후' : '저녁'} 항공지식**\n\n`;
  message += `📚 **주제**: ${todayKnowledge.topic}\n\n`;
  
  // Claude API로 4지 선다 문제 생성
  const claudeResponse = await queryClaudeKnowledge(todayKnowledge.topic, randomSubject);
  
  if (claudeResponse) {
    message += `🧠 **AI 생성 문제**\n\n${claudeResponse}\n\n`;
  } else {
    message += `🎯 **오늘의 학습 포인트**:\n${randomSubject}\n\n`;
  }
  
  if (timeSlot === 'morning') {
    message += `💡 **학습 가이드**:\n- 실제 비행 상황에서의 적용 예시 포함\n- 조종사가 알아야 할 실무적 포인트 중심\n- 관련 FAR 조항과 체크리스트 항목 확인`;
  } else if (timeSlot === 'afternoon') {
    message += `🔍 **심화 학습**:\n- 문제 상황 3가지와 대응 조치\n- 실제 비행 중 적용 방법\n- 안전 고려사항`;
  } else {
    const tomorrowKnowledge = await getKnowledgeByDay((dayOfWeek + 1) % 7);
    message += `📝 **복습 및 정리**:\n- 오늘 학습한 내용 요약\n- 실무 적용 포인트 재확인\n- 내일 학습 주제 미리보기: ${tomorrowKnowledge.topic}`;
  }
  
  return message;
}

// 봇 명령어 처리
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  subscribers.add(chatId);
  
  bot.sendMessage(chatId, `
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
  `, { parse_mode: 'Markdown' });
});

bot.onText(/\/stop/, (msg) => {
  const chatId = msg.chat.id;
  subscribers.delete(chatId);
  bot.sendMessage(chatId, '✅ 알림이 중지되었습니다. /start 명령어로 다시 시작할 수 있습니다.');
});

bot.onText(/\/status/, async (msg) => {
  const chatId = msg.chat.id;
  const isSubscribed = subscribers.has(chatId);
  const now = moment().tz('Asia/Seoul');
  
  try {
    const todayKnowledge = await getKnowledgeByDay(now.day());
    
    bot.sendMessage(chatId, `
📊 **현재 상태**
• 알림 상태: ${isSubscribed ? '✅ 활성화' : '❌ 비활성화'}
• 오늘의 주제: ${todayKnowledge.topic}
• 다음 알림: 오전 9시, 오후 2시, 저녁 8시
• 구독자: ${subscribers.size}명
• 데이터 소스: ${aviationKnowledgeService ? 'MySQL Database' : 'Fallback Data'}
    `, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Status command error:', error);
    bot.sendMessage(chatId, '⚠️ 상태 조회 중 오류가 발생했습니다.');
  }
});

bot.onText(/\/now/, async (msg) => {
  const chatId = msg.chat.id;
  const now = moment().tz('Asia/Seoul');
  const hour = now.hour();
  
  let timeSlot;
  if (hour < 13) timeSlot = 'morning';
  else if (hour < 19) timeSlot = 'afternoon';
  else timeSlot = 'evening';
  
  try {
    const message = await generateMessage(timeSlot);
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('메시지 생성 오류:', error);
    bot.sendMessage(chatId, '⚠️ 메시지 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
  }
});

// /quiz 명령어 - 맞춤형 퀴즈 생성
bot.onText(/\/quiz( (.+))?/, async (msg, match) => {
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
      const todayKnowledge = await getKnowledgeByDay(dayOfWeek);
      topic = todayKnowledge.topic;
      knowledgeArea = await getRandomSubject(dayOfWeek);
    }
    
    bot.sendMessage(chatId, '🤖 AI가 문제를 생성하고 있습니다... 잠시만 기다려 주세요!');
    
    const claudeResponse = await queryClaudeKnowledge(topic, knowledgeArea);
    
    if (claudeResponse) {
      let message = `🧠 **맞춤형 퀴즈**\n\n`;
      message += `📚 **주제**: ${topic}\n`;
      message += `🎯 **영역**: ${knowledgeArea}\n\n`;
      message += claudeResponse;
      
      bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    } else {
      bot.sendMessage(chatId, '❌ 퀴즈 생성에 실패했습니다. Claude API 연결을 확인해 주세요.');
    }
    
  } catch (error) {
    console.error('퀴즈 생성 오류:', error);
    bot.sendMessage(chatId, '⚠️ 퀴즈 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
  }
});

// 스케줄링 - 한국 시간 기준
// 오전 9시 알림
cron.schedule('0 9 * * *', async () => {
  try {
    const message = await generateMessage('morning');
    subscribers.forEach(chatId => {
      bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    });
  } catch (error) {
    console.error('오전 알림 오류:', error);
  }
}, {
  timezone: "Asia/Seoul"
});

// 오후 2시 알림  
cron.schedule('0 14 * * *', async () => {
  try {
    const message = await generateMessage('afternoon');
    subscribers.forEach(chatId => {
      bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    });
  } catch (error) {
    console.error('오후 알림 오류:', error);
  }
}, {
  timezone: "Asia/Seoul"
});

// 저녁 8시 알림
cron.schedule('0 20 * * *', async () => {
  try {
    const message = await generateMessage('evening');
    subscribers.forEach(chatId => {
      bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    });
  } catch (error) {
    console.error('저녁 알림 오류:', error);
  }
}, {
  timezone: "Asia/Seoul"
});

// 봇 시작 함수
async function startBot() {
  console.log('🚀 Starting Aviation Knowledge Bot...');
  
  // 데이터베이스 초기화
  const dbInitialized = await initializeDatabase();
  
  console.log('🤖 항공지식 알림 봇이 시작되었습니다!');
  console.log('📅 스케줄: 오전 9시, 오후 2시, 저녁 8시 (KST)');
  console.log(`💾 데이터 소스: ${dbInitialized ? 'MySQL Database' : 'Fallback Data'}`);
  
  if (dbInitialized) {
    try {
      const stats = await aviationKnowledgeService.getStats();
      console.log(`📊 Database Stats: ${stats.totalTopics} topics, ${stats.totalSubjects} subjects`);
    } catch (error) {
      console.warn('Failed to get database stats:', error.message);
    }
  }
}

// 봇 시작
startBot().catch(error => {
  console.error('Failed to start bot:', error);
  process.exit(1);
});

// 에러 처리
bot.on('error', (error) => {
  console.error('봇 에러:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('처리되지 않은 Promise 거부:', error);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  if (database) {
    await database.close();
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...');
  if (database) {
    await database.close();
  }
  process.exit(0);
});