const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const multer = require('multer');
const ApplicationFactory = require('../features/aviation-quiz-system/architecture/ApplicationFactory');

class AdminServer {
  constructor(database) {
    this.app = express();
    this.port = 3000;
    this.database = database;
    // Initialize new architecture
    const applicationFactory = new ApplicationFactory();
    const app = applicationFactory.createApp(database);
    this.topicService = applicationFactory.getContainer().resolve('topicService');
    // Weather service is now handled by the new architecture
    this.weatherImageService = null;
    this.backupDir = path.join(__dirname, '../data/backups');
    
    this.setupMiddleware();
    this.setupRoutes();
    this.ensureBackupDir();
    this.initializeWeatherService();
  }

  setupMiddleware() {
    this.app.use(express.json());
    this.app.use(express.static(path.join(__dirname, '../../admin')));
    
    // Request logging for debugging
    this.app.use((req, res, next) => {
      if (req.url.includes('client') || req.url.includes('main.ts') || 
          req.url.includes('pwa-entry') || req.url.includes('manifest')) {
        console.log(`🔍 Admin request: ${req.method} ${req.url} from ${req.headers['user-agent']?.substring(0, 50)}`);
      }
      next();
    });
    
    // Multer for file uploads
    const upload = multer({ dest: 'temp/' });
    this.upload = upload;
  }

  async ensureBackupDir() {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
    } catch (error) {
      console.error('백업 디렉토리 생성 실패:', error);
    }
  }

  async initializeWeatherService() {
    try {
      await this.weatherImageService.initialize();
      console.log('✅ SimpleWeatherService initialized for admin server');
    } catch (error) {
      console.error('❌ SimpleWeatherService initialization failed:', error);
    }
  }

  setupRoutes() {
    // 메인 어드민 페이지
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, '../../admin/index.html'));
    });

    // 개발 도구 관련 404 처리
    const devToolsRoutes = ['/client', '/main.ts', '/pwa-entry-point-loaded'];
    devToolsRoutes.forEach(route => {
      this.app.get(route, (req, res) => {
        res.status(404).json({ 
          error: 'Not Found', 
          message: 'This is a static admin page, not a development server',
          route: route 
        });
      });
    });

    // Web App Manifest (optional)
    this.app.get('/manifest.webmanifest', (req, res) => {
      const manifest = {
        name: 'Aviation Bot Admin',
        short_name: 'Aviation Admin',
        description: '항공지식 봇 관리 시스템',
        start_url: '/',
        display: 'standalone',
        theme_color: '#2c5aa0',
        background_color: '#f5f7fa',
        icons: [
          {
            src: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTkyIiBoZWlnaHQ9IjE5MiIgdmlld0JveD0iMCAwIDE5MiAxOTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxOTIiIGhlaWdodD0iMTkyIiBmaWxsPSIjMmM1YWEwIi8+Cjx0ZXh0IHg9Ijk2IiB5PSIxMTAiIGZpbGw9IndoaXRlIiBmb250LXNpemU9IjgwIiBmb250LWZhbWlseT0ic2VyaWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiPuKciO+4jzwvdGV4dD4KPHN2Zz4K',
            sizes: '192x192',
            type: 'image/svg+xml'
          }
        ]
      };
      res.json(manifest);
    });

    // 모든 항공지식 데이터 조회 (DB 기반)
    this.app.get('/api/knowledge', async (req, res) => {
      try {
        // DB에서 토픽별로 주제들을 조회하여 기존 형식으로 변환
        const topics = await this.topicService.getAllTopics();
        const knowledgeData = {};
        
        for (const topic of topics) {
          const subjects = await this.topicService.getSubjectsByTopic(topic.id);
          knowledgeData[topic.day_of_week] = {
            topic: topic.name,
            subjects: subjects.map(s => s.title)
          };
        }
        
        res.json(knowledgeData);
      } catch (error) {
        console.error('DB 데이터 조회 오류:', error);
        
        // Return static fallback data if DB fails
        console.log('DB failed, using static fallback data...');
        const fallbackData = this._getStaticFallbackData();
        res.json(fallbackData);
      }
    });

    // 특정 요일 데이터 업데이트 (DB 기반)
    this.app.put('/api/knowledge/:day', async (req, res) => {
      try {
        const day = parseInt(req.params.day);
        const { topic, subjects } = req.body;

        if (day < 0 || day > 6) {
          return res.status(400).json({ error: '잘못된 요일입니다' });
        }

        if (!topic || !subjects || !Array.isArray(subjects)) {
          return res.status(400).json({ error: '주제와 세부 주제가 필요합니다' });
        }

        // DB에서 해당 요일의 토픽 찾기
        const existingTopic = await this.topicService.getTopicByDayOfWeek(day);
        
        if (!existingTopic) {
          return res.status(404).json({ error: '해당 요일의 토픽을 찾을 수 없습니다' });
        }

        // 토픽 정보 업데이트
        await this.topicService.updateTopic(existingTopic.id, topic, '', day);

        // 기존 주제들 비활성화 (soft delete)
        const existingSubjects = await this.topicService.getSubjectsByTopic(existingTopic.id);
        for (const subject of existingSubjects) {
          await this.topicService.deleteSubject(subject.id);
        }

        // 새 주제들 추가
        for (let i = 0; i < subjects.length; i++) {
          await this.topicService.createSubject(
            existingTopic.id,
            subjects[i],
            '',
            'intermediate',
            i + 1
          );
        }

        // DB update successful - no file fallback needed

        res.json({ success: true, message: '데이터가 업데이트되었습니다' });
      } catch (error) {
        console.error('DB 데이터 업데이트 오류:', error);
        
        // DB update failed
        res.status(500).json({ error: '데이터를 업데이트할 수 없습니다' });
      }
    });

    // 백업 생성 (DB + 파일)
    this.app.post('/api/knowledge/backup', async (req, res) => {
      try {
        // DB에서 데이터 백업
        const topics = await this.topicService.getAllTopics();
        const backupData = {};
        
        for (const topic of topics) {
          const subjects = await this.topicService.getSubjectsByTopic(topic.id);
          backupData[topic.day_of_week] = {
            topic: topic.name,
            subjects: subjects.map(s => s.title)
          };
        }
        
        // 백업 파일 생성
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `aviation-knowledge-db-${timestamp}.json`;
        const filePath = require('path').join(this.backupDir, filename);
        
        await require('fs').promises.writeFile(filePath, JSON.stringify(backupData, null, 2), 'utf8');
        
        // DB backup created successfully
        
        res.json({ success: true, filename, source: 'database' });
      } catch (error) {
        console.error('DB 백업 생성 오류:', error);
        
        // DB backup failed
        res.status(500).json({ error: '백업을 생성할 수 없습니다' });
      }
    });

    // 백업 복원 (DB 기반)
    this.app.post('/api/knowledge/restore', this.upload.single('backup'), async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: '백업 파일이 필요합니다' });
        }

        // 백업 파일에서 데이터 읽기
        const backupContent = await fs.readFile(req.file.path, 'utf8');
        const backupData = JSON.parse(backupContent);
        
        // 데이터 유효성 검증
        const validation = this.validateDataStructure(backupData);
        if (!validation.valid) {
          await fs.unlink(req.file.path);
          return res.status(400).json({ 
            error: `유효하지 않은 백업 데이터: ${validation.errors.join(', ')}` 
          });
        }

        // DB로 데이터 복원
        await this.restoreToDatabase(backupData);
        
        // 임시 파일 삭제
        await fs.unlink(req.file.path);
        
        res.json({ success: true, message: '백업이 데이터베이스에 복원되었습니다' });
      } catch (error) {
        console.error('백업 복원 오류:', error);
        
        // 임시 파일 정리
        if (req.file?.path) {
          try {
            await fs.unlink(req.file.path);
          } catch (unlinkError) {
            console.warn('임시 파일 삭제 실패:', unlinkError.message);
          }
        }
        
        res.status(500).json({ error: '백업을 복원할 수 없습니다' });
      }
    });

    // 데이터 검증
    this.app.post('/api/knowledge/validate', async (req, res) => {
      try {
        const validation = await this.validateData();
        res.json(validation);
      } catch (error) {
        console.error('데이터 검증 오류:', error);
        res.status(500).json({ error: '데이터를 검증할 수 없습니다' });
      }
    });

    // === 토픽 관리 API ===
    // 모든 토픽 조회
    this.app.get('/api/topics', async (req, res) => {
      try {
        const topics = await this.topicService.getAllTopics();
        res.json(topics);
      } catch (error) {
        console.error('토픽 조회 오류:', error);
        res.status(500).json({ error: '토픽을 조회할 수 없습니다' });
      }
    });

    // 주간 스케줄 조회
    this.app.get('/api/topics/schedule', async (req, res) => {
      try {
        const schedule = await this.topicService.getWeeklySchedule();
        res.json(schedule);
      } catch (error) {
        console.error('스케줄 조회 오류:', error);
        res.status(500).json({ error: '스케줄을 조회할 수 없습니다' });
      }
    });

    // 토픽별 주제 조회
    this.app.get('/api/topics/:id/subjects', async (req, res) => {
      try {
        const topicId = parseInt(req.params.id);
        const subjects = await this.topicService.getSubjectsByTopic(topicId);
        res.json(subjects);
      } catch (error) {
        console.error('주제 조회 오류:', error);
        res.status(500).json({ error: '주제를 조회할 수 없습니다' });
      }
    });

    // 토픽 생성
    this.app.post('/api/topics', async (req, res) => {
      try {
        const { name, description, dayOfWeek } = req.body;
        
        if (!name || dayOfWeek === undefined) {
          return res.status(400).json({ error: '토픽명과 요일은 필수입니다' });
        }

        const id = await this.topicService.createTopic(name, description, dayOfWeek);
        res.json({ success: true, id, message: '토픽이 생성되었습니다' });
      } catch (error) {
        console.error('토픽 생성 오류:', error);
        if (error.code === 'ER_DUP_ENTRY') {
          res.status(400).json({ error: '이미 존재하는 토픽명입니다' });
        } else {
          res.status(500).json({ error: '토픽을 생성할 수 없습니다' });
        }
      }
    });

    // 토픽 업데이트
    this.app.put('/api/topics/:id', async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const { name, description, dayOfWeek } = req.body;
        
        if (!name || dayOfWeek === undefined) {
          return res.status(400).json({ error: '토픽명과 요일은 필수입니다' });
        }

        await this.topicService.updateTopic(id, name, description, dayOfWeek);
        res.json({ success: true, message: '토픽이 업데이트되었습니다' });
      } catch (error) {
        console.error('토픽 업데이트 오류:', error);
        res.status(500).json({ error: '토픽을 업데이트할 수 없습니다' });
      }
    });

    // 주제 생성
    this.app.post('/api/subjects', async (req, res) => {
      try {
        const { topicId, title, content, difficultyLevel, sortOrder } = req.body;
        
        if (!topicId || !title) {
          return res.status(400).json({ error: '토픽ID와 제목은 필수입니다' });
        }

        const id = await this.topicService.createSubject(
          topicId, title, content, difficultyLevel, sortOrder
        );
        res.json({ success: true, id, message: '주제가 생성되었습니다' });
      } catch (error) {
        console.error('주제 생성 오류:', error);
        res.status(500).json({ error: '주제를 생성할 수 없습니다' });
      }
    });

    // 주제 업데이트
    this.app.put('/api/subjects/:id', async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const { title, content, difficultyLevel, sortOrder } = req.body;
        
        if (!title) {
          return res.status(400).json({ error: '제목은 필수입니다' });
        }

        await this.topicService.updateSubject(id, title, content, difficultyLevel, sortOrder);
        res.json({ success: true, message: '주제가 업데이트되었습니다' });
      } catch (error) {
        console.error('주제 업데이트 오류:', error);
        res.status(500).json({ error: '주제를 업데이트할 수 없습니다' });
      }
    });

    // 주제 삭제
    this.app.delete('/api/subjects/:id', async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        await this.topicService.deleteSubject(id);
        res.json({ success: true, message: '주제가 삭제되었습니다' });
      } catch (error) {
        console.error('주제 삭제 오류:', error);
        res.status(500).json({ error: '주제를 삭제할 수 없습니다' });
      }
    });

    // 주제 순서 업데이트
    this.app.put('/api/topics/:id/subjects/order', async (req, res) => {
      try {
        const topicId = parseInt(req.params.id);
        const { subjectOrders } = req.body;
        
        if (!Array.isArray(subjectOrders)) {
          return res.status(400).json({ error: '주제 순서 배열이 필요합니다' });
        }

        await this.topicService.updateSubjectOrder(topicId, subjectOrders);
        res.json({ success: true, message: '주제 순서가 업데이트되었습니다' });
      } catch (error) {
        console.error('주제 순서 업데이트 오류:', error);
        res.status(500).json({ error: '주제 순서를 업데이트할 수 없습니다' });
      }
    });

    // 주제 검색
    this.app.get('/api/subjects/search', async (req, res) => {
      try {
        const { q: query, topic_id: topicId, difficulty } = req.query;
        
        if (!query || query.trim() === '') {
          return res.status(400).json({ error: '검색어가 필요합니다' });
        }

        const subjects = await this.topicService.searchSubjects(
          query.trim(), topicId ? parseInt(topicId) : null, difficulty
        );
        res.json(subjects);
      } catch (error) {
        console.error('주제 검색 오류:', error);
        res.status(500).json({ error: '주제를 검색할 수 없습니다' });
      }
    });

    // 통계 정보
    this.app.get('/api/topics/stats', async (req, res) => {
      try {
        const stats = await this.topicService.getStats();
        res.json(stats);
      } catch (error) {
        console.error('통계 조회 오류:', error);
        res.status(500).json({ error: '통계를 조회할 수 없습니다' });
      }
    });

    // === KMA 위성사진 수집 API ===
    
    // 위성사진 수집 실행
    this.app.post('/api/weather/collect', async (req, res) => {
      try {
        console.log('📡 위성사진 수집 API 호출');
        const result = await this.weatherImageService.downloadImage();
        
        res.json({
          success: true,
          timestamp: new Date().toISOString(),
          result: result
        });
      } catch (error) {
        console.error('위성사진 수집 API 오류:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // 위성사진 직접 수집
    this.app.post('/api/weather/kma/collect', async (req, res) => {
      try {
        console.log('🛰️ 위성사진 직접 수집 API 호출');
        
        const result = await this.weatherImageService.downloadImage();
        
        res.json({
          success: true,
          timestamp: new Date().toISOString(),
          result: result
        });
      } catch (error) {
        console.error('위성사진 직접 수집 API 오류:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // 저장된 위성사진 목록 조회
    this.app.get('/api/weather/images', async (req, res) => {
      try {
        const limit = parseInt(req.query.limit) || 20;
        const images = await this.weatherImageService.getStoredImages(limit);
        
        res.json({
          success: true,
          timestamp: new Date().toISOString(),
          count: images.length,
          images: images.map(image => ({
            filename: image.filename,
            size: image.size,
            sizeKB: Math.round(image.size / 1024),
            sizeMB: Math.round(image.size / 1024 / 1024 * 10) / 10,
            created: image.created,
            modified: image.modified,
            filepath: image.filepath
          }))
        });
      } catch (error) {
        console.error('이미지 목록 조회 API 오류:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // 위성사진 서비스 상태 확인
    this.app.get('/api/weather/kma/status', async (req, res) => {
      try {
        const status = await this.weatherImageService.getStatus();
        
        res.json({
          success: true,
          timestamp: new Date().toISOString(),
          status: status.status,
          currentTimestamp: status.currentTimestamp,
          testUrl: status.testUrl,
          error: status.error
        });
      } catch (error) {
        console.error('위성사진 서비스 상태 조회 API 오류:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // 위성사진 정리 (cleanup)
    this.app.post('/api/weather/cleanup', async (req, res) => {
      try {
        const daysToKeep = parseInt(req.body.daysToKeep) || 7;
        const deletedCount = await this.weatherImageService.cleanup(daysToKeep);
        
        res.json({
          success: true,
          timestamp: new Date().toISOString(),
          deletedCount,
          daysToKeep,
          message: `${deletedCount}개 파일이 삭제되었습니다`
        });
      } catch (error) {
        console.error('이미지 정리 API 오류:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });
  }

  // Static fallback data (replaces aviationKnowledge.js file)
  _getStaticFallbackData() {
    return {
      0: { topic: "응급상황 및 안전", subjects: ["Engine Failure 시 Best Glide Speed와 Landing Site 선정", "Spatial Disorientation 예방과 발생 시 대응방법"] },
      1: { topic: "항공역학", subjects: ["Bernoulli's Principle과 실제 양력 생성 원리의 차이점", "Wing Loading이 항공기 성능에 미치는 영향"] },
      2: { topic: "항법", subjects: ["ILS Approach의 구성요소와 Category별 최저기상조건", "GPS WAAS와 기존 GPS의 차이점 및 정밀접근 가능성"] },
      3: { topic: "기상학", subjects: ["Thunderstorm의 생성과정과 3단계 (Cumulus, Mature, Dissipating)", "Wind Shear의 종류와 조종사 대응절차"] },
      4: { topic: "항공기 시스템", subjects: ["Turbocharged vs Supercharged Engine의 차이점과 운용방법", "Electrical System 구성과 Generator/Alternator 고장 시 절차"] },
      5: { topic: "비행 규정", subjects: ["Class A, B, C, D, E Airspace의 입장 요건과 장비 요구사항", "사업용 조종사의 Duty Time과 Rest Requirements"] },
      6: { topic: "비행 계획 및 성능", subjects: ["Weight & Balance 계산과 CG Envelope 내 유지 방법", "Takeoff/Landing Performance Chart 해석과 실제 적용"] }
    };
  }

  async createBackup() {
    // Legacy method - no longer used, DB backup is handled in API endpoint
    throw new Error('File-based backup is deprecated. Use DB-based backup via API.');
  }

  async restoreToDatabase(backupData) {
    try {
      console.log('Restoring data to database...');
      
      // 트랜잭션으로 복원 실행
      const connection = await this.database.pool.getConnection();
      
      try {
        await connection.beginTransaction();
        
        // 모든 기존 주제를 비활성화 (soft delete)
        await connection.execute('UPDATE subjects SET is_active = 0');
        
        // 백업 데이터로 복원
        for (let day = 0; day < 7; day++) {
          const dayData = backupData[day];
          if (!dayData) continue;
          
          // 해당 요일의 토픽 찾기
          const [topicRows] = await connection.execute(
            'SELECT id FROM topics WHERE day_of_week = ? AND is_active = 1',
            [day]
          );
          
          if (topicRows.length === 0) {
            console.warn(`No topic found for day ${day}, skipping...`);
            continue;
          }
          
          const topicId = topicRows[0].id;
          
          // 토픽 이름 업데이트
          await connection.execute(
            'UPDATE topics SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [dayData.topic, topicId]
          );
          
          // 새 주제들 추가
          for (let i = 0; i < dayData.subjects.length; i++) {
            await connection.execute(
              `INSERT INTO subjects (topic_id, title, content, difficulty_level, sort_order, is_active)
               VALUES (?, ?, '', 'intermediate', ?, 1)
               ON DUPLICATE KEY UPDATE
               title = VALUES(title),
               is_active = 1,
               sort_order = VALUES(sort_order),
               updated_at = CURRENT_TIMESTAMP`,
              [topicId, dayData.subjects[i], i + 1]
            );
          }
        }
        
        await connection.commit();
        console.log('Database restore completed successfully');
        
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
      
    } catch (error) {
      console.error('Database restore failed:', error);
      throw new Error(`데이터베이스 복원 실패: ${error.message}`);
    }
  }

  async validateData() {
    // Validate database data instead
    try {
      const stats = await this.topicService.getStats();
      const errors = [];
      
      if (stats.totalTopics === 0) {
        errors.push('토픽이 없습니다');
      }
      
      if (stats.totalSubjects === 0) {
        errors.push('주제가 없습니다');
      }
      
      // Check for all weekdays
      for (let day = 0; day < 7; day++) {
        const topic = await this.topicService.getTopicByDayOfWeek(day);
        if (!topic) {
          errors.push(`${day}요일 토픽이 없습니다`);
        }
      }
      
      return {
        valid: errors.length === 0,
        errors,
        stats
      };
    } catch (error) {
      return {
        valid: false,
        errors: [`데이터베이스 검증 실패: ${error.message}`]
      };
    }
  }

  validateDataStructure(data) {
    const errors = [];

    // 기본 구조 검증
    if (typeof data !== 'object' || data === null) {
      errors.push('데이터가 객체가 아닙니다');
      return { valid: false, errors };
    }

    // 요일별 데이터 검증 (0-6)
    for (let day = 0; day < 7; day++) {
      const dayData = data[day];
      
      if (!dayData) {
        errors.push(`${day}요일 데이터가 없습니다`);
        continue;
      }

      if (typeof dayData.topic !== 'string' || dayData.topic.trim() === '') {
        errors.push(`${day}요일 주제가 유효하지 않습니다`);
      }

      if (!Array.isArray(dayData.subjects)) {
        errors.push(`${day}요일 세부 주제가 배열이 아닙니다`);
        continue;
      }

      if (dayData.subjects.length === 0) {
        errors.push(`${day}요일 세부 주제가 비어있습니다`);
      }

      dayData.subjects.forEach((subject, index) => {
        if (typeof subject !== 'string' || subject.trim() === '') {
          errors.push(`${day}요일 ${index + 1}번째 세부 주제가 유효하지 않습니다`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  start() {
    this.server = this.app.listen(this.port, () => {
      console.log(`🌐 어드민 서버가 시작되었습니다: http://localhost:${this.port}`);
    });
  }

  stop() {
    if (this.server) {
      this.server.close();
      console.log('⏹️ 어드민 서버가 중지되었습니다');
    }
  }
}

module.exports = AdminServer;