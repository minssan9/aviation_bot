class AviationKnowledgeService {
  constructor(database, topicService) {
    this.db = database;
    this.topicService = topicService;
  }

  // 특정 요일의 항공 지식 조회
  async getKnowledgeByDay(dayOfWeek) {
    try {
      const topic = await this.topicService.getTopicByDayOfWeek(dayOfWeek);
      if (!topic) {
        throw new Error(`No topic found for day ${dayOfWeek}`);
      }

      const subjects = await this.topicService.getSubjectsByTopic(topic.id);
      
      return {
        id: topic.id,
        topic: topic.name,
        description: topic.description,
        subjects: subjects.map(s => ({
          id: s.id,
          title: s.title,
          content: s.content,
          difficultyLevel: s.difficulty_level
        }))
      };
    } catch (error) {
      console.error(`Error getting knowledge for day ${dayOfWeek}:`, error);
      throw error;
    }
  }

  // 특정 요일의 랜덤 주제 선택
  async getRandomSubject(dayOfWeek) {
    try {
      const topic = await this.topicService.getTopicByDayOfWeek(dayOfWeek);
      if (!topic) {
        throw new Error(`No topic found for day ${dayOfWeek}`);
      }

      const randomSubject = await this.topicService.getRandomSubject(topic.id);
      if (!randomSubject) {
        throw new Error(`No subjects found for topic ${topic.id}`);
      }

      return {
        id: randomSubject.id,
        title: randomSubject.title,
        content: randomSubject.content,
        difficultyLevel: randomSubject.difficulty_level
      };
    } catch (error) {
      console.error(`Error getting random subject for day ${dayOfWeek}:`, error);
      throw error;
    }
  }

  // 모든 토픽 목록 조회
  async getAllTopics() {
    try {
      const topics = await this.topicService.getAllTopics();
      return topics.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        dayOfWeek: t.day_of_week,
        subjectCount: t.subject_count
      }));
    } catch (error) {
      console.error('Error getting all topics:', error);
      throw error;
    }
  }

  // 주간 스케줄 조회
  async getWeeklySchedule() {
    try {
      const schedule = await this.topicService.getWeeklySchedule();
      return schedule.map(s => ({
        id: s.id,
        day: s.day_name,
        dayOfWeek: s.day_of_week,
        topic: s.topic,
        subjectCount: s.subject_count
      }));
    } catch (error) {
      console.error('Error getting weekly schedule:', error);
      throw error;
    }
  }

  // 특정 난이도의 주제들 조회
  async getSubjectsByDifficulty(difficultyLevel) {
    try {
      const sql = `
        SELECT s.*, t.name as topic_name, t.day_of_week
        FROM subjects s
        JOIN topics t ON s.topic_id = t.id
        WHERE s.difficulty_level = ? AND s.is_active = 1 AND t.is_active = 1
        ORDER BY t.day_of_week, s.sort_order
      `;
      const subjects = await this.db.all(sql, [difficultyLevel]);
      
      return subjects.map(s => ({
        id: s.id,
        title: s.title,
        content: s.content,
        topicName: s.topic_name,
        dayOfWeek: s.day_of_week,
        difficultyLevel: s.difficulty_level
      }));
    } catch (error) {
      console.error(`Error getting subjects by difficulty ${difficultyLevel}:`, error);
      throw error;
    }
  }

  // 랜덤 주제 선택 (모든 요일에서)
  async getRandomSubjectFromAll() {
    try {
      const sql = `
        SELECT s.*, t.name as topic_name, t.day_of_week
        FROM subjects s
        JOIN topics t ON s.topic_id = t.id
        WHERE s.is_active = 1 AND t.is_active = 1
        ORDER BY RAND()
        LIMIT 1
      `;
      const subject = await this.db.get(sql);
      
      if (!subject) {
        throw new Error('No subjects found in database');
      }

      return {
        id: subject.id,
        title: subject.title,
        content: subject.content,
        topicName: subject.topic_name,
        dayOfWeek: subject.day_of_week,
        difficultyLevel: subject.difficulty_level
      };
    } catch (error) {
      console.error('Error getting random subject from all:', error);
      throw error;
    }
  }

  // 검색 기능
  async searchSubjects(query, options = {}) {
    try {
      const { topicId, difficultyLevel, limit = 20 } = options;
      
      let sql = `
        SELECT s.*, t.name as topic_name, t.day_of_week
        FROM subjects s
        JOIN topics t ON s.topic_id = t.id
        WHERE s.is_active = 1 AND t.is_active = 1
        AND (s.title LIKE ? OR s.content LIKE ?)
      `;
      const params = [`%${query}%`, `%${query}%`];

      if (topicId) {
        sql += ' AND s.topic_id = ?';
        params.push(topicId);
      }

      if (difficultyLevel) {
        sql += ' AND s.difficulty_level = ?';
        params.push(difficultyLevel);
      }

      sql += ' ORDER BY s.title ASC LIMIT ?';
      params.push(limit);
      
      const subjects = await this.db.all(sql, params);
      
      return subjects.map(s => ({
        id: s.id,
        title: s.title,
        content: s.content,
        topicName: s.topic_name,
        dayOfWeek: s.day_of_week,
        difficultyLevel: s.difficulty_level
      }));
    } catch (error) {
      console.error(`Error searching subjects with query "${query}":`, error);
      throw error;
    }
  }

  // 통계 정보
  async getStats() {
    try {
      const stats = await this.topicService.getStats();
      
      // 추가 통계 정보
      const recentSubjects = await this.db.all(`
        SELECT COUNT(*) as count
        FROM subjects 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) 
        AND is_active = 1
      `);

      const averageSubjectsPerTopic = stats.totalTopics > 0 
        ? Math.round(stats.totalSubjects / stats.totalTopics * 10) / 10 
        : 0;

      return {
        ...stats,
        recentSubjectsCount: recentSubjects[0]?.count || 0,
        averageSubjectsPerTopic
      };
    } catch (error) {
      console.error('Error getting aviation knowledge stats:', error);
      throw error;
    }
  }

  // 캐시된 데이터 무효화 (필요시)
  async invalidateCache() {
    // 향후 Redis 등의 캐시 시스템 도입시 구현
    console.log('Cache invalidated for aviation knowledge service');
  }
}

// Static methods for backward compatibility
class AviationKnowledgeManager {
  static instance = null;

  static setInstance(aviationKnowledgeService) {
    this.instance = aviationKnowledgeService;
  }

  static async getKnowledgeByDay(dayOfWeek) {
    if (!this.instance) {
      throw new Error('AviationKnowledgeService instance not set');
    }
    
    const knowledge = await this.instance.getKnowledgeByDay(dayOfWeek);
    return {
      topic: knowledge.topic,
      subjects: knowledge.subjects.map(s => s.title)
    };
  }

  static async getRandomSubject(dayOfWeek) {
    if (!this.instance) {
      throw new Error('AviationKnowledgeService instance not set');
    }
    
    const subject = await this.instance.getRandomSubject(dayOfWeek);
    return subject.title;
  }

  static async getAllTopics() {
    if (!this.instance) {
      throw new Error('AviationKnowledgeService instance not set');
    }
    
    const topics = await this.instance.getAllTopics();
    return topics.map(t => t.name);
  }

  static async getWeeklySchedule() {
    if (!this.instance) {
      throw new Error('AviationKnowledgeService instance not set');
    }
    
    const schedule = await this.instance.getWeeklySchedule();
    return schedule.map(s => ({
      day: s.day,
      topic: s.topic
    }));
  }
}

module.exports = { AviationKnowledgeService, AviationKnowledgeManager };