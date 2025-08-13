const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const config = require('../config');

/**
 * 단순화된 기상청 KO 위성사진 수집 서비스
 * 한반도 지역 RGB True Color 이미지만 수집
 */
class SimpleWeatherService {
  constructor() {
    this.baseUrl = 'https://www.weather.go.kr/w/repositary/image/sat/gk2a/KO';
    this.baseImageDir = path.join(config.BASE_PATH, 'data/weather-images');
    this.timeout = 30000;
    this.maxRetries = 3;
  }

  /**
   * 서비스 초기화
   */
  async initialize() {
    await fs.mkdir(this.baseImageDir, { recursive: true });
    console.log('✅ SimpleWeatherService 초기화 완료');
  }

  /**
   * GK2A 시간 포맷 생성 (10분 간격)
   */
  generateTimestamp(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minutes = Math.floor(date.getMinutes() / 10) * 10;
    const minute = String(minutes).padStart(2, '0');
    
    return `${year}${month}${day}${hour}${minute}`;
  }

  /**
   * 기상청 API에서 최신 이미지 URL 가져오기
   */
  async getLatestImageUrl() {
    try {
      const apiUrl = 'https://www.weather.go.kr/w/wnuri-img/rest/sat/images/gk2a.do';
      
      console.log('🔍 기상청 API에서 이미지 목록 조회 중...');
      
      const response = await axios({
        method: 'GET',
        url: apiUrl,
        timeout: this.timeout,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'ko-KR,ko;q=0.9',
          'Referer': 'https://www.weather.go.kr/'
        }
      });

      if (response.status === 200 && response.data) {
        const images = response.data;
        
        if (Array.isArray(images) && images.length > 0) {
          // 마지막 항목이 가장 최신 이미지
          const latestImage = images[images.length - 1];
          
          console.log(`✅ 최신 이미지 발견: ${latestImage.name}`);
          console.log(`📅 타임스탬프: ${latestImage.tm}`);
          console.log(`🔗 상대 URL: ${latestImage.url}`);
          
          // 전체 URL 생성
          const fullUrl = `https://www.weather.go.kr${latestImage.url}`;
          
          return {
            success: true,
            url: fullUrl,
            timestamp: latestImage.tm,
            name: latestImage.name
          };
        } else {
          throw new Error('API 응답에 이미지 데이터가 없습니다');
        }
      } else {
        throw new Error(`API 응답 오류: ${response.status}`);
      }
      
    } catch (error) {
      console.error('❌ 기상청 API 조회 실패:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 파일명 생성 (API 타임스탬프 기반)
   */
  generateFilename(timestamp) {
    return `kma_ko_rgb_${timestamp}.png`;
  }

  /**
   * 이미지 다운로드
   */
  async downloadImage() {
    // 1. 기상청 API에서 최신 이미지 URL 가져오기
    const imageInfo = await this.getLatestImageUrl();
    
    if (!imageInfo.success) {
      return {
        success: false,
        error: `API 조회 실패: ${imageInfo.error}`,
        timestamp: null,
        url: null
      };
    }

    const { url, timestamp, name } = imageInfo;
    const filename = this.generateFilename(timestamp);
    const filepath = path.join(this.baseImageDir, filename);

    let attempt = 0;
    while (attempt < this.maxRetries) {
      try {
        console.log(`📥 이미지 다운로드 시도 ${attempt + 1}/${this.maxRetries}: ${filename}`);
        console.log(`🔗 다운로드 URL: ${url}`);
        
        const response = await axios({
          method: 'GET',
          url: url,
          responseType: 'arraybuffer',
          timeout: this.timeout,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'image/png,image/*,*/*;q=0.8',
            'Accept-Language': 'ko-KR,ko;q=0.9',
            'Referer': 'https://www.weather.go.kr/'
          }
        });

        if (response.status === 200 && response.data.length > 5000) {
          // PNG 헤더 검증
          const isPNG = response.data[0] === 0x89 && 
                       response.data[1] === 0x50 && 
                       response.data[2] === 0x4E && 
                       response.data[3] === 0x47;
          
          if (!isPNG) {
            throw new Error('Not a valid PNG file');
          }

          await fs.writeFile(filepath, response.data);
          const sizeKB = (response.data.length / 1024).toFixed(1);
          
          console.log(`✅ 이미지 저장 성공: ${filename} (${sizeKB}KB)`);
          console.log(`📅 타임스탬프: ${timestamp}`);
          console.log(`📝 이미지명: ${name}`);
          
          return {
            success: true,
            filename,
            filepath,
            size: response.data.length,
            timestamp,
            url,
            name
          };
        } else {
          throw new Error(`Invalid response: status ${response.status}, size ${response.data.length}`);
        }

      } catch (error) {
        attempt++;
        console.error(`❌ 다운로드 실패 (${attempt}/${this.maxRetries}):`, error.message);
        
        if (attempt >= this.maxRetries) {
          return {
            success: false,
            filename,
            error: error.message,
            timestamp,
            url
          };
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
      }
    }
  }

  /**
   * 오래된 이미지 정리
   */
  async cleanup(daysToKeep = 7) {
    try {
      const files = await fs.readdir(this.baseImageDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      let deletedCount = 0;
      
      for (const file of files) {
        if (file.startsWith('kma_ko_rgb_')) {
          const filepath = path.join(this.baseImageDir, file);
          const stats = await fs.stat(filepath);
          
          if (stats.mtime < cutoffDate) {
            await fs.unlink(filepath);
            deletedCount++;
            console.log(`🗑️ 삭제: ${file}`);
          }
        }
      }

      console.log(`🧹 정리 완료: ${deletedCount}개 파일 삭제`);
      return deletedCount;
    } catch (error) {
      console.error('❌ 정리 오류:', error);
      return 0;
    }
  }

  /**
   * 저장된 이미지 목록
   */
  async getStoredImages(limit = 20) {
    try {
      const files = await fs.readdir(this.baseImageDir);
      const imageFiles = files
        .filter(file => file.startsWith('kma_ko_rgb_') && file.endsWith('.png'))
        .sort((a, b) => b.localeCompare(a))
        .slice(0, limit);

      const results = [];
      for (const file of imageFiles) {
        const filepath = path.join(this.baseImageDir, file);
        const stats = await fs.stat(filepath);
        
        results.push({
          filename: file,
          filepath,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime
        });
      }

      return results;
    } catch (error) {
      console.error('❌ 목록 조회 오류:', error);
      return [];
    }
  }

  /**
   * 서비스 상태 확인
   */
  async getStatus() {
    try {
      // API 상태 확인
      const imageInfo = await this.getLatestImageUrl();
      
      if (imageInfo.success) {
        // 실제 이미지 URL 접근 가능 여부 확인
        try {
          const response = await axios.head(imageInfo.url, { timeout: 10000 });
          return {
            status: 'available',
            currentTimestamp: imageInfo.timestamp,
            testUrl: imageInfo.url,
            responseStatus: response.status,
            imageName: imageInfo.name
          };
        } catch (error) {
          return {
            status: 'api_available_image_unavailable',
            currentTimestamp: imageInfo.timestamp,
            testUrl: imageInfo.url,
            error: error.message,
            imageName: imageInfo.name
          };
        }
      } else {
        return {
          status: 'unavailable',
          currentTimestamp: null,
          testUrl: null,
          error: imageInfo.error
        };
      }
    } catch (error) {
      return {
        status: 'unavailable',
        currentTimestamp: null,
        testUrl: null,
        error: error.message
      };
    }
  }
}

module.exports = SimpleWeatherService;