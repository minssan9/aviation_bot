const Database = require('../../config/database/database');

class QuizService {
  constructor() {
    this.db = new Database();
  }

  async initialize() {
    await this.db.initialize();
  }

  /**
   * AI 생성 퀴즈 텍스트를 파싱하여 구조화된 데이터로 변환
   */
  parseQuizText(quizText) {
    try {
      const lines = quizText.split('\n').filter(line => line.trim());
      
      let question = '';
      let optionA = '', optionB = '', optionC = '', optionD = '';
      let correctAnswer = '';
      let explanation = '';
      
      let currentSection = '';
      
      for (const line of lines) {
        const trimmed = line.trim();
        
        if (trimmed.includes('**문제:**') || trimmed.includes('문제:')) {
          currentSection = 'question';
          continue;
        } else if (trimmed.includes('**선택지:**') || trimmed.includes('선택지:')) {
          currentSection = 'options';
          continue;
        } else if (trimmed.includes('**정답:**') || trimmed.includes('정답:')) {
          currentSection = 'answer';
          const answerMatch = trimmed.match(/[ABCD]/);
          if (answerMatch) {
            correctAnswer = answerMatch[0];
          }
          continue;
        } else if (trimmed.includes('**해설:**') || trimmed.includes('해설:')) {
          currentSection = 'explanation';
          continue;
        }
        
        // 내용 추출
        if (currentSection === 'question' && trimmed && !trimmed.includes('**')) {
          question += (question ? ' ' : '') + trimmed;
        } else if (currentSection === 'options') {
          if (trimmed.startsWith('A)') || trimmed.startsWith('A.')) {
            optionA = trimmed.substring(2).trim();
          } else if (trimmed.startsWith('B)') || trimmed.startsWith('B.')) {
            optionB = trimmed.substring(2).trim();
          } else if (trimmed.startsWith('C)') || trimmed.startsWith('C.')) {
            optionC = trimmed.substring(2).trim();
          } else if (trimmed.startsWith('D)') || trimmed.startsWith('D.')) {
            optionD = trimmed.substring(2).trim();
          }
        } else if (currentSection === 'explanation' && trimmed && !trimmed.includes('**')) {
          explanation += (explanation ? ' ' : '') + trimmed;
        }
      }
      
      // 유효성 검증
      if (!question || !optionA || !optionB || !optionC || !optionD || !correctAnswer) {
        throw new Error('Quiz parsing failed: missing required fields');
      }
      
      return {
        question: question.trim(),
        option_a: optionA.trim(),
        option_b: optionB.trim(),
        option_c: optionC.trim(),
        option_d: optionD.trim(),
        correct_answer: correctAnswer,
        explanation: explanation.trim() || null
      };
    } catch (error) {
      console.error('❌ Quiz parsing error:', error);
      throw error;
    }
  }

  /**
   * AI 생성 퀴즈를 DB에 저장
   */
  async saveQuiz(topic, knowledgeArea, quizText, provider = 'gemini') {
    try {
      const parsedQuiz = this.parseQuizText(quizText);
      
      const sql = `
        INSERT INTO quizzes (
          topic, knowledge_area, question, option_a, option_b, 
          option_c, option_d, correct_answer, explanation, provider
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const params = [
        topic,
        knowledgeArea,
        parsedQuiz.question,
        parsedQuiz.option_a,
        parsedQuiz.option_b,
        parsedQuiz.option_c,
        parsedQuiz.option_d,
        parsedQuiz.correct_answer,
        parsedQuiz.explanation,
        provider
      ];
      
      const result = await this.db.run(sql, params);
      console.log(`✅ Quiz saved to database (ID: ${result.lastID})`);
      
      return result.lastID;
    } catch (error) {
      console.error('❌ Failed to save quiz:', error);
      throw error;
    }
  }

  /**
   * 랜덤 퀴즈 조회
   */
  async getRandomQuiz(topic = null) {
    try {
      let sql = `
        SELECT id, topic, knowledge_area, question, option_a, option_b, 
               option_c, option_d, correct_answer, explanation, created_at
        FROM quizzes 
      `;
      let params = [];
      
      if (topic) {
        sql += ' WHERE topic = ?';
        params.push(topic);
      }
      
      sql += ' ORDER BY RANDOM() LIMIT 1';
      
      const quiz = await this.db.get(sql, params);
      return quiz;
    } catch (error) {
      console.error('❌ Failed to get random quiz:', error);
      throw error;
    }
  }

  /**
   * 주제별 퀴즈 목록 조회
   */
  async getQuizzesByTopic(topic, limit = 10) {
    try {
      const sql = `
        SELECT id, topic, knowledge_area, question, option_a, option_b, 
               option_c, option_d, correct_answer, explanation, created_at
        FROM quizzes 
        WHERE topic = ?
        ORDER BY created_at DESC
        LIMIT ?
      `;
      
      const quizzes = await this.db.all(sql, [topic, limit]);
      return quizzes;
    } catch (error) {
      console.error('❌ Failed to get quizzes by topic:', error);
      throw error;
    }
  }

  /**
   * 퀴즈 통계 조회
   */
  async getQuizStats() {
    try {
      const totalSql = 'SELECT COUNT(*) as total FROM quizzes';
      const topicSql = `
        SELECT topic, COUNT(*) as count 
        FROM quizzes 
        GROUP BY topic 
        ORDER BY count DESC
      `;
      const providerSql = `
        SELECT provider, COUNT(*) as count 
        FROM quizzes 
        GROUP BY provider
      `;
      
      const [total, topics, providers] = await Promise.all([
        this.db.get(totalSql),
        this.db.all(topicSql),
        this.db.all(providerSql)
      ]);
      
      return {
        total: total.total,
        byTopic: topics,
        byProvider: providers
      };
    } catch (error) {
      console.error('❌ Failed to get quiz stats:', error);
      throw error;
    }
  }

  /**
   * 퀴즈를 텔레그램 메시지 형식으로 포맷
   */
  formatQuizForTelegram(quiz) {
    if (!quiz) {
      return '❌ 저장된 퀴즈가 없습니다. 먼저 새로운 퀴즈를 생성해보세요!';
    }
    
    let message = `🧠 <b>항공 퀴즈</b> #${quiz.id}\n\n`;
    message += `📚 <b>주제</b>: ${quiz.topic}\n`;
    message += `🎯 <b>영역</b>: ${quiz.knowledge_area}\n\n`;
    message += `<b>문제:</b>\n${quiz.question}\n\n`;
    message += `<b>선택지:</b>\n`;
    message += `A) ${quiz.option_a}\n`;
    message += `B) ${quiz.option_b}\n`;
    message += `C) ${quiz.option_c}\n`;
    message += `D) ${quiz.option_d}\n\n`;
    message += `<b>정답:</b> ${quiz.correct_answer}\n\n`;
    
    if (quiz.explanation) {
      message += `<b>해설:</b>\n${quiz.explanation}`;
    }
    
    return message;
  }

  /**
   * 데이터베이스 연결 종료
   */
  async close() {
    await this.db.close();
  }

  /**
   * 데이터베이스 상태 조회
   */
  getStatus() {
    return this.db.getStats();
  }
}

module.exports = QuizService;