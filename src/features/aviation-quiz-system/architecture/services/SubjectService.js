const SubjectDTO = require('../dtos/SubjectDTO');

/**
 * Business logic service for Subject operations
 * Implements use cases and business rules
 */
class SubjectService {
  constructor(subjectRepository, topicRepository) {
    this.subjectRepository = subjectRepository;
    this.topicRepository = topicRepository;
  }

  /**
   * Get all subjects
   * @returns {Promise<Array<SubjectDTO>>} Array of subject DTOs
   */
  async getAllSubjects() {
    try {
      const subjects = await this.subjectRepository.findAll();
      return subjects.map(subject => SubjectDTO.fromDatabase(subject));
    } catch (error) {
      console.error('Error getting all subjects:', error);
      throw new Error('Failed to retrieve subjects');
    }
  }

  /**
   * Get subject by ID
   * @param {number} id - Subject ID
   * @returns {Promise<SubjectDTO>} Subject DTO
   */
  async getSubjectById(id) {
    if (!id || !Number.isInteger(id) || id <= 0) {
      throw new Error('Invalid subject ID');
    }

    try {
      const subject = await this.subjectRepository.findById(id);
      if (!subject) {
        throw new Error('Subject not found');
      }
      return SubjectDTO.fromDatabase(subject);
    } catch (error) {
      console.error(`Error getting subject ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get subjects by topic ID
   * @param {number} topicId - Topic ID
   * @returns {Promise<Array<SubjectDTO>>} Array of subject DTOs
   */
  async getSubjectsByTopicId(topicId) {
    this._validateTopicId(topicId);
    
    try {
      await this._verifyTopicExists(topicId);
      const subjects = await this.subjectRepository.findByTopicId(topicId);
      return subjects.map(subject => SubjectDTO.fromDatabase(subject));
    } catch (error) {
      console.error(`Error getting subjects for topic ${topicId}:`, error);
      throw error;
    }
  }

  /**
   * Get subjects by difficulty level
   * @param {string} difficultyLevel - Difficulty level
   * @returns {Promise<Array<SubjectDTO>>} Array of subject DTOs
   */
  async getSubjectsByDifficulty(difficultyLevel) {
    const validLevels = ['beginner', 'intermediate', 'advanced'];
    if (!validLevels.includes(difficultyLevel)) {
      throw new Error(`Invalid difficulty level. Must be one of: ${validLevels.join(', ')}`);
    }

    try {
      const subjects = await this.subjectRepository.findByDifficulty(difficultyLevel);
      return subjects.map(subject => SubjectDTO.fromDatabase(subject));
    } catch (error) {
      console.error(`Error getting subjects by difficulty ${difficultyLevel}:`, error);
      throw new Error('Failed to retrieve subjects by difficulty');
    }
  }

  /**
   * Get random subject from topic
   * @param {number} topicId - Topic ID
   * @returns {Promise<SubjectDTO>} Random subject DTO
   */
  async getRandomSubjectByTopicId(topicId) {
    this._validateTopicId(topicId);
    
    try {
      const subject = await this.subjectRepository.findRandomByTopicId(topicId);
      if (!subject) {
        throw new Error(`No subjects found for topic ${topicId}`);
      }
      return SubjectDTO.fromDatabase(subject);
    } catch (error) {
      console.error(`Error getting random subject for topic ${topicId}:`, error);
      throw error;
    }
  }

  /**
   * Get random subject from all topics
   * @returns {Promise<SubjectDTO>} Random subject DTO
   */
  async getRandomSubject() {
    try {
      const subject = await this.subjectRepository.findRandom();
      if (!subject) {
        throw new Error('No subjects found in database');
      }
      return SubjectDTO.fromDatabase(subject);
    } catch (error) {
      console.error('Error getting random subject:', error);
      throw new Error('Failed to retrieve random subject');
    }
  }

  /**
   * Create new subject
   * @param {Object} subjectData - Subject data
   * @returns {Promise<SubjectDTO>} Created subject DTO
   */
  async createSubject(subjectData) {
    this._validateSubjectData(subjectData);
    
    if (subjectData.topicId) {
      await this._verifyTopicExists(subjectData.topicId);
    }

    try {
      const subjectId = await this.subjectRepository.create(subjectData);
      return await this.getSubjectById(subjectId);
    } catch (error) {
      console.error('Error creating subject:', error);
      throw new Error('Failed to create subject');
    }
  }

  /**
   * Update subject
   * @param {number} id - Subject ID
   * @param {Object} subjectData - Updated subject data
   * @returns {Promise<SubjectDTO>} Updated subject DTO
   */
  async updateSubject(id, subjectData) {
    this._validateSubjectId(id);
    this._validateSubjectData(subjectData);
    
    if (subjectData.topicId) {
      await this._verifyTopicExists(subjectData.topicId);
    }

    try {
      const success = await this.subjectRepository.update(id, subjectData);
      if (!success) {
        throw new Error('Subject not found or update failed');
      }
      return await this.getSubjectById(id);
    } catch (error) {
      console.error(`Error updating subject ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete subject
   * @param {number} id - Subject ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteSubject(id) {
    this._validateSubjectId(id);
    
    try {
      return await this.subjectRepository.delete(id);
    } catch (error) {
      console.error(`Error deleting subject ${id}:`, error);
      throw new Error('Failed to delete subject');
    }
  }

  /**
   * Update subject order
   * @param {number} topicId - Topic ID
   * @param {Array} subjectOrders - Array of {id, sortOrder} objects
   * @returns {Promise<boolean>} Success status
   */
  async updateSubjectOrder(topicId, subjectOrders) {
    this._validateTopicId(topicId);
    this._validateSubjectOrders(subjectOrders);

    try {
      return await this.subjectRepository.updateOrder(topicId, subjectOrders);
    } catch (error) {
      console.error(`Error updating subject order for topic ${topicId}:`, error);
      throw new Error('Failed to update subject order');
    }
  }

  /**
   * Search subjects
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Array<SubjectDTO>>} Array of matching subject DTOs
   */
  async searchSubjects(query, options = {}) {
    if (!query || query.trim().length === 0) {
      throw new Error('Search query is required');
    }

    try {
      const subjects = await this.subjectRepository.search(query, options);
      return subjects.map(subject => SubjectDTO.fromDatabase(subject));
    } catch (error) {
      console.error(`Error searching subjects with query "${query}":`, error);
      throw new Error('Failed to search subjects');
    }
  }

  /**
   * Get subject statistics
   * @returns {Promise<Object>} Subject statistics
   */
  async getSubjectStats() {
    try {
      return await this.subjectRepository.getStats();
    } catch (error) {
      console.error('Error getting subject statistics:', error);
      throw new Error('Failed to retrieve subject statistics');
    }
  }

  /**
   * Validate subject ID
   * @private
   * @param {number} id - Subject ID
   */
  _validateSubjectId(id) {
    if (!id || !Number.isInteger(id) || id <= 0) {
      throw new Error('Invalid subject ID');
    }
  }

  /**
   * Validate topic ID
   * @private
   * @param {number} topicId - Topic ID
   */
  _validateTopicId(topicId) {
    if (!topicId || !Number.isInteger(topicId) || topicId <= 0) {
      throw new Error('Invalid topic ID');
    }
  }

  /**
   * Validate subject data
   * @private
   * @param {Object} subjectData - Subject data
   */
  _validateSubjectData(subjectData) {
    const validation = SubjectDTO.validate(subjectData);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }
  }

  /**
   * Validate subject orders array
   * @private
   * @param {Array} subjectOrders - Subject orders array
   */
  _validateSubjectOrders(subjectOrders) {
    if (!Array.isArray(subjectOrders) || subjectOrders.length === 0) {
      throw new Error('Subject orders array is required');
    }

    for (const order of subjectOrders) {
      if (!order.id || !Number.isInteger(order.id) || order.id <= 0) {
        throw new Error('Invalid subject ID in order array');
      }
      if (order.sortOrder === undefined || !Number.isInteger(order.sortOrder) || order.sortOrder < 0) {
        throw new Error('Invalid sort order in order array');
      }
    }
  }

  /**
   * Verify topic exists
   * @private
   * @param {number} topicId - Topic ID
   */
  async _verifyTopicExists(topicId) {
    const topic = await this.topicRepository.findById(topicId);
    if (!topic) {
      throw new Error('Topic not found');
    }
  }
}

module.exports = SubjectService;
