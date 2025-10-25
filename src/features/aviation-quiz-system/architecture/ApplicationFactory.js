const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const ConfigManager = require('./config/ConfigManager');
const { AviationQuizContainer } = require('./container/DIContainer');
const ErrorHandler = require('./middleware/ErrorHandler');

/**
 * Application Factory
 * Creates and configures the aviation quiz application
 */
class ApplicationFactory {
  constructor() {
    this.config = new ConfigManager();
    this.container = null;
    this.app = null;
  }

  /**
   * Create and configure the application
   * @param {Object} database - Database connection
   * @returns {Object} Configured Express application
   */
  createApp(database) {
    // Initialize container
    this.container = new AviationQuizContainer(database);
    
    // Create Express app
    this.app = express();
    
    // Configure middleware
    this._configureMiddleware();
    
    // Configure routes
    this._configureRoutes();
    
    // Configure error handling
    this._configureErrorHandling();
    
    return this.app;
  }

  /**
   * Configure application middleware
   * @private
   */
  _configureMiddleware() {
    // Security middleware
    this.app.use(helmet());
    
    // CORS configuration
    const corsOptions = this.config.get('api.cors');
    this.app.use(cors(corsOptions));
    
    // Rate limiting
    const rateLimitConfig = this.config.get('api.rateLimit');
    const limiter = rateLimit(rateLimitConfig);
    this.app.use('/api/', limiter);
    
    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    // Request logging
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });
  }

  /**
   * Configure application routes
   * @private
   */
  _configureRoutes() {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        success: true,
        message: 'Aviation Quiz System is running',
        timestamp: new Date().toISOString(),
        environment: this.config.getEnvironment()
      });
    });

    // API routes
    this.app.use('/api/topics', this._createTopicRoutes());
    this.app.use('/api/subjects', this._createSubjectRoutes());
    this.app.use('/api/knowledge', this._createKnowledgeRoutes());
    
    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        message: 'Endpoint not found',
        path: req.originalUrl
      });
    });
  }

  /**
   * Create topic routes
   * @returns {Object} Express router
   * @private
   */
  _createTopicRoutes() {
    const router = express.Router();
    const controller = this.container.getTopicController();
    const errorHandler = new ErrorHandler(this.config);

    // GET /api/topics - Get all topics
    router.get('/', errorHandler.catchAsync(async (req, res) => {
      await controller.getAllTopics(req, res);
    }));

    // GET /api/topics/:id - Get topic by ID
    router.get('/:id', errorHandler.catchAsync(async (req, res) => {
      await controller.getTopicById(req, res);
    }));

    // GET /api/topics/day/:dayOfWeek - Get topic by day of week
    router.get('/day/:dayOfWeek', errorHandler.catchAsync(async (req, res) => {
      await controller.getTopicByDayOfWeek(req, res);
    }));

    // POST /api/topics - Create new topic
    router.post('/', errorHandler.catchAsync(async (req, res) => {
      await controller.createTopic(req, res);
    }));

    // PUT /api/topics/:id - Update topic
    router.put('/:id', errorHandler.catchAsync(async (req, res) => {
      await controller.updateTopic(req, res);
    }));

    // DELETE /api/topics/:id - Delete topic
    router.delete('/:id', errorHandler.catchAsync(async (req, res) => {
      await controller.deleteTopic(req, res);
    }));

    // GET /api/topics/schedule/weekly - Get weekly schedule
    router.get('/schedule/weekly', errorHandler.catchAsync(async (req, res) => {
      await controller.getWeeklySchedule(req, res);
    }));

    // GET /api/topics/search - Search topics
    router.get('/search', errorHandler.catchAsync(async (req, res) => {
      await controller.searchTopics(req, res);
    }));

    // GET /api/topics/stats - Get topic statistics
    router.get('/stats', errorHandler.catchAsync(async (req, res) => {
      await controller.getTopicStats(req, res);
    }));

    return router;
  }

  /**
   * Create subject routes
   * @returns {Object} Express router
   * @private
   */
  _createSubjectRoutes() {
    const router = express.Router();
    const controller = this.container.getSubjectController();
    const errorHandler = new ErrorHandler(this.config);

    // GET /api/subjects - Get all subjects
    router.get('/', errorHandler.catchAsync(async (req, res) => {
      await controller.getAllSubjects(req, res);
    }));

    // GET /api/subjects/:id - Get subject by ID
    router.get('/:id', errorHandler.catchAsync(async (req, res) => {
      await controller.getSubjectById(req, res);
    }));

    // GET /api/subjects/topic/:topicId - Get subjects by topic
    router.get('/topic/:topicId', errorHandler.catchAsync(async (req, res) => {
      await controller.getSubjectsByTopicId(req, res);
    }));

    // GET /api/subjects/difficulty/:level - Get subjects by difficulty
    router.get('/difficulty/:level', errorHandler.catchAsync(async (req, res) => {
      await controller.getSubjectsByDifficulty(req, res);
    }));

    // GET /api/subjects/random - Get random subject
    router.get('/random', errorHandler.catchAsync(async (req, res) => {
      await controller.getRandomSubject(req, res);
    }));

    // POST /api/subjects - Create new subject
    router.post('/', errorHandler.catchAsync(async (req, res) => {
      await controller.createSubject(req, res);
    }));

    // PUT /api/subjects/:id - Update subject
    router.put('/:id', errorHandler.catchAsync(async (req, res) => {
      await controller.updateSubject(req, res);
    }));

    // DELETE /api/subjects/:id - Delete subject
    router.delete('/:id', errorHandler.catchAsync(async (req, res) => {
      await controller.deleteSubject(req, res);
    }));

    // PUT /api/subjects/topic/:topicId/order - Update subject order
    router.put('/topic/:topicId/order', errorHandler.catchAsync(async (req, res) => {
      await controller.updateSubjectOrder(req, res);
    }));

    // GET /api/subjects/search - Search subjects
    router.get('/search', errorHandler.catchAsync(async (req, res) => {
      await controller.searchSubjects(req, res);
    }));

    // GET /api/subjects/stats - Get subject statistics
    router.get('/stats', errorHandler.catchAsync(async (req, res) => {
      await controller.getSubjectStats(req, res);
    }));

    return router;
  }

  /**
   * Create knowledge routes
   * @returns {Object} Express router
   * @private
   */
  _createKnowledgeRoutes() {
    const router = express.Router();
    const controller = this.container.getAviationKnowledgeController();
    const errorHandler = new ErrorHandler(this.config);

    // GET /api/knowledge/day/:dayOfWeek - Get knowledge by day
    router.get('/day/:dayOfWeek', errorHandler.catchAsync(async (req, res) => {
      await controller.getKnowledgeByDay(req, res);
    }));

    // GET /api/knowledge/random/:dayOfWeek - Get random subject by day
    router.get('/random/:dayOfWeek', errorHandler.catchAsync(async (req, res) => {
      await controller.getRandomSubjectByDay(req, res);
    }));

    // GET /api/knowledge/topics - Get all topics
    router.get('/topics', errorHandler.catchAsync(async (req, res) => {
      await controller.getAllTopics(req, res);
    }));

    // GET /api/knowledge/schedule - Get weekly schedule
    router.get('/schedule', errorHandler.catchAsync(async (req, res) => {
      await controller.getWeeklySchedule(req, res);
    }));

    // GET /api/knowledge/difficulty/:level - Get subjects by difficulty
    router.get('/difficulty/:level', errorHandler.catchAsync(async (req, res) => {
      await controller.getSubjectsByDifficulty(req, res);
    }));

    // GET /api/knowledge/random - Get random subject from all
    router.get('/random', errorHandler.catchAsync(async (req, res) => {
      await controller.getRandomSubjectFromAll(req, res);
    }));

    // GET /api/knowledge/search - Search subjects
    router.get('/search', errorHandler.catchAsync(async (req, res) => {
      await controller.searchSubjects(req, res);
    }));

    // GET /api/knowledge/stats - Get comprehensive statistics
    router.get('/stats', errorHandler.catchAsync(async (req, res) => {
      await controller.getStats(req, res);
    }));

    return router;
  }

  /**
   * Configure error handling
   * @private
   */
  _configureErrorHandling() {
    const errorHandler = new ErrorHandler(this.config);
    this.app.use(errorHandler.middleware());
  }

  /**
   * Get configuration manager
   * @returns {ConfigManager} Configuration manager instance
   */
  getConfig() {
    return this.config;
  }

  /**
   * Get dependency injection container
   * @returns {AviationQuizContainer} Container instance
   */
  getContainer() {
    return this.container;
  }

  /**
   * Get aviation knowledge service
   * @returns {AviationKnowledgeService} Service instance
   */
  getAviationKnowledgeService() {
    return this.container.getAviationKnowledgeService();
  }
}

module.exports = ApplicationFactory;
