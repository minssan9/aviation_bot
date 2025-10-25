/**
 * Interface for Subject Repository
 * Defines contract for subject data access operations
 */
class ISubjectRepository {
  /**
   * Get all active subjects
   * @returns {Promise<Array>} Array of subject records
   */
  async findAll() {
    throw new Error('Method must be implemented');
  }

  /**
   * Get subject by ID
   * @param {number} id - Subject ID
   * @returns {Promise<Object|null>} Subject record or null
   */
  async findById(id) {
    throw new Error('Method must be implemented');
  }

  /**
   * Get subjects by topic ID
   * @param {number} topicId - Topic ID
   * @returns {Promise<Array>} Array of subject records
   */
  async findByTopicId(topicId) {
    throw new Error('Method must be implemented');
  }

  /**
   * Get subjects by difficulty level
   * @param {string} difficultyLevel - Difficulty level
   * @returns {Promise<Array>} Array of subject records
   */
  async findByDifficulty(difficultyLevel) {
    throw new Error('Method must be implemented');
  }

  /**
   * Get random subject from topic
   * @param {number} topicId - Topic ID
   * @returns {Promise<Object|null>} Random subject record or null
   */
  async findRandomByTopicId(topicId) {
    throw new Error('Method must be implemented');
  }

  /**
   * Get random subject from all topics
   * @returns {Promise<Object|null>} Random subject record or null
   */
  async findRandom() {
    throw new Error('Method must be implemented');
  }

  /**
   * Create new subject
   * @param {Object} subjectData - Subject data
   * @returns {Promise<number>} Inserted subject ID
   */
  async create(subjectData) {
    throw new Error('Method must be implemented');
  }

  /**
   * Update subject
   * @param {number} id - Subject ID
   * @param {Object} subjectData - Updated subject data
   * @returns {Promise<boolean>} Success status
   */
  async update(id, subjectData) {
    throw new Error('Method must be implemented');
  }

  /**
   * Soft delete subject
   * @param {number} id - Subject ID
   * @returns {Promise<boolean>} Success status
   */
  async delete(id) {
    throw new Error('Method must be implemented');
  }

  /**
   * Update subject order
   * @param {number} topicId - Topic ID
   * @param {Array} subjectOrders - Array of {id, sortOrder} objects
   * @returns {Promise<boolean>} Success status
   */
  async updateOrder(topicId, subjectOrders) {
    throw new Error('Method must be implemented');
  }

  /**
   * Search subjects
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Array of matching subjects
   */
  async search(query, options = {}) {
    throw new Error('Method must be implemented');
  }

  /**
   * Get subject statistics
   * @returns {Promise<Object>} Subject statistics
   */
  async getStats() {
    throw new Error('Method must be implemented');
  }
}

module.exports = ISubjectRepository;
