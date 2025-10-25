const TopicService = require('./TopicService');
const SubjectService = require('./SubjectService');

/**
 * Main business service for Aviation Knowledge operations
 * Orchestrates topic and subject services to provide comprehensive knowledge management
 */
class AviationKnowledgeService {
  constructor(topicService, subjectService) {
    this.topicService = topicService;
    this.subjectService = subjectService;
  }

  /**
   * Get knowledge by day of week
   * @param {number} dayOfWeek - Day of week (0-6)
   * @returns {Promise<Object>} Knowledge data with topic and subjects
   */
  async getKnowledgeByDay(dayOfWeek) {
    try {
      const topic = await this.topicService.getTopicByDayOfWeek(dayOfWeek);
      const subjects = await this.subjectService.getSubjectsByTopicId(topic.id);
      
      return {
        id: topic.id,
        topic: topic.name,
        description: topic.description,
        dayOfWeek: topic.dayOfWeek,
        subjects: subjects.map(s => ({
          id: s.id,
          title: s.title,
          content: s.content,
          difficultyLevel: s.difficultyLevel
        }))
      };
    } catch (error) {
      console.error(`Error getting knowledge for day ${dayOfWeek}:`, error);
      throw error;
    }
  }

  /**
   * Get random subject for specific day
   * @param {number} dayOfWeek - Day of week (0-6)
   * @returns {Promise<Object>} Random subject data
   */
  async getRandomSubjectByDay(dayOfWeek) {
    try {
      const topic = await this.topicService.getTopicByDayOfWeek(dayOfWeek);
      const randomSubject = await this.subjectService.getRandomSubjectByTopicId(topic.id);
      
      return {
        id: randomSubject.id,
        title: randomSubject.title,
        content: randomSubject.content,
        topicName: randomSubject.topicName,
        dayOfWeek: randomSubject.dayOfWeek,
        difficultyLevel: randomSubject.difficultyLevel
      };
    } catch (error) {
      console.error(`Error getting random subject for day ${dayOfWeek}:`, error);
      throw error;
    }
  }

  /**
   * Get all topics with metadata
   * @returns {Promise<Array>} Array of topics with subject counts
   */
  async getAllTopics() {
    try {
      const topics = await this.topicService.getAllTopics();
      return topics.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        dayOfWeek: t.dayOfWeek,
        subjectCount: t.subjectCount
      }));
    } catch (error) {
      console.error('Error getting all topics:', error);
      throw error;
    }
  }

  /**
   * Get weekly schedule
   * @returns {Promise<Array>} Weekly schedule with topic and subject information
   */
  async getWeeklySchedule() {
    try {
      const schedule = await this.topicService.getWeeklySchedule();
      return schedule.map(s => ({
        id: s.id,
        day: s.day,
        dayOfWeek: s.dayOfWeek,
        topic: s.topic,
        subjectCount: s.subjectCount
      }));
    } catch (error) {
      console.error('Error getting weekly schedule:', error);
      throw error;
    }
  }

  /**
   * Get subjects by difficulty level across all topics
   * @param {string} difficultyLevel - Difficulty level
   * @returns {Promise<Array>} Array of subjects with topic information
   */
  async getSubjectsByDifficulty(difficultyLevel) {
    try {
      const subjects = await this.subjectService.getSubjectsByDifficulty(difficultyLevel);
      return subjects.map(s => ({
        id: s.id,
        title: s.title,
        content: s.content,
        topicName: s.topicName,
        dayOfWeek: s.dayOfWeek,
        difficultyLevel: s.difficultyLevel
      }));
    } catch (error) {
      console.error(`Error getting subjects by difficulty ${difficultyLevel}:`, error);
      throw error;
    }
  }

  /**
   * Get random subject from all topics
   * @returns {Promise<Object>} Random subject data
   */
  async getRandomSubjectFromAll() {
    try {
      const subject = await this.subjectService.getRandomSubject();
      return {
        id: subject.id,
        title: subject.title,
        content: subject.content,
        topicName: subject.topicName,
        dayOfWeek: subject.dayOfWeek,
        difficultyLevel: subject.difficultyLevel
      };
    } catch (error) {
      console.error('Error getting random subject from all:', error);
      throw error;
    }
  }

  /**
   * Search subjects across all topics
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Array of matching subjects
   */
  async searchSubjects(query, options = {}) {
    try {
      const subjects = await this.subjectService.searchSubjects(query, options);
      return subjects.map(s => ({
        id: s.id,
        title: s.title,
        content: s.content,
        topicName: s.topicName,
        dayOfWeek: s.dayOfWeek,
        difficultyLevel: s.difficultyLevel
      }));
    } catch (error) {
      console.error(`Error searching subjects with query "${query}":`, error);
      throw error;
    }
  }

  /**
   * Get comprehensive statistics
   * @returns {Promise<Object>} Combined statistics from topics and subjects
   */
  async getStats() {
    try {
      const topicStats = await this.topicService.getTopicStats();
      const subjectStats = await this.subjectService.getSubjectStats();
      
      const averageSubjectsPerTopic = topicStats.totalTopics > 0 
        ? Math.round(subjectStats.totalSubjects / topicStats.totalTopics * 10) / 10 
        : 0;

      return {
        ...topicStats,
        ...subjectStats,
        averageSubjectsPerTopic
      };
    } catch (error) {
      console.error('Error getting aviation knowledge stats:', error);
      throw error;
    }
  }

  /**
   * Create new topic with initial subjects
   * @param {Object} topicData - Topic data
   * @param {Array} initialSubjects - Initial subjects to create
   * @returns {Promise<Object>} Created topic with subjects
   */
  async createTopicWithSubjects(topicData, initialSubjects = []) {
    try {
      // Create topic
      const topic = await this.topicService.createTopic(topicData);
      
      // Create initial subjects if provided
      const subjects = [];
      for (const subjectData of initialSubjects) {
        const subject = await this.subjectService.createSubject({
          ...subjectData,
          topicId: topic.id
        });
        subjects.push(subject);
      }
      
      return {
        topic,
        subjects
      };
    } catch (error) {
      console.error('Error creating topic with subjects:', error);
      throw error;
    }
  }

  /**
   * Update topic and its subjects
   * @param {number} topicId - Topic ID
   * @param {Object} topicData - Updated topic data
   * @param {Array} subjectUpdates - Subject updates
   * @returns {Promise<Object>} Updated topic with subjects
   */
  async updateTopicWithSubjects(topicId, topicData, subjectUpdates = []) {
    try {
      // Update topic
      const topic = await this.topicService.updateTopic(topicId, topicData);
      
      // Update subjects if provided
      const subjects = [];
      for (const update of subjectUpdates) {
        if (update.id) {
          // Update existing subject
          const subject = await this.subjectService.updateSubject(update.id, update.data);
          subjects.push(subject);
        } else {
          // Create new subject
          const subject = await this.subjectService.createSubject({
            ...update.data,
            topicId: topicId
          });
          subjects.push(subject);
        }
      }
      
      return {
        topic,
        subjects
      };
    } catch (error) {
      console.error(`Error updating topic ${topicId} with subjects:`, error);
      throw error;
    }
  }

  /**
   * Delete topic and all its subjects
   * @param {number} topicId - Topic ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteTopicWithSubjects(topicId) {
    try {
      // Get all subjects for the topic
      const subjects = await this.subjectService.getSubjectsByTopicId(topicId);
      
      // Delete all subjects
      for (const subject of subjects) {
        await this.subjectService.deleteSubject(subject.id);
      }
      
      // Delete topic
      return await this.topicService.deleteTopic(topicId);
    } catch (error) {
      console.error(`Error deleting topic ${topicId} with subjects:`, error);
      throw error;
    }
  }
}

module.exports = AviationKnowledgeService;
