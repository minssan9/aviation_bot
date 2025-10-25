/**
 * Controller for Topic operations
 * Handles HTTP requests and responses for topic-related endpoints
 */
class TopicController {
  constructor(topicService) {
    this.topicService = topicService;
  }

  /**
   * Get all topics
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  async getAllTopics(req, res) {
    try {
      const topics = await this.topicService.getAllTopics();
      
      res.json({
        success: true,
        message: 'Topics retrieved successfully',
        data: topics.map(topic => topic.toJSON())
      });
    } catch (error) {
      console.error('Error in getAllTopics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve topics',
        error: error.message
      });
    }
  }

  /**
   * Get topic by ID
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  async getTopicById(req, res) {
    try {
      const { id } = req.params;
      const topic = await this.topicService.getTopicById(parseInt(id));
      
      res.json({
        success: true,
        message: 'Topic retrieved successfully',
        data: topic.toJSON()
      });
    } catch (error) {
      console.error('Error in getTopicById:', error);
      
      if (error.message === 'Invalid topic ID' || error.message === 'Topic not found') {
        res.status(404).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to retrieve topic',
          error: error.message
        });
      }
    }
  }

  /**
   * Get topic by day of month
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  async getTopicByDayOfMonth(req, res) {
    try {
      const { dayOfMonth } = req.params;
      const day = parseInt(dayOfMonth);
      
      if (day < 1 || day > 31) {
        return res.status(400).json({
          success: false,
          message: 'Day of month must be between 1 and 31'
        });
      }
      
      const topic = await this.topicService.getTopicByDayOfMonth(day);
      
      res.json({
        success: true,
        message: 'Topic retrieved successfully',
        data: topic.toJSON()
      });
    } catch (error) {
      console.error('Error in getTopicByDayOfMonth:', error);
      
      if (error.message.includes('No topic found')) {
        res.status(404).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to retrieve topic',
          error: error.message
        });
      }
    }
  }

  /**
   * Create new topic
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  async createTopic(req, res) {
    try {
      const topicData = req.body;
      const topic = await this.topicService.createTopic(topicData);
      
      res.status(201).json({
        success: true,
        message: 'Topic created successfully',
        data: topic.toJSON()
      });
    } catch (error) {
      console.error('Error in createTopic:', error);
      
      if (error.message.includes('Validation failed')) {
        res.status(400).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to create topic',
          error: error.message
        });
      }
    }
  }

  /**
   * Update topic
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  async updateTopic(req, res) {
    try {
      const { id } = req.params;
      const topicData = req.body;
      const topic = await this.topicService.updateTopic(parseInt(id), topicData);
      
      res.json({
        success: true,
        message: 'Topic updated successfully',
        data: topic.toJSON()
      });
    } catch (error) {
      console.error('Error in updateTopic:', error);
      
      if (error.message === 'Invalid topic ID' || error.message === 'Topic not found') {
        res.status(404).json({
          success: false,
          message: error.message
        });
      } else if (error.message.includes('Validation failed')) {
        res.status(400).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to update topic',
          error: error.message
        });
      }
    }
  }

  /**
   * Delete topic
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  async deleteTopic(req, res) {
    try {
      const { id } = req.params;
      const success = await this.topicService.deleteTopic(parseInt(id));
      
      if (success) {
        res.json({
          success: true,
          message: 'Topic deleted successfully'
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Topic not found'
        });
      }
    } catch (error) {
      console.error('Error in deleteTopic:', error);
      
      if (error.message === 'Invalid topic ID') {
        res.status(400).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to delete topic',
          error: error.message
        });
      }
    }
  }

  /**
   * Get weekly schedule
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  async getWeeklySchedule(req, res) {
    try {
      const schedule = await this.topicService.getWeeklySchedule();
      
      res.json({
        success: true,
        message: 'Weekly schedule retrieved successfully',
        data: schedule
      });
    } catch (error) {
      console.error('Error in getWeeklySchedule:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve weekly schedule',
        error: error.message
      });
    }
  }

  /**
   * Search topics
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  async searchTopics(req, res) {
    try {
      const { q: query, limit = 20, offset = 0 } = req.query;
      
      if (!query) {
        return res.status(400).json({
          success: false,
          message: 'Search query is required'
        });
      }
      
      const topics = await this.topicService.searchTopics(query, { limit: parseInt(limit), offset: parseInt(offset) });
      
      res.json({
        success: true,
        message: 'Topics search completed successfully',
        data: topics.map(topic => topic.toJSON()),
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: topics.length
        }
      });
    } catch (error) {
      console.error('Error in searchTopics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search topics',
        error: error.message
      });
    }
  }

  /**
   * Get topic statistics
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  async getTopicStats(req, res) {
    try {
      const stats = await this.topicService.getTopicStats();
      
      res.json({
        success: true,
        message: 'Topic statistics retrieved successfully',
        data: stats
      });
    } catch (error) {
      console.error('Error in getTopicStats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve topic statistics',
        error: error.message
      });
    }
  }
}

module.exports = TopicController;
