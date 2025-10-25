const ITopicRepository = require('../interfaces/ITopicRepository');

/**
 * MySQL implementation of Topic Repository
 * Handles all topic-related database operations
 */
class MySQLTopicRepository extends ITopicRepository {
  constructor(database) {
    super();
    this.db = database;
  }

  /**
   * Get all active topics with subject count
   * @returns {Promise<Array>} Array of topic records
   */
  async findAll() {
    const sql = `
      SELECT t.*, COUNT(s.id) as subject_count
      FROM topics t
      LEFT JOIN subjects s ON t.id = s.topic_id AND s.is_active = 1
      WHERE t.is_active = 1
      GROUP BY t.id
      ORDER BY t.day_of_month ASC, t.day_of_week ASC
    `;
    return await this.db.all(sql);
  }

  /**
   * Get topic by ID
   * @param {number} id - Topic ID
   * @returns {Promise<Object|null>} Topic record or null
   */
  async findById(id) {
    const sql = `
      SELECT t.*, COUNT(s.id) as subject_count
      FROM topics t
      LEFT JOIN subjects s ON t.id = s.topic_id AND s.is_active = 1
      WHERE t.id = ? AND t.is_active = 1
      GROUP BY t.id
    `;
    return await this.db.get(sql, [id]);
  }

  /**
   * Get topic by day of week
   * @param {number} dayOfWeek - Day of week (0-6)
   * @returns {Promise<Object|null>} Topic record or null
   */
  async findByDayOfWeek(dayOfWeek) {
    const sql = `
      SELECT t.*, COUNT(s.id) as subject_count
      FROM topics t
      LEFT JOIN subjects s ON t.id = s.topic_id AND s.is_active = 1
      WHERE t.day_of_week = ? AND t.is_active = 1
      GROUP BY t.id
      LIMIT 1
    `;
    return await this.db.get(sql, [dayOfWeek]);
  }

  /**
   * Create new topic
   * @param {Object} topicData - Topic data
   * @returns {Promise<number>} Inserted topic ID
   */
  async create(topicData) {
    const sql = `
      INSERT INTO topics (name, description, day_of_week, day_of_month, topic_category, difficulty_level, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const result = await this.db.execute(sql, [
      topicData.name,
      topicData.description,
      topicData.dayOfWeek,
      topicData.dayOfMonth,
      topicData.topicCategory || 'General',
      topicData.difficultyLevel || 'intermediate',
      topicData.isActive !== undefined ? topicData.isActive : true
    ]);
    return result.insertId;
  }

  /**
   * Update topic
   * @param {number} id - Topic ID
   * @param {Object} topicData - Updated topic data
   * @returns {Promise<boolean>} Success status
   */
  async update(id, topicData) {
    const fields = [];
    const values = [];

    if (topicData.name !== undefined) {
      fields.push('name = ?');
      values.push(topicData.name);
    }
    if (topicData.description !== undefined) {
      fields.push('description = ?');
      values.push(topicData.description);
    }
    if (topicData.dayOfWeek !== undefined) {
      fields.push('day_of_week = ?');
      values.push(topicData.dayOfWeek);
    }
    if (topicData.dayOfMonth !== undefined) {
      fields.push('day_of_month = ?');
      values.push(topicData.dayOfMonth);
    }
    if (topicData.topicCategory !== undefined) {
      fields.push('topic_category = ?');
      values.push(topicData.topicCategory);
    }
    if (topicData.difficultyLevel !== undefined) {
      fields.push('difficulty_level = ?');
      values.push(topicData.difficultyLevel);
    }
    if (topicData.isActive !== undefined) {
      fields.push('is_active = ?');
      values.push(topicData.isActive);
    }

    if (fields.length === 0) {
      return true; // No fields to update
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const sql = `UPDATE topics SET ${fields.join(', ')} WHERE id = ?`;
    const result = await this.db.execute(sql, values);
    return result.affectedRows > 0;
  }

  /**
   * Soft delete topic
   * @param {number} id - Topic ID
   * @returns {Promise<boolean>} Success status
   */
  async delete(id) {
    const sql = `
      UPDATE topics 
      SET is_active = 0, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    const result = await this.db.execute(sql, [id]);
    return result.affectedRows > 0;
  }

  /**
   * Get weekly schedule
   * @returns {Promise<Array>} Array of weekly schedule records
   */
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

  /**
   * Get topic statistics
   * @returns {Promise<Object>} Topic statistics
   */
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

  /**
   * Search topics
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Array of matching topics
   */
  async search(query, options = {}) {
    const { limit = 20, offset = 0 } = options;
    
    let sql = `
      SELECT t.*, COUNT(s.id) as subject_count
      FROM topics t
      LEFT JOIN subjects s ON t.id = s.topic_id AND s.is_active = 1
      WHERE t.is_active = 1
      AND (t.name LIKE ? OR t.description LIKE ?)
      GROUP BY t.id
      ORDER BY t.name ASC
      LIMIT ? OFFSET ?
    `;
    
    const params = [`%${query}%`, `%${query}%`, limit, offset];
    return await this.db.all(sql, params);
  }

  /**
   * Get topic by date (simplified date-based system)
   * @param {number} dayOfMonth - Day of month (1-31)
   * @param {number} month - Month (1-12)
   * @param {number} year - Year
   * @returns {Promise<Object>} Topic record
   */
  async findByDate(dayOfMonth, month, year) {
    const sql = `
      SELECT t.*, COUNT(s.id) as subject_count
      FROM topics t
      LEFT JOIN subjects s ON t.id = s.topic_id AND s.is_active = 1
      WHERE t.day_of_month = ? 
      AND t.is_active = 1
      GROUP BY t.id
      LIMIT 1
    `;
    
    const result = await this.db.get(sql, [dayOfMonth]);
    return result;
  }

  /**
   * Get topic by day of month (simplified)
   * @param {number} dayOfMonth - Day of month (1-31)
   * @returns {Promise<Object>} Topic record
   */
  async findByDayOfMonth(dayOfMonth) {
    const sql = `
      SELECT t.*, COUNT(s.id) as subject_count
      FROM topics t
      LEFT JOIN subjects s ON t.id = s.topic_id AND s.is_active = 1
      WHERE t.day_of_month = ? 
      AND t.is_active = 1
      GROUP BY t.id
      LIMIT 1
    `;
    
    const result = await this.db.get(sql, [dayOfMonth]);
    return result;
  }

  /**
   * Get topics by category
   * @param {string} category - Topic category
   * @returns {Promise<Array>} Array of topic records
   */
  async findByCategory(category) {
    const sql = `
      SELECT t.*, COUNT(s.id) as subject_count
      FROM topics t
      LEFT JOIN subjects s ON t.id = s.topic_id AND s.is_active = 1
      WHERE t.topic_category = ? 
      AND t.is_active = 1
      GROUP BY t.id
      ORDER BY t.day_of_month ASC
    `;
    
    return await this.db.all(sql, [category]);
  }

  /**
   * Get topics by difficulty level
   * @param {string} difficultyLevel - Difficulty level
   * @returns {Promise<Array>} Array of topic records
   */
  async findByDifficulty(difficultyLevel) {
    const sql = `
      SELECT t.*, COUNT(s.id) as subject_count
      FROM topics t
      LEFT JOIN subjects s ON t.id = s.topic_id AND s.is_active = 1
      WHERE t.difficulty_level = ? 
      AND t.is_active = 1
      GROUP BY t.id
      ORDER BY t.day_of_month ASC
    `;
    
    return await this.db.all(sql, [difficultyLevel]);
  }
}

module.exports = MySQLTopicRepository;
