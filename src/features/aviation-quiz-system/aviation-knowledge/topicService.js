class TopicService {
  constructor(database) {
    this.db = database;
  }

  // 모든 토픽 조회
  async getAllTopics() {
    const sql = `
      SELECT t.*, COUNT(s.id) as subject_count
      FROM topics t
      LEFT JOIN subjects s ON t.id = s.topic_id AND s.is_active = 1
      WHERE t.is_active = 1
      GROUP BY t.id
      ORDER BY t.day_of_week ASC
    `;
    return await this.db.all(sql);
  }

  // 특정 요일의 토픽 조회
  async getTopicByDayOfWeek(dayOfWeek) {
    const sql = `
      SELECT * FROM topics 
      WHERE day_of_week = ? AND is_active = 1
      LIMIT 1
    `;
    return await this.db.get(sql, [dayOfWeek]);
  }

  // 토픽별 주제 조회
  async getSubjectsByTopic(topicId) {
    const sql = `
      SELECT * FROM subjects 
      WHERE topic_id = ? AND is_active = 1
      ORDER BY sort_order ASC, id ASC
    `;
    return await this.db.all(sql, [topicId]);
  }

  // 랜덤 주제 선택
  async getRandomSubject(topicId) {
    const sql = `
      SELECT * FROM subjects 
      WHERE topic_id = ? AND is_active = 1
      ORDER BY RAND() 
      LIMIT 1
    `;
    return await this.db.get(sql, [topicId]);
  }

  // 토픽 생성
  async createTopic(name, description, dayOfWeek) {
    const sql = `
      INSERT INTO topics (name, description, day_of_week)
      VALUES (?, ?, ?)
    `;
    const result = await this.db.execute(sql, [name, description, dayOfWeek]);
    return result.insertId;
  }

  // 토픽 업데이트
  async updateTopic(id, name, description, dayOfWeek) {
    const sql = `
      UPDATE topics 
      SET name = ?, description = ?, day_of_week = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    return await this.db.execute(sql, [name, description, dayOfWeek, id]);
  }

  // 주제 생성
  async createSubject(topicId, title, content, difficultyLevel = 'intermediate', sortOrder = 0) {
    const sql = `
      INSERT INTO subjects (topic_id, title, content, difficulty_level, sort_order)
      VALUES (?, ?, ?, ?, ?)
    `;
    const result = await this.db.execute(sql, [topicId, title, content, difficultyLevel, sortOrder]);
    return result.insertId;
  }

  // 주제 업데이트
  async updateSubject(id, title, content, difficultyLevel, sortOrder) {
    const sql = `
      UPDATE subjects 
      SET title = ?, content = ?, difficulty_level = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    return await this.db.execute(sql, [title, content, difficultyLevel, sortOrder, id]);
  }

  // 주제 삭제 (soft delete)
  async deleteSubject(id) {
    const sql = `
      UPDATE subjects 
      SET is_active = 0, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    return await this.db.execute(sql, [id]);
  }

  // 토픽 삭제 (soft delete)
  async deleteTopic(id) {
    const sql = `
      UPDATE topics 
      SET is_active = 0, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    return await this.db.execute(sql, [id]);
  }

  // 주제 순서 업데이트
  async updateSubjectOrder(topicId, subjectOrders) {
    const connection = await this.db.pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      for (const { id, sortOrder } of subjectOrders) {
        await connection.execute(
          'UPDATE subjects SET sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND topic_id = ?',
          [sortOrder, id, topicId]
        );
      }
      
      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // 주간 스케줄 조회
  async getWeeklySchedule() {
    const sql = `
      SELECT t.id, t.name as topic, t.day_of_week, 
             COUNT(s.id) as subject_count,
             CASE t.day_of_week
               WHEN 0 THEN '일요일'
               WHEN 1 THEN '월요일'
               WHEN 2 THEN '화요일'
               WHEN 3 THEN '수요일'
               WHEN 4 THEN '목요일'
               WHEN 5 THEN '금요일'
               WHEN 6 THEN '토요일'
             END as day_name
      FROM topics t
      LEFT JOIN subjects s ON t.id = s.topic_id AND s.is_active = 1
      WHERE t.is_active = 1
      GROUP BY t.id
      ORDER BY t.day_of_week ASC
    `;
    return await this.db.all(sql);
  }

  // 통계 정보
  async getStats() {
    const totalTopics = await this.db.get('SELECT COUNT(*) as count FROM topics WHERE is_active = 1');
    const totalSubjects = await this.db.get('SELECT COUNT(*) as count FROM subjects WHERE is_active = 1');
    const subjectsByDifficulty = await this.db.all(`
      SELECT difficulty_level, COUNT(*) as count 
      FROM subjects 
      WHERE is_active = 1 
      GROUP BY difficulty_level
    `);
    
    return {
      totalTopics: totalTopics.count,
      totalSubjects: totalSubjects.count,
      subjectsByDifficulty: subjectsByDifficulty.reduce((acc, item) => {
        acc[item.difficulty_level] = item.count;
        return acc;
      }, {})
    };
  }

  // 검색 기능
  async searchSubjects(query, topicId = null, difficultyLevel = null) {
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

    sql += ' ORDER BY s.title ASC';
    
    return await this.db.all(sql, params);
  }
}

module.exports = TopicService;