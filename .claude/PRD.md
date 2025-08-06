// package.json
{
  "name": "aviation-knowledge-bot",
  "version": "1.0.0",
  "description": "Daily aviation knowledge telegram bot",
  "main": "bot.js",
  "scripts": {
    "start": "node bot.js",
    "dev": "nodemon bot.js"
  },
  "dependencies": {
    "node-telegram-bot-api": "^0.61.0",
    "node-cron": "^3.0.2",
    "moment-timezone": "^0.5.43"
  }
}

// bot.js
const TelegramBot = require('node-telegram-bot-api');
const cron = require('node-cron');
const moment = require('moment-timezone');

// 봇 토큰 (BotFather에서 발급받은 토큰으로 교체)
const BOT_TOKEN = 'YOUR_BOT_TOKEN_HERE';
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// 사용자 ID 저장 (실제로는 데이터베이스 사용 권장)
let subscribers = new Set();

// 요일별 항공지식 데이터
const aviationKnowledge = {
  0: { // 일요일
    topic: "응급상황 및 안전",
    subjects: [
      "Engine Failure 시 Best Glide Speed와 Landing Site 선정",
      "Spatial Disorientation 예방과 발생 시 대응방법", 
      "Emergency Descent 절차와 Cabin Pressurization 문제",
      "Fire Emergency (Engine, Electrical, Cabin) 대응절차",
      "Inadvertent IMC Entry 시 절차와 예방방법"
    ]
  },
  1: { // 월요일
    topic: "항공역학",
    subjects: [
      "Bernoulli's Principle과 실제 양력 생성 원리의 차이점",
      "Wing Loading이 항공기 성능에 미치는 영향",
      "Stall의 종류와 각각의 특성 (Power-on, Power-off, Accelerated stall)",
      "Ground Effect 현상과 이착륙 시 고려사항",
      "Adverse Yaw 현상과 조종사의 대응방법"
    ]
  },
  2: { // 화요일
    topic: "항법",
    subjects: [
      "ILS Approach의 구성요소와 Category별 최저기상조건",
      "GPS WAAS와 기존 GPS의 차이점 및 정밀접근 가능성",
      "VOR Station Check 절차와 정확도 확인 방법",
      "Dead Reckoning과 Pilotage의 실제 적용",
      "Magnetic Variation과 Deviation의 차이 및 계산법"
    ]
  },
  3: { // 수요일
    topic: "기상학",
    subjects: [
      "Thunderstorm의 생성과정과 3단계 (Cumulus, Mature, Dissipating)",
      "Wind Shear의 종류와 조종사 대응절차",
      "Icing 조건과 Anti-ice/De-ice 시스템 작동원리",
      "Mountain Wave와 Rotor의 형성 및 위험성",
      "METAR/TAF 해석과 실제 비행계획 적용"
    ]
  },
  4: { // 목요일
    topic: "항공기 시스템",
    subjects: [
      "Turbocharged vs Supercharged Engine의 차이점과 운용방법",
      "Electrical System 구성과 Generator/Alternator 고장 시 절차",
      "Hydraulic System의 작동원리와 백업 시스템",
      "Pitot-Static System과 관련 계기 오류 패턴",
      "Fuel System과 Fuel Management 절차"
    ]
  },
  5: { // 금요일
    topic: "비행 규정",
    subjects: [
      "Class A, B, C, D, E Airspace의 입장 요건과 장비 요구사항",
      "사업용 조종사의 Duty Time과 Rest Requirements",
      "IFR Alternate Airport 선정 기준과 Fuel Requirements",
      "Medical Certificate의 종류별 유효기간과 제한사항",
      "Controlled Airport에서의 Communication Procedures"
    ]
  },
  6: { // 토요일
    topic: "비행 계획 및 성능",
    subjects: [
      "Weight & Balance 계산과 CG Envelope 내 유지 방법",
      "Takeoff/Landing Performance Chart 해석과 실제 적용",
      "Density Altitude 계산과 항공기 성능에 미치는 영향",
      "Wind Triangle과 Ground Speed 계산",
      "Fuel Planning과 Reserve Fuel 요구사항"
    ]
  }
};

// 메시지 생성 함수
function generateMessage(timeSlot) {
  const now = moment().tz('Asia/Seoul');
  const dayOfWeek = now.day();
  const todayKnowledge = aviationKnowledge[dayOfWeek];
  
  const timeEmojis = {
    morning: '🌅',
    afternoon: '☀️', 
    evening: '🌙'
  };
  
  const randomSubject = todayKnowledge.subjects[Math.floor(Math.random() * todayKnowledge.subjects.length)];
  
  let message = `${timeEmojis[timeSlot]} **${timeSlot === 'morning' ? '오늘의' : timeSlot === 'afternoon' ? '오후' : '저녁'} 항공지식**\n\n`;
  message += `📚 **주제**: ${todayKnowledge.topic}\n\n`;
  message += `🎯 **오늘의 학습 포인트**:\n${randomSubject}\n\n`;
  
  if (timeSlot === 'morning') {
    message += `💡 **학습 가이드**:\n- 실제 비행 상황에서의 적용 예시 포함\n- 조종사가 알아야 할 실무적 포인트 중심\n- 관련 FAR 조항과 체크리스트 항목 확인`;
  } else if (timeSlot === 'afternoon') {
    message += `🔍 **심화 학습**:\n- 문제 상황 3가지와 대응 조치\n- 실제 비행 중 적용 방법\n- 안전 고려사항`;
  } else {
    message += `📝 **복습 및 정리**:\n- 오늘 학습한 내용 요약\n- 실무 적용 포인트 재확인\n- 내일 학습 주제 미리보기: ${aviationKnowledge[(dayOfWeek + 1) % 7].topic}`;
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
  `, { parse_mode: 'Markdown' });
});

bot.onText(/\/stop/, (msg) => {
  const chatId = msg.chat.id;
  subscribers.delete(chatId);
  bot.sendMessage(chatId, '✅ 알림이 중지되었습니다. /start 명령어로 다시 시작할 수 있습니다.');
});

bot.onText(/\/status/, (msg) => {
  const chatId = msg.chat.id;
  const isSubscribed = subscribers.has(chatId);
  const now = moment().tz('Asia/Seoul');
  const todayTopic = aviationKnowledge[now.day()].topic;
  
  bot.sendMessage(chatId, `
📊 **현재 상태**
• 알림 상태: ${isSubscribed ? '✅ 활성화' : '❌ 비활성화'}
• 오늘의 주제: ${todayTopic}
• 다음 알림: 오전 9시, 오후 2시, 저녁 8시
• 구독자: ${subscribers.size}명
  `, { parse_mode: 'Markdown' });
});

bot.onText(/\/now/, (msg) => {
  const chatId = msg.chat.id;
  const now = moment().tz('Asia/Seoul');
  const hour = now.hour();
  
  let timeSlot;
  if (hour < 13) timeSlot = 'morning';
  else if (hour < 19) timeSlot = 'afternoon';
  else timeSlot = 'evening';
  
  const message = generateMessage(timeSlot);
  bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
});

// 스케줄링 - 한국 시간 기준
// 오전 9시 알림
cron.schedule('0 9 * * *', () => {
  const message = generateMessage('morning');
  subscribers.forEach(chatId => {
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  });
}, {
  timezone: "Asia/Seoul"
});

// 오후 2시 알림  
cron.schedule('0 14 * * *', () => {
  const message = generateMessage('afternoon');
  subscribers.forEach(chatId => {
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  });
}, {
  timezone: "Asia/Seoul"
});

// 저녁 8시 알림
cron.schedule('0 20 * * *', () => {
  const message = generateMessage('evening');
  subscribers.forEach(chatId => {
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  });
}, {
  timezone: "Asia/Seoul"
});

console.log('🤖 항공지식 알림 봇이 시작되었습니다!');
console.log('📅 스케줄: 오전 9시, 오후 2시, 저녁 8시 (KST)');

// 에러 처리
bot.on('error', (error) => {
  console.error('봇 에러:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('처리되지 않은 Promise 거부:', error);
});