const moment = require('moment-timezone');
const { AviationKnowledgeManager } = require('../aviation-knowledge/aviationKnowledgeService');

class MessageGenerator {
  constructor(aiProvider, aviationKnowledgeService = null) {
    this.aiProvider = aiProvider;
    this.aviationKnowledgeService = aviationKnowledgeService;
  }

  async generateMessage(timeSlot) {
    const now = moment().tz('Asia/Seoul');
    const dayOfWeek = now.day();
    
    // DB에서 데이터 가져오기 (fallback 지원)
    const todayKnowledge = await this._getKnowledgeByDay(dayOfWeek);
    const randomSubject = await this._getRandomSubject(dayOfWeek);
    
    const timeEmojis = {
      morning: '🌅',
      afternoon: '☀️', 
      evening: '🌙'
    };
    
    let message = `${timeEmojis[timeSlot]} <b>${timeSlot === 'morning' ? '오늘의' : timeSlot === 'afternoon' ? '오후' : '저녁'} 항공지식</b>\n\n`;
    message += `📚 <b>주제</b>: ${todayKnowledge.topic}\n\n`;
    
    // AI로 4지 선다 문제 생성
    try {
      const aiResponse = await this.aiProvider.generateQuiz(todayKnowledge.topic, randomSubject);
      if (aiResponse) {
        message += `🧠 <b>AI 생성 문제</b>\n\n${aiResponse}\n\n`;
      } else {
        message += `🎯 <b>오늘의 학습 포인트</b>:\n${randomSubject}\n\n`;
      }
    } catch (error) {
      console.error('AI 응답 생성 실패:', error);
      message += `🎯 <b>오늘의 학습 포인트</b>:\n${randomSubject}\n\n`;
    }
    
    message += await this._getTimeSpecificContent(timeSlot, dayOfWeek);
    
    return message;
  }

  async generateCustomQuiz(topic, knowledgeArea) {
    try {
      const aiResponse = await this.aiProvider.generateQuiz(topic, knowledgeArea);
      
      let message = `🧠 <b>맞춤형 퀴즈</b>\n\n`;
      message += `📚 <b>주제</b>: ${topic}\n`;
      message += `🎯 <b>영역</b>: ${knowledgeArea}\n\n`;
      message += aiResponse;
      
      return message;
    } catch (error) {
      throw new Error('퀴즈 생성에 실패했습니다. AI API 연결을 확인해 주세요.');
    }
  }

  async _getTimeSpecificContent(timeSlot, dayOfWeek) {
    if (timeSlot === 'morning') {
      return `💡 <b>학습 가이드</b>:\n- 실제 비행 상황에서의 적용 예시 포함\n- 조종사가 알아야 할 실무적 포인트 중심\n- 관련 FAR 조항과 체크리스트 항목 확인`;
    } else if (timeSlot === 'afternoon') {
      return `🔍 <b>심화 학습</b>:\n- 문제 상황 3가지와 대응 조치\n- 실제 비행 중 적용 방법\n- 안전 고려사항`;
    } else {
      const tomorrowKnowledge = await this._getKnowledgeByDay((dayOfWeek + 1) % 7);
      return `📝 <b>복습 및 정리</b>:\n- 오늘 학습한 내용 요약\n- 실무 적용 포인트 재확인\n- 내일 학습 주제 미리보기: ${tomorrowKnowledge.topic}`;
    }
  }

  getWelcomeMessage() {
    return `
✈️ <b>항공지식 알림 봇에 오신 것을 환영합니다!</b>

🎯 <b>기능:</b>
- 하루 3번 (오전 9시, 오후 2시, 저녁 8시) 항공지식 알림
- 사업용 조종사 수준의 전문 지식 제공
- 요일별 다른 주제로 체계적 학습
- 구글 Gemini AI & Claude AI 지원

📅 <b>주간 학습 계획:</b>
• 월요일: 항공역학
• 화요일: 항법  
• 수요일: 기상학
• 목요일: 항공기 시스템
• 금요일: 비행 규정
• 토요일: 비행 계획 및 성능
• 일요일: 응급상황 및 안전

🚀 알림이 설정되었습니다! 매일 정해진 시간에 항공지식을 받아보세요.

<b>명령어:</b>
/stop - 알림 중지
/status - 현재 상태 확인
/now - 지금 즉시 학습 메시지 받기
/quiz - AI가 생성하는 4지 선다 문제 받기
/quiz [주제] - 특정 주제로 맞춤 퀴즈 생성
`;
  }

  async getStatusMessage(isSubscribed, subscriberCount) {
    const now = moment().tz('Asia/Seoul');
    const todayKnowledge = await this._getKnowledgeByDay(now.day());
    
    return `
📊 <b>현재 상태</b>
• 알림 상태: ${isSubscribed ? '✅ 활성화' : '❌ 비활성화'}
• 오늘의 주제: ${todayKnowledge.topic}
• 다음 알림: 오전 9시, 오후 2시, 저녁 8시
• 구독자: ${subscriberCount}명
• 데이터 소스: ${this.aviationKnowledgeService ? 'MySQL Database' : 'Static Data'}
`;
  }

  // 내부 메서드: DB 우선, fallback 지원
  async _getKnowledgeByDay(dayOfWeek) {
    try {
      if (this.aviationKnowledgeService) {
        return await AviationKnowledgeManager.getKnowledgeByDay(dayOfWeek);
      }
    } catch (error) {
      console.error('DB query failed, using fallback:', error);
    }
    
    // Fallback data
    const fallback = {
      0: { topic: '응급상황 및 안전' },
      1: { topic: '항공역학' },
      2: { topic: '항법' },
      3: { topic: '기상학' },
      4: { topic: '항공기 시스템' },
      5: { topic: '비행 규정' },
      6: { topic: '비행 계획 및 성능' }
    };
    return fallback[dayOfWeek];
  }

  async _getRandomSubject(dayOfWeek) {
    try {
      if (this.aviationKnowledgeService) {
        return await AviationKnowledgeManager.getRandomSubject(dayOfWeek);
      }
    } catch (error) {
      console.error('DB query failed, using fallback:', error);
    }
    
    // Fallback subjects
    const fallbackSubjects = {
      0: ['Engine Failure 시 Best Glide Speed와 Landing Site 선정'],
      1: ['Bernoulli\'s Principle과 실제 양력 생성 원리의 차이점'],
      2: ['ILS Approach의 구성요소와 Category별 최저기상조건'],
      3: ['Thunderstorm의 생성과정과 3단계'],
      4: ['Turbocharged vs Supercharged Engine의 차이점과 운용방법'],
      5: ['Class A, B, C, D, E Airspace의 입장 요건과 장비 요구사항'],
      6: ['Weight & Balance 계산과 CG Envelope 내 유지 방법']
    };
    const subjects = fallbackSubjects[dayOfWeek] || ['항공 안전 기본 지식'];
    return subjects[Math.floor(Math.random() * subjects.length)];
  }
}

module.exports = MessageGenerator;