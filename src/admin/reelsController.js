const ReelsAutomationService = require('../services/reelsAutomationService');

class ReelsController {
  constructor(config) {
    this.reelsService = new ReelsAutomationService(config);
  }

  // GET /api/reels/status
  async getStatus(req, res) {
    try {
      const logs = await this.reelsService.getExecutionLogs(7);
      const lastExecution = logs[0];
      const successCount = logs.filter(log => log.status === 'completed').length;
      const failureCount = logs.filter(log => log.status === 'failed').length;
      
      res.json({
        success: true,
        status: {
          lastExecution: lastExecution || null,
          totalExecutions: logs.length,
          successCount,
          failureCount,
          successRate: logs.length > 0 ? ((successCount / logs.length) * 100).toFixed(1) : 0
        }
      });
    } catch (error) {
      console.error('Failed to get status:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // POST /api/reels/generate
  async generateDaily(req, res) {
    try {
      const result = await this.reelsService.generateAndPostDaily();
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Failed to generate daily reel:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // POST /api/reels/generate-custom
  async generateCustom(req, res) {
    try {
      const { word } = req.body;
      
      if (!word || typeof word !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Word is required and must be a string'
        });
      }
      
      const result = await this.reelsService.generateCustomReel(word);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Failed to generate custom reel:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // POST /api/reels/schedule
  async scheduleDaily(req, res) {
    try {
      const { hour = 9, minute = 0 } = req.body;
      
      // Validate hour and minute
      if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        return res.status(400).json({
          success: false,
          error: 'Invalid hour or minute'
        });
      }
      
      await this.reelsService.scheduleDaily(hour, minute);
      
      res.json({
        success: true,
        message: `Daily reels scheduled at ${hour}:${minute.toString().padStart(2, '0')} KST`
      });
    } catch (error) {
      console.error('Failed to schedule daily reels:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // GET /api/reels/logs
  async getLogs(req, res) {
    try {
      const days = parseInt(req.query.days) || 7;
      const logs = await this.reelsService.getExecutionLogs(days);
      
      res.json({
        success: true,
        data: logs
      });
    } catch (error) {
      console.error('Failed to get logs:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // GET /api/reels/validate
  async validateSetup(req, res) {
    try {
      const checks = await this.reelsService.validateSetup();
      const allValid = checks.every(check => check.status === 'valid');
      
      res.json({
        success: true,
        valid: allValid,
        checks
      });
    } catch (error) {
      console.error('Failed to validate setup:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // POST /api/reels/test-content
  async testContentGeneration(req, res) {
    try {
      const { word = 'test' } = req.body;
      
      const contentData = await this.reelsService.contentService.generateContent(word);
      
      res.json({
        success: true,
        data: {
          word: contentData.word,
          content: contentData.content,
          hashtags: contentData.hashtags,
          generatedAt: contentData.generatedAt
        }
      });
    } catch (error) {
      console.error('Failed to test content generation:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = ReelsController;