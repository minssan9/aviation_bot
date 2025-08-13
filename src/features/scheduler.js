const cron = require('node-cron');
const SimpleWeatherService = require('../services/simpleWeatherService');

class Scheduler {
  constructor(bot, subscriberManager, messageGenerator) {
    this.bot = bot;
    this.subscriberManager = subscriberManager;
    this.messageGenerator = messageGenerator;
    this.simpleWeatherService = new SimpleWeatherService();
    this.jobs = [];
  }

  /**
   * Markdown을 HTML로 변환
   */
  convertToHtml(text) {
    if (!text) return text;
    
    let html = text;
    
    // **bold** -> <b>bold</b>
    html = html.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    
    // *italic* -> <i>italic</i>
    html = html.replace(/\*(.*?)\*/g, '<i>$1</i>');
    
    // `code` -> <code>code</code>
    html = html.replace(/`(.*?)`/g, '<code>$1</code>');
    
    // [text](url) -> <a href="url">text</a>
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    
    return html;
  }

  /**
   * 메시지를 안전하게 전송 (Markdown 파싱 오류 방지)
   */
  async sendSafeMessage(chatId, message) {
    try {
      // HTML 태그로 변환
      const htmlMessage = this.convertToHtml(message);
      
      return await this.bot.sendMessage(chatId, htmlMessage, { parse_mode: 'HTML' });
    } catch (error) {
      console.error('Message sending failed, trying without parse mode:', error);
      
      // HTML 파싱 실패시 일반 텍스트로 재시도
      try {
        return await this.bot.sendMessage(chatId, message, { parse_mode: undefined });
      } catch (secondError) {
        console.error('Second attempt failed:', secondError);
        // 최후의 수단: 메시지를 분할하여 전송
        return await this.sendSplitMessage(chatId, message);
      }
    }
  }

  /**
   * 긴 메시지를 분할하여 전송
   */
  async sendSplitMessage(chatId, message) {
    const maxLength = 4000; // Telegram 메시지 최대 길이
    
    if (message.length <= maxLength) {
      return await this.bot.sendMessage(chatId, message);
    }
    
    // 메시지를 줄 단위로 분할
    const lines = message.split('\n');
    let currentMessage = '';
    const messages = [];
    
    for (const line of lines) {
      if ((currentMessage + line + '\n').length > maxLength) {
        if (currentMessage.trim()) {
          messages.push(currentMessage.trim());
        }
        currentMessage = line + '\n';
      } else {
        currentMessage += line + '\n';
      }
    }
    
    if (currentMessage.trim()) {
      messages.push(currentMessage.trim());
    }
    
    // 분할된 메시지들을 순차적으로 전송
    const results = [];
    for (const msg of messages) {
      try {
        const result = await this.bot.sendMessage(chatId, msg);
        results.push(result);
      } catch (error) {
        console.error('Failed to send split message part:', error);
      }
    }
    
    return results[0]; // 첫 번째 메시지 결과 반환
  }

  async start() {
    console.log('📅 스케줄러 시작: 오전 9시, 오후 2시, 저녁 8시 (KST)');
    
    // SimpleWeatherService 초기화
    try {
      await this.simpleWeatherService.initialize();
    } catch (error) {
      console.error('❌ SimpleWeatherService 초기화 실패:', error);
    }
    
    // 위성사진 수집 (매 10분마다)
    const weatherImageJob = cron.schedule('*/10 * * * *', async () => {
      await this.collectWeatherImages();
    }, {
      scheduled: false,
      timezone: "Asia/Seoul"
    });

    // 위성사진 정리 (매일 새벽 3시 - 일주일 이상 된 파일)
    const cleanupJob = cron.schedule('0 3 * * *', async () => {
      await this.cleanupWeatherImages();
    }, {
      scheduled: false,
      timezone: "Asia/Seoul"
    });
    
    // 오전 9시 알림
    const morningJob = cron.schedule('0 9 * * *', async () => {
      await this.sendScheduledMessage('morning');
    }, {
      scheduled: false,
      timezone: "Asia/Seoul"
    });

    // 오후 2시 알림  
    const afternoonJob = cron.schedule('0 14 * * *', async () => {
      await this.sendScheduledMessage('afternoon');
    }, {
      scheduled: false,
      timezone: "Asia/Seoul"
    });

    // 저녁 8시 알림
    const eveningJob = cron.schedule('0 20 * * *', async () => {
      await this.sendScheduledMessage('evening');
    }, {
      scheduled: false,
      timezone: "Asia/Seoul"
    });

    this.jobs.push(
      { name: 'weather-images', job: weatherImageJob },
      { name: 'cleanup', job: cleanupJob },
      { name: 'morning', job: morningJob },
      { name: 'afternoon', job: afternoonJob },
      { name: 'evening', job: eveningJob }
    );

    // Start all jobs
    this.jobs.forEach(({ name, job }) => {
      job.start();
      console.log(`✅ ${name} 스케줄 활성화됨`);
    });
  }

  stop() {
    this.jobs.forEach(({ name, job }) => {
      job.stop();
      console.log(`⏹️ ${name} 스케줄 중지됨`);
    });
    console.log('📅 모든 스케줄이 중지되었습니다');
  }

  async sendScheduledMessage(timeSlot) {
    try {
      console.log(`📢 ${timeSlot} 예정 알림 시작`);
      const message = await this.messageGenerator.generateMessage(timeSlot);
      
      this.subscriberManager.broadcastToAll(async (chatId) => {
        await this.sendSafeMessage(chatId, message);
      });
      
      console.log(`✅ ${timeSlot} 알림 완료`);
    } catch (error) {
      console.error(`❌ ${timeSlot} 알림 오류:`, error);
    }
  }

  /**
   * 위성사진 수집 작업 (API 기반)
   */
  async collectWeatherImages() {
    try {
      console.log('🛰️ 위성사진 수집 작업 시작');
      
      // 1. API 상태 확인
      const status = await this.simpleWeatherService.getStatus();
      if (status.status !== 'available') {
        console.warn(`⚠️ 서비스 상태: ${status.status}`);
        if (status.error) {
          console.warn(`⚠️ 오류: ${status.error}`);
        }
      }
      
      // 2. 최신 이미지 정보 조회
      const imageInfo = await this.simpleWeatherService.getLatestImageUrl();
      if (!imageInfo.success) {
        console.error(`❌ 이미지 URL 조회 실패: ${imageInfo.error}`);
        return { success: false, error: `API 조회 실패: ${imageInfo.error}` };
      }
      
      console.log(`📸 최신 이미지 발견: ${imageInfo.name}`);
      console.log(`📅 타임스탬프: ${imageInfo.timestamp}`);
      
      // 3. 이미지 다운로드
      const result = await this.simpleWeatherService.downloadImage();
      
      if (result.success) {
        const sizeKB = (result.size / 1024).toFixed(1);
        console.log(`✅ 위성사진 수집 완료: ${result.filename} (${sizeKB}KB)`);
        console.log(`📅 수집 시간: ${result.timestamp}`);
        console.log(`📝 이미지명: ${result.name}`);
      } else {
        console.warn(`⚠️ 위성사진 수집 실패: ${result.error}`);
      }
      
      return result;
    } catch (error) {
      console.error('❌ 위성사진 수집 오류:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 오래된 위성사진 정리 작업 (API 기반)
   */
  async cleanupWeatherImages() {
    try {
      console.log('🧹 위성사진 정리 작업 시작');
      
      // 1. 현재 저장된 이미지 목록 확인
      const currentImages = await this.simpleWeatherService.getStoredImages(10);
      console.log(`📁 현재 저장된 이미지: ${currentImages.length}개`);
      
      // 2. 이미지 정리 (7일 보관)
      const deletedCount = await this.simpleWeatherService.cleanup(7);
      
      if (deletedCount > 0) {
        console.log(`✅ 위성사진 정리 완료: ${deletedCount}개 파일 삭제`);
        
        // 3. 정리 후 이미지 목록 확인
        const remainingImages = await this.simpleWeatherService.getStoredImages(5);
        console.log(`📁 정리 후 남은 이미지: ${remainingImages.length}개`);
        
        if (remainingImages.length > 0) {
          console.log('📋 최근 이미지들:');
          remainingImages.slice(0, 3).forEach((img, index) => {
            const sizeKB = (img.size / 1024).toFixed(1);
            console.log(`  ${index + 1}. ${img.filename} (${sizeKB}KB)`);
          });
        }
      } else {
        console.log('ℹ️ 삭제할 오래된 파일이 없습니다');
      }
      
      return deletedCount;
    } catch (error) {
      console.error('❌ 위성사진 정리 오류:', error);
      return 0;
    }
  }

  /**
   * 수동 위성사진 수집 (테스트용)
   */
  async manualWeatherImageCollection() {
    console.log('🔧 수동 위성사진 수집 실행');
    
    try {
      // 1. 서비스 상태 확인
      console.log('📊 서비스 상태 확인 중...');
      const status = await this.simpleWeatherService.getStatus();
      console.log('📈 상태:', JSON.stringify(status, null, 2));
      
      // 2. 최신 이미지 정보 미리보기
      console.log('🔍 최신 이미지 정보 조회 중...');
      const imageInfo = await this.simpleWeatherService.getLatestImageUrl();
      if (imageInfo.success) {
        console.log('📸 최신 이미지 정보:', JSON.stringify(imageInfo, null, 2));
      }
      
      // 3. 수집 실행
      return await this.collectWeatherImages();
    } catch (error) {
      console.error('❌ 수동 수집 중 오류:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 저장된 위성사진 목록 조회 (API 기반)
   */
  async getStoredWeatherImages(limit = 20) {
    try {
      console.log(`📁 저장된 위성사진 목록 조회 (최대 ${limit}개)`);
      
      const images = await this.simpleWeatherService.getStoredImages(limit);
      
      if (images.length > 0) {
        console.log(`✅ ${images.length}개 이미지 발견`);
        
        // 상세 정보 출력
        images.slice(0, 5).forEach((img, index) => {
          const sizeKB = (img.size / 1024).toFixed(1);
          const created = new Date(img.created).toLocaleString('ko-KR');
          console.log(`  ${index + 1}. ${img.filename} (${sizeKB}KB) - ${created}`);
        });
        
        if (images.length > 5) {
          console.log(`  ... 외 ${images.length - 5}개 더`);
        }
      } else {
        console.log('ℹ️ 저장된 이미지가 없습니다');
      }
      
      return images;
    } catch (error) {
      console.error('❌ 위성사진 목록 조회 오류:', error);
      return [];
    }
  }

  getJobStatus() {
    return this.jobs.map(({ name, job }) => ({
      name,
      isRunning: job.running
    }));
  }
}

module.exports = Scheduler;