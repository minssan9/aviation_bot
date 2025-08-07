const moment = require('moment-timezone');
const { AviationKnowledgeManager } = require('../data/aviationKnowledge');

class MessageGenerator {
  constructor(aiProvider) {
    this.aiProvider = aiProvider;
  }

  async generateMessage(timeSlot) {
    const now = moment().tz('Asia/Seoul');
    const dayOfWeek = now.day();
    const todayKnowledge = AviationKnowledgeManager.getKnowledgeByDay(dayOfWeek);
    
    const timeEmojis = {
      morning: '🌅',
      afternoon: '☀️', 
      evening: '🌙'
    };
    
    const randomSubject = AviationKnowledgeManager.getRandomSubject(dayOfWeek);
    
    let message = `${timeEmojis[timeSlot]} **${timeSlot === 'morning' ? '오늘의' : timeSlot === 'afternoon' ? '오후' : '저녁'} 항공지식**\n\n`;
    message += `📚 **주제**: ${todayKnowledge.topic}\n\n`;
    
    // AI로 4지 선다 문제 생성
    try {
      const aiResponse = await this.aiProvider.generateQuiz(todayKnowledge.topic, randomSubject);
      if (aiResponse) {
        message += `🧠 **AI 생성 문제**\n\n${aiResponse}\n\n`;
      } else {
        message += `🎯 **오늘의 학습 포인트**:\n${randomSubject}\n\n`;
      }
    } catch (error) {
      console.error('AI 응답 생성 실패:', error);
      message += `🎯 **오늘의 학습 포인트**:\n${randomSubject}\n\n`;
    }
    
    message += this._getTimeSpecificContent(timeSlot, dayOfWeek);
    
    return message;
  }

  async generateCustomQuiz(topic, knowledgeArea) {
    try {
      const aiResponse = await this.aiProvider.generateQuiz(topic, knowledgeArea);
      
      let message = `🧠 **맞춤형 퀴즈**\n\n`;
      message += `📚 **주제**: ${topic}\n`;
      message += `🎯 **영역**: ${knowledgeArea}\n\n`;
      message += aiResponse;
      
      return message;
    } catch (error) {
      throw new Error('퀴즈 생성에 실패했습니다. AI API 연결을 확인해 주세요.');
    }
  }

  _getTimeSpecificContent(timeSlot, dayOfWeek) {
    if (timeSlot === 'morning') {
      return `💡 **학습 가이드**:\n- 실제 비행 상황에서의 적용 예시 포함\n- 조종사가 알아야 할 실무적 포인트 중심\n- 관련 FAR 조항과 체크리스트 항목 확인`;
    } else if (timeSlot === 'afternoon') {
      return `🔍 **심화 학습**:\n- 문제 상황 3가지와 대응 조치\n- 실제 비행 중 적용 방법\n- 안전 고려사항`;
    } else {
      const tomorrowTopic = AviationKnowledgeManager.getKnowledgeByDay((dayOfWeek + 1) % 7).topic;
      return `📝 **복습 및 정리**:\n- 오늘 학습한 내용 요약\n- 실무 적용 포인트 재확인\n- 내일 학습 주제 미리보기: ${tomorrowTopic}`;
    }
  }

  getWelcomeMessage() {
    return `
✈️ **항공지식 알림 봇에 오신 것을 환영합니다!**

🎯 **기능:**
- 하루 3번 (오전 9시, 오후 2시, 저녁 8시) 항공지식 알림
- 사업용 조종사 수준의 전문 지식 제공
- 요일별 다른 주제로 체계적 학습
- 구글 Gemini AI & Claude AI 지원

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
  }

  getStatusMessage(isSubscribed, subscriberCount) {
    const now = moment().tz('Asia/Seoul');
    const todayTopic = AviationKnowledgeManager.getKnowledgeByDay(now.day()).topic;
    
    return `
📊 **현재 상태**
• 알림 상태: ${isSubscribed ? '✅ 활성화' : '❌ 비활성화'}
• 오늘의 주제: ${todayTopic}
• 다음 알림: 오전 9시, 오후 2시, 저녁 8시
• 구독자: ${subscriberCount}명
`;
  }
}

module.exports = MessageGenerator;