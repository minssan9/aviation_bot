/**
 * Data Transfer Object for Subject
 * Represents subject data structure for API responses
 */
class SubjectDTO {
  constructor(data) {
    this.id = data.id;
    this.topicId = data.topic_id;
    this.title = data.title;
    this.content = data.content;
    this.difficultyLevel = data.difficulty_level;
    this.sortOrder = data.sort_order;
    this.isActive = data.is_active;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
    this.topicName = data.topic_name;
    this.dayOfWeek = data.day_of_week;
  }

  /**
   * Create SubjectDTO from database row
   * @param {Object} dbRow - Database row object
   * @returns {SubjectDTO}
   */
  static fromDatabase(dbRow) {
    return new SubjectDTO(dbRow);
  }

  /**
   * Convert to plain object for API response
   * @returns {Object}
   */
  toJSON() {
    return {
      id: this.id,
      topicId: this.topicId,
      title: this.title,
      content: this.content,
      difficultyLevel: this.difficultyLevel,
      sortOrder: this.sortOrder,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      topicName: this.topicName,
      dayOfWeek: this.dayOfWeek
    };
  }

  /**
   * Validate subject data
   * @param {Object} data - Subject data to validate
   * @returns {Object} - Validation result
   */
  static validate(data) {
    const errors = [];
    const validDifficultyLevels = ['beginner', 'intermediate', 'advanced'];

    if (!data.title || data.title.trim().length === 0) {
      errors.push('Subject title is required');
    }

    if (data.title && data.title.length > 200) {
      errors.push('Subject title must be less than 200 characters');
    }

    if (!data.content || data.content.trim().length === 0) {
      errors.push('Subject content is required');
    }

    if (data.content && data.content.length > 2000) {
      errors.push('Subject content must be less than 2000 characters');
    }

    if (data.difficultyLevel && !validDifficultyLevels.includes(data.difficultyLevel)) {
      errors.push(`Difficulty level must be one of: ${validDifficultyLevels.join(', ')}`);
    }

    if (data.topicId && (!Number.isInteger(data.topicId) || data.topicId <= 0)) {
      errors.push('Topic ID must be a positive integer');
    }

    if (data.sortOrder !== undefined && (!Number.isInteger(data.sortOrder) || data.sortOrder < 0)) {
      errors.push('Sort order must be a non-negative integer');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

module.exports = SubjectDTO;
