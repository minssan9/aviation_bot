const MySQLDatabase = require('../../shared/database/mysqlDatabase');

class MySQLQuizService {
  constructor(config) {
    this.db = new MySQLDatabase(config);
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
   * AI 생성 퀴즈를 MySQL DB에 저장
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
      
      const result = await this.db.execute(sql, params);
      console.log(`✅ Quiz saved to MySQL (ID: ${result.insertId})`);
      
      // 통계 업데이트
      await this.updateQuizStats();
      
      return result.insertId;
    } catch (error) {
      console.error('❌ Failed to save quiz to MySQL:', error);
      throw error;
    }
  }

  /**
   * 랜덤 퀴즈 조회 (사용량 추적)
   */
  async getRandomQuiz(topic = null) {
    try {
      let sql = `
        SELECT id, topic, knowledge_area, question, option_a, option_b, 
               option_c, option_d, correct_answer, explanation, usage_count, created_at
        FROM quizzes 
        WHERE is_active = true
      `;
      let params = [];
      
      if (topic) {
        sql += ' AND topic = ?';
        params.push(topic);
      }
      
      sql += ' ORDER BY RAND() LIMIT 1';
      
      const quiz = await this.db.get(sql, params);
      
      if (quiz) {
        // 사용량 증가 & 마지막 사용 시간 업데이트
        await this.incrementQuizUsage(quiz.id);
      }
      
      return quiz;
    } catch (error) {
      console.error('❌ Failed to get random quiz from MySQL:', error);
      throw error;
    }
  }

  /**
   * 퀴즈 사용량 증가
   */
  async incrementQuizUsage(quizId) {
    try {
      const sql = `
        UPDATE quizzes 
        SET usage_count = usage_count + 1, last_used = CURRENT_TIMESTAMP 
        WHERE id = ?
      `;
      await this.db.execute(sql, [quizId]);
    } catch (error) {
      console.warn('⚠️ Failed to increment quiz usage:', error);
    }
  }

  /**
   * 주제별 퀴즈 목록 조회
   */
  async getQuizzesByTopic(topic, limit = 10) {
    try {
      const sql = `
        SELECT id, topic, knowledge_area, question, option_a, option_b, 
               option_c, option_d, correct_answer, explanation, usage_count, created_at
        FROM quizzes 
        WHERE topic = ? AND is_active = true
        ORDER BY usage_count DESC, created_at DESC
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
   * 인기 퀴즈 조회
   */
  async getPopularQuizzes(limit = 10) {
    try {
      const sql = `
        SELECT id, topic, knowledge_area, question, usage_count, last_used, created_at
        FROM quizzes 
        WHERE is_active = true AND usage_count > 0
        ORDER BY usage_count DESC, last_used DESC
        LIMIT ?
      `;
      
      const quizzes = await this.db.all(sql, [limit]);
      return quizzes;
    } catch (error) {
      console.error('❌ Failed to get popular quizzes:', error);
      throw error;
    }
  }

  /**
   * 퀴즈 검색 (전문 검색)
   */
  async searchQuizzes(searchTerm, limit = 10) {
    try {
      const sql = `
        SELECT id, topic, knowledge_area, question, option_a, option_b, 
               option_c, option_d, correct_answer, explanation, usage_count, created_at,
               MATCH(question, knowledge_area, explanation) AGAINST(? IN BOOLEAN MODE) as relevance
        FROM quizzes 
        WHERE MATCH(question, knowledge_area, explanation) AGAINST(? IN BOOLEAN MODE)
          AND is_active = true
        ORDER BY relevance DESC, usage_count DESC
        LIMIT ?
      `;
      
      const searchQuery = `+${searchTerm}*`;
      const quizzes = await this.db.all(sql, [searchQuery, searchQuery, limit]);
      return quizzes;
    } catch (error) {
      console.error('❌ Quiz search failed:', error);
      throw error;
    }
  }

  /**
   * 퀴즈 통계 조회 (향상된)
   */
  async getQuizStats() {
    try {
      const queries = {
        total: 'SELECT COUNT(*) as total FROM quizzes WHERE is_active = true',
        byTopic: `
          SELECT topic, COUNT(*) as count, AVG(usage_count) as avg_usage
          FROM quizzes 
          WHERE is_active = true
          GROUP BY topic 
          ORDER BY count DESC
        `,
        byProvider: `
          SELECT provider, COUNT(*) as count, AVG(usage_count) as avg_usage
          FROM quizzes 
          WHERE is_active = true
          GROUP BY provider
        `,
        byDifficulty: `
          SELECT difficulty, COUNT(*) as count
          FROM quizzes 
          WHERE is_active = true
          GROUP BY difficulty
        `,
        totalUsage: 'SELECT SUM(usage_count) as total_usage FROM quizzes WHERE is_active = true',
        recentCount: `
          SELECT COUNT(*) as recent_count 
          FROM quizzes 
          WHERE is_active = true AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        `
      };
      
      const [total, topics, providers, difficulties, totalUsage, recentCount] = await Promise.all([
        this.db.get(queries.total),
        this.db.all(queries.byTopic),
        this.db.all(queries.byProvider),
        this.db.all(queries.byDifficulty),
        this.db.get(queries.totalUsage),
        this.db.get(queries.recentCount)
      ]);
      
      return {
        total: total.total,
        totalUsage: totalUsage.total_usage || 0,
        recentCount: recentCount.recent_count,
        byTopic: topics,
        byProvider: providers,
        byDifficulty: difficulties
      };
    } catch (error) {
      console.error('❌ Failed to get quiz stats from MySQL:', error);
      throw error;
    }
  }

  /**
   * 시스템 통계 업데이트
   */
  async updateQuizStats() {
    try {
      const total = await this.db.get('SELECT COUNT(*) as count FROM quizzes WHERE is_active = true');
      
      await this.db.execute(
        `INSERT INTO system_stats (metric_name, metric_value, category) 
         VALUES ('total_quizzes', ?, 'quizzes')
         ON DUPLICATE KEY UPDATE 
         metric_value = VALUES(metric_value), updated_at = CURRENT_TIMESTAMP`,
        [total.count.toString()]
      );
    } catch (error) {
      console.warn('⚠️ Failed to update quiz stats:', error);
    }
  }

  /**
   * 퀴즈를 텔레그램 메시지 형식으로 포맷
   */
  formatQuizForTelegram(quiz) {
    if (!quiz) {
      return '❌ 저장된 퀴즈가 없습니다. 먼저 새로운 퀴즈를 생성해보세요!';
    }
    
    let message = `🧠 **항공 퀴즈** #${quiz.id}\n\n`;
    message += `📚 **주제**: ${quiz.topic}\n`;
    message += `🎯 **영역**: ${quiz.knowledge_area}\n`;
    
    if (quiz.usage_count > 0) {
      message += `📊 **인기도**: ${quiz.usage_count}회 사용\n`;
    }
    
    message += `\n**문제:**\n${quiz.question}\n\n`;
    message += `**선택지:**\n`;
    message += `A) ${quiz.option_a}\n`;
    message += `B) ${quiz.option_b}\n`;
    message += `C) ${quiz.option_c}\n`;
    message += `D) ${quiz.option_d}\n\n`;
    message += `**정답:** ${quiz.correct_answer}\n\n`;
    
    if (quiz.explanation) {
      message += `**해설:**\n${quiz.explanation}`;
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

  /**
   * 헬스 체크
   */
  async healthCheck() {
    return await this.db.healthCheck();
  }
}

module.exports = MySQLQuizService;