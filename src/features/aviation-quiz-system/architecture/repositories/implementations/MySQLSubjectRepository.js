const ISubjectRepository = require('../interfaces/ISubjectRepository');

/**
 * MySQL implementation of Subject Repository
 * Handles all subject-related database operations
 */
class MySQLSubjectRepository extends ISubjectRepository {
  constructor(database) {
    super();
    this.db = database;
  }

  /**
   * Get all active subjects
   * @returns {Promise<Array>} Array of subject records
   */
  async findAll() {
    const sql = `
      SELECT s.*, t.name as topic_name, t.day_of_week
      FROM subjects s
      JOIN topics t ON s.topic_id = t.id
      WHERE s.is_active = 1 AND t.is_active = 1
      ORDER BY t.day_of_week ASC, s.sort_order ASC, s.id ASC
    `;
    return await this.db.all(sql);
  }

  /**
   * Get subject by ID
   * @param {number} id - Subject ID
   * @returns {Promise<Object|null>} Subject record or null
   */
  async findById(id) {
    const sql = `
      SELECT s.*, t.name as topic_name, t.day_of_week
      FROM subjects s
      JOIN topics t ON s.topic_id = t.id
      WHERE s.id = ? AND s.is_active = 1 AND t.is_active = 1
    `;
    return await this.db.get(sql, [id]);
  }

  /**
   * Get subjects by topic ID
   * @param {number} topicId - Topic ID
   * @returns {Promise<Array>} Array of subject records
   */
  async findByTopicId(topicId) {
    const sql = `
      SELECT s.*, t.name as topic_name, t.day_of_week
      FROM subjects s
      JOIN topics t ON s.topic_id = t.id
      WHERE s.topic_id = ? AND s.is_active = 1 AND t.is_active = 1
      ORDER BY s.sort_order ASC, s.id ASC
    `;
    return await this.db.all(sql, [topicId]);
  }

  /**
   * Get subjects by difficulty level
   * @param {string} difficultyLevel - Difficulty level
   * @returns {Promise<Array>} Array of subject records
   */
  async findByDifficulty(difficultyLevel) {
    const sql = `
      SELECT s.*, t.name as topic_name, t.day_of_week
      FROM subjects s
      JOIN topics t ON s.topic_id = t.id
      WHERE s.difficulty_level = ? AND s.is_active = 1 AND t.is_active = 1
      ORDER BY t.day_of_week ASC, s.sort_order ASC
    `;
    return await this.db.all(sql, [difficultyLevel]);
  }

  /**
   * Get random subject from topic
   * @param {number} topicId - Topic ID
   * @returns {Promise<Object|null>} Random subject record or null
   */
  async findRandomByTopicId(topicId) {
    const sql = `
      SELECT s.*, t.name as topic_name, t.day_of_week
      FROM subjects s
      JOIN topics t ON s.topic_id = t.id
      WHERE s.topic_id = ? AND s.is_active = 1 AND t.is_active = 1
      ORDER BY RAND()
      LIMIT 1
    `;
    return await this.db.get(sql, [topicId]);
  }

  /**
   * Get random subject from all topics
   * @returns {Promise<Object|null>} Random subject record or null
   */
  async findRandom() {
    const sql = `
      SELECT s.*, t.name as topic_name, t.day_of_week
      FROM subjects s
      JOIN topics t ON s.topic_id = t.id
      WHERE s.is_active = 1 AND t.is_active = 1
      ORDER BY RAND()
      LIMIT 1
    `;
    return await this.db.get(sql);
  }

  /**
   * Create new subject
   * @param {Object} subjectData - Subject data
   * @returns {Promise<number>} Inserted subject ID
   */
  async create(subjectData) {
    const sql = `
      INSERT INTO subjects (topic_id, title, content, difficulty_level, sort_order, is_active)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const result = await this.db.execute(sql, [
      subjectData.topicId,
      subjectData.title,
      subjectData.content,
      subjectData.difficultyLevel || 'intermediate',
      subjectData.sortOrder || 0,
      subjectData.isActive !== undefined ? subjectData.isActive : true
    ]);
    return result.insertId;
  }

  /**
   * Update subject
   * @param {number} id - Subject ID
   * @param {Object} subjectData - Updated subject data
   * @returns {Promise<boolean>} Success status
   */
  async update(id, subjectData) {
    const fields = [];
    const values = [];

    if (subjectData.title !== undefined) {
      fields.push('title = ?');
      values.push(subjectData.title);
    }
    if (subjectData.content !== undefined) {
      fields.push('content = ?');
      values.push(subjectData.content);
    }
    if (subjectData.difficultyLevel !== undefined) {
      fields.push('difficulty_level = ?');
      values.push(subjectData.difficultyLevel);
    }
    if (subjectData.sortOrder !== undefined) {
      fields.push('sort_order = ?');
      values.push(subjectData.sortOrder);
    }
    if (subjectData.isActive !== undefined) {
      fields.push('is_active = ?');
      values.push(subjectData.isActive);
    }

    if (fields.length === 0) {
      return true; // No fields to update
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const sql = `UPDATE subjects SET ${fields.join(', ')} WHERE id = ?`;
    const result = await this.db.execute(sql, values);
    return result.affectedRows > 0;
  }

  /**
   * Soft delete subject
   * @param {number} id - Subject ID
   * @returns {Promise<boolean>} Success status
   */
  async delete(id) {
    const sql = `
      UPDATE subjects 
      SET is_active = 0, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    const result = await this.db.execute(sql, [id]);
    return result.affectedRows > 0;
  }

  /**
   * Update subject order
   * @param {number} topicId - Topic ID
   * @param {Array} subjectOrders - Array of {id, sortOrder} objects
   * @returns {Promise<boolean>} Success status
   */
  async updateOrder(topicId, subjectOrders) {
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

  /**
   * Search subjects
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Array of matching subjects
   */
  async search(query, options = {}) {
    const { topicId, difficultyLevel, limit = 20, offset = 0 } = options;
    
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

    sql += ' ORDER BY s.title ASC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    return await this.db.all(sql, params);
  }

  /**
   * Get subject statistics
   * @returns {Promise<Object>} Subject statistics
   */
  async getStats() {
    const totalSubjects = await this.db.get('SELECT COUNT(*) as count FROM subjects WHERE is_active = 1');
    const subjectsByDifficulty = await this.db.all(`
      SELECT difficulty_level, COUNT(*) as count 
      FROM subjects 
      WHERE is_active = 1 
      GROUP BY difficulty_level
    `);
    const recentSubjects = await this.db.get(`
      SELECT COUNT(*) as count
      FROM subjects 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) 
      AND is_active = 1
    `);
    
    return {
      totalSubjects: totalSubjects.count,
      subjectsByDifficulty: subjectsByDifficulty.reduce((acc, item) => {
        acc[item.difficulty_level] = item.count;
        return acc;
      }, {}),
      recentSubjectsCount: recentSubjects.count
    };
  }
}

module.exports = MySQLSubjectRepository;
