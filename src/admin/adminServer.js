const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const multer = require('multer');
const TopicService = require('../services/topicService');

class AdminServer {
  constructor(database) {
    this.app = express();
    this.port = 3000;
    this.database = database;
    this.topicService = new TopicService(database);
    this.dataFile = path.join(__dirname, '../data/aviationKnowledge.js');
    this.backupDir = path.join(__dirname, '../data/backups');
    
    this.setupMiddleware();
    this.setupRoutes();
    this.ensureBackupDir();
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

    // 모든 항공지식 데이터 조회
    this.app.get('/api/knowledge', async (req, res) => {
      try {
        const data = await this.loadKnowledgeData();
        res.json(data);
      } catch (error) {
        console.error('데이터 로딩 오류:', error);
        res.status(500).json({ error: '데이터를 불러올 수 없습니다' });
      }
    });

    // 특정 요일 데이터 업데이트
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

        await this.updateKnowledgeData(day, { topic, subjects });
        res.json({ success: true, message: '데이터가 업데이트되었습니다' });
      } catch (error) {
        console.error('데이터 업데이트 오류:', error);
        res.status(500).json({ error: '데이터를 업데이트할 수 없습니다' });
      }
    });

    // 백업 생성
    this.app.post('/api/knowledge/backup', async (req, res) => {
      try {
        const filename = await this.createBackup();
        res.json({ success: true, filename });
      } catch (error) {
        console.error('백업 생성 오류:', error);
        res.status(500).json({ error: '백업을 생성할 수 없습니다' });
      }
    });

    // 백업 복원
    this.app.post('/api/knowledge/restore', this.upload.single('backup'), async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: '백업 파일이 필요합니다' });
        }

        await this.restoreBackup(req.file.path);
        
        // 임시 파일 삭제
        await fs.unlink(req.file.path);
        
        res.json({ success: true, message: '백업이 복원되었습니다' });
      } catch (error) {
        console.error('백업 복원 오류:', error);
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
  }

  async loadKnowledgeData() {
    try {
      // aviationKnowledge.js 파일에서 데이터 추출
      const fileContent = await fs.readFile(this.dataFile, 'utf8');
      
      // aviationKnowledge 객체 추출을 위한 정규식
      const dataMatch = fileContent.match(/const aviationKnowledge = ({[\s\S]*?});/);
      if (!dataMatch) {
        throw new Error('aviationKnowledge 데이터를 찾을 수 없습니다');
      }

      // JavaScript 객체를 JSON으로 변환하기 위해 eval 사용 (보안에 주의)
      const aviationKnowledge = eval(`(${dataMatch[1]})`);
      return aviationKnowledge;
    } catch (error) {
      console.error('데이터 로딩 실패:', error);
      throw error;
    }
  }

  async updateKnowledgeData(day, newData) {
    try {
      const currentData = await this.loadKnowledgeData();
      currentData[day] = newData;

      // 새로운 파일 내용 생성
      const newFileContent = this.generateKnowledgeFile(currentData);
      
      // 파일 업데이트
      await fs.writeFile(this.dataFile, newFileContent, 'utf8');
      
      console.log(`${day}요일 데이터가 업데이트되었습니다`);
    } catch (error) {
      console.error('데이터 업데이트 실패:', error);
      throw error;
    }
  }

  generateKnowledgeFile(data) {
    let fileContent = `// 요일별 항공지식 데이터
const aviationKnowledge = {\n`;

    for (let day = 0; day < 7; day++) {
      const dayData = data[day];
      if (dayData) {
        const dayComment = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'][day];
        
        fileContent += `  ${day}: { // ${dayComment}\n`;
        fileContent += `    topic: "${dayData.topic}",\n`;
        fileContent += `    subjects: [\n`;
        
        dayData.subjects.forEach(subject => {
          fileContent += `      "${subject}",\n`;
        });
        
        fileContent += `    ]\n`;
        fileContent += `  },\n`;
      }
    }

    fileContent += `};

class AviationKnowledgeManager {
  static getKnowledgeByDay(dayOfWeek) {
    return aviationKnowledge[dayOfWeek];
  }

  static getRandomSubject(dayOfWeek) {
    const knowledge = this.getKnowledgeByDay(dayOfWeek);
    return knowledge.subjects[Math.floor(Math.random() * knowledge.subjects.length)];
  }

  static getAllTopics() {
    return Object.values(aviationKnowledge).map(k => k.topic);
  }

  static getWeeklySchedule() {
    const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    return days.map((day, index) => ({
      day,
      topic: aviationKnowledge[index].topic
    }));
  }
}

module.exports = { aviationKnowledge, AviationKnowledgeManager };`;

    return fileContent;
  }

  async createBackup() {
    try {
      const data = await this.loadKnowledgeData();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `aviation-knowledge-${timestamp}.json`;
      const filePath = path.join(this.backupDir, filename);
      
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
      
      console.log(`백업 파일 생성됨: ${filename}`);
      return filename;
    } catch (error) {
      console.error('백업 생성 실패:', error);
      throw error;
    }
  }

  async restoreBackup(backupFilePath) {
    try {
      const backupContent = await fs.readFile(backupFilePath, 'utf8');
      const backupData = JSON.parse(backupContent);
      
      // 데이터 유효성 검증
      const validation = this.validateDataStructure(backupData);
      if (!validation.valid) {
        throw new Error(`유효하지 않은 백업 데이터: ${validation.errors.join(', ')}`);
      }

      // 파일 업데이트
      const newFileContent = this.generateKnowledgeFile(backupData);
      await fs.writeFile(this.dataFile, newFileContent, 'utf8');
      
      console.log('백업 데이터로 복원되었습니다');
    } catch (error) {
      console.error('백업 복원 실패:', error);
      throw error;
    }
  }

  async validateData() {
    try {
      const data = await this.loadKnowledgeData();
      return this.validateDataStructure(data);
    } catch (error) {
      return {
        valid: false,
        errors: [`데이터 로딩 실패: ${error.message}`]
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