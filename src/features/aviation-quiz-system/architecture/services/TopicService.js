const TopicDTO = require('../dtos/TopicDTO');

/**
 * Business logic service for Topic operations
 * Implements use cases and business rules
 */
class TopicService {
  constructor(topicRepository) {
    this.topicRepository = topicRepository;
  }

  /**
   * Get all topics
   * @returns {Promise<Array<TopicDTO>>} Array of topic DTOs
   */
  async getAllTopics() {
    try {
      const topics = await this.topicRepository.findAll();
      return topics.map(topic => TopicDTO.fromDatabase(topic));
    } catch (error) {
      console.error('Error getting all topics:', error);
      throw new Error('Failed to retrieve topics');
    }
  }

  /**
   * Get topic by ID
   * @param {number} id - Topic ID
   * @returns {Promise<TopicDTO>} Topic DTO
   */
  async getTopicById(id) {
    if (!id || !Number.isInteger(id) || id <= 0) {
      throw new Error('Invalid topic ID');
    }

    try {
      const topic = await this.topicRepository.findById(id);
      if (!topic) {
        throw new Error('Topic not found');
      }
      return TopicDTO.fromDatabase(topic);
    } catch (error) {
      console.error(`Error getting topic ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get topic by day of week
   * @param {number} dayOfWeek - Day of week (0-6)
   * @returns {Promise<TopicDTO>} Topic DTO
   */
  async getTopicByDayOfWeek(dayOfWeek) {
    if (dayOfWeek < 0 || dayOfWeek > 6) {
      throw new Error('Day of week must be between 0 and 6');
    }

    try {
      const topic = await this.topicRepository.findByDayOfWeek(dayOfWeek);
      if (!topic) {
        throw new Error(`No topic found for day ${dayOfWeek}`);
      }
      return TopicDTO.fromDatabase(topic);
    } catch (error) {
      console.error(`Error getting topic for day ${dayOfWeek}:`, error);
      throw error;
    }
  }

  /**
   * Create new topic
   * @param {Object} topicData - Topic data
   * @returns {Promise<TopicDTO>} Created topic DTO
   */
  async createTopic(topicData) {
    // Validate input data
    const validation = TopicDTO.validate(topicData);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    try {
      const topicId = await this.topicRepository.create(topicData);
      return await this.getTopicById(topicId);
    } catch (error) {
      console.error('Error creating topic:', error);
      throw new Error('Failed to create topic');
    }
  }

  /**
   * Update topic
   * @param {number} id - Topic ID
   * @param {Object} topicData - Updated topic data
   * @returns {Promise<TopicDTO>} Updated topic DTO
   */
  async updateTopic(id, topicData) {
    if (!id || !Number.isInteger(id) || id <= 0) {
      throw new Error('Invalid topic ID');
    }

    // Validate input data
    const validation = TopicDTO.validate(topicData);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    try {
      const success = await this.topicRepository.update(id, topicData);
      if (!success) {
        throw new Error('Topic not found or update failed');
      }
      return await this.getTopicById(id);
    } catch (error) {
      console.error(`Error updating topic ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete topic
   * @param {number} id - Topic ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteTopic(id) {
    if (!id || !Number.isInteger(id) || id <= 0) {
      throw new Error('Invalid topic ID');
    }

    try {
      return await this.topicRepository.delete(id);
    } catch (error) {
      console.error(`Error deleting topic ${id}:`, error);
      throw new Error('Failed to delete topic');
    }
  }

  /**
   * Get weekly schedule
   * @returns {Promise<Array>} Weekly schedule
   */
  async getWeeklySchedule() {
    try {
      const schedule = await this.topicRepository.getWeeklySchedule();
      return schedule.map(s => ({
        id: s.id,
        day: s.day_name,
        dayOfWeek: s.day_of_week,
        topic: s.topic,
        subjectCount: s.subject_count
      }));
    } catch (error) {
      console.error('Error getting weekly schedule:', error);
      throw new Error('Failed to retrieve weekly schedule');
    }
  }

  /**
   * Search topics
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Array<TopicDTO>>} Array of matching topic DTOs
   */
  async searchTopics(query, options = {}) {
    if (!query || query.trim().length === 0) {
      throw new Error('Search query is required');
    }

    try {
      const topics = await this.topicRepository.search(query, options);
      return topics.map(topic => TopicDTO.fromDatabase(topic));
    } catch (error) {
      console.error(`Error searching topics with query "${query}":`, error);
      throw new Error('Failed to search topics');
    }
  }

  /**
   * Get topic statistics
   * @returns {Promise<Object>} Topic statistics
   */
  async getTopicStats() {
    try {
      return await this.topicRepository.getStats();
    } catch (error) {
      console.error('Error getting topic statistics:', error);
      throw new Error('Failed to retrieve topic statistics');
    }
  }
}

module.exports = TopicService;
