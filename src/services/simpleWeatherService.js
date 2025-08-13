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
   * 기존 파일들을 날짜별 디렉토리로 마이그레이션
   */
  async migrateExistingFiles() {
    try {
      console.log('🔄 기존 파일 마이그레이션 시작...');
      
      const files = await fs.readdir(this.baseImageDir);
      const imageFiles = files.filter(file => 
        file.startsWith('kma_ko_rgb_') && file.endsWith('.png')
      );
      
      if (imageFiles.length === 0) {
        console.log('✅ 마이그레이션할 파일이 없습니다.');
        return { migrated: 0, errors: 0 };
      }
      
      console.log(`📄 마이그레이션 대상 파일: ${imageFiles.length}개`);
      
      let migrated = 0;
      let errors = 0;
      
      for (const file of imageFiles) {
        try {
          // 파일명에서 타임스탬프 추출
          const timestampMatch = file.match(/kma_ko_rgb_(\d{12})\.png/);
          if (!timestampMatch) {
            console.log(`⚠️ 타임스탬프 추출 실패: ${file}`);
            errors++;
            continue;
          }
          
          const timestamp = timestampMatch[1];
          const sourcePath = path.join(this.baseImageDir, file);
          const targetDir = await this.createDateDirectory(timestamp);
          const targetPath = path.join(targetDir, file);
          
          // 파일 이동
          await fs.rename(sourcePath, targetPath);
          console.log(`✅ 마이그레이션 완료: ${file} → ${path.relative(this.baseImageDir, targetPath)}`);
          migrated++;
          
        } catch (error) {
          console.error(`❌ 마이그레이션 실패 (${file}):`, error.message);
          errors++;
        }
      }
      
      console.log(`🎉 마이그레이션 완료: ${migrated}개 성공, ${errors}개 실패`);
      return { migrated, errors };
      
    } catch (error) {
      console.error('❌ 마이그레이션 오류:', error);
      return { migrated: 0, errors: 1 };
    }
  }

  /**
   * 서비스 초기화
   */
  async initialize() {
    await fs.mkdir(this.baseImageDir, { recursive: true });
    
    // 기존 파일 마이그레이션 실행
    await this.migrateExistingFiles();
    
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
   * 타임스탬프에서 날짜 정보 추출하여 디렉토리 경로 생성
   */
  parseTimestampToPath(timestamp) {
    // 타임스탬프 형식: YYYYMMDDHHMM (예: 202501131600)
    if (!timestamp || timestamp.length !== 12) {
      throw new Error(`Invalid timestamp format: ${timestamp}`);
    }
    
    const year = timestamp.substring(0, 4);
    const month = timestamp.substring(4, 6);
    const day = timestamp.substring(6, 8);
    
    return path.join(year, month, day);
  }

  /**
   * 타임스탬프 기반 디렉토리 생성
   */
  async createDateDirectory(timestamp) {
    const datePath = this.parseTimestampToPath(timestamp);
    const fullPath = path.join(this.baseImageDir, datePath);
    
    await fs.mkdir(fullPath, { recursive: true });
    return fullPath;
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
    
    // 2. 날짜별 디렉토리 생성
    let dateDirectory;
    try {
      dateDirectory = await this.createDateDirectory(timestamp);
    } catch (error) {
      return {
        success: false,
        error: `디렉토리 생성 실패: ${error.message}`,
        timestamp,
        url
      };
    }
    
    const filepath = path.join(dateDirectory, filename);

    let attempt = 0;
    while (attempt < this.maxRetries) {
      try {
        console.log(`📥 이미지 다운로드 시도 ${attempt + 1}/${this.maxRetries}: ${filename}`);
        console.log(`🔗 다운로드 URL: ${url}`);
        console.log(`📁 저장 경로: ${filepath}`);
        
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
          console.log(`📁 저장 위치: ${filepath}`);
          
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
   * 오래된 이미지 정리 (재귀적으로 날짜별 디렉토리 검색)
   */
  async cleanup(daysToKeep = 7) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      
      let deletedCount = 0;
      let emptyDirectories = [];

      // 재귀적으로 모든 하위 디렉토리 검색
      const processDirectory = async (dirPath) => {
        try {
          const items = await fs.readdir(dirPath);
          
          for (const item of items) {
            const itemPath = path.join(dirPath, item);
            const stats = await fs.stat(itemPath);
            
            if (stats.isDirectory()) {
              // 디렉토리인 경우 재귀적으로 처리
              const subDeleted = await processDirectory(itemPath);
              deletedCount += subDeleted;
              
              // 하위 디렉토리가 비어있는지 확인
              const subItems = await fs.readdir(itemPath);
              if (subItems.length === 0) {
                emptyDirectories.push(itemPath);
              }
            } else if (stats.isFile() && item.startsWith('kma_ko_rgb_') && item.endsWith('.png')) {
              // 이미지 파일인 경우 날짜 확인
              if (stats.mtime < cutoffDate) {
                await fs.unlink(itemPath);
                deletedCount++;
                console.log(`🗑️ 삭제: ${itemPath}`);
              }
            }
          }
          
          return deletedCount;
        } catch (error) {
          console.error(`❌ 디렉토리 처리 오류 (${dirPath}):`, error.message);
          return 0;
        }
      };

      await processDirectory(this.baseImageDir);
      
      // 빈 디렉토리 정리
      for (const emptyDir of emptyDirectories) {
        try {
          await fs.rmdir(emptyDir);
          console.log(`🗑️ 빈 디렉토리 삭제: ${emptyDir}`);
        } catch (error) {
          console.error(`❌ 빈 디렉토리 삭제 실패 (${emptyDir}):`, error.message);
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
   * 저장된 이미지 목록 (재귀적으로 날짜별 디렉토리 검색)
   */
  async getStoredImages(limit = 20) {
    try {
      const allImages = [];

      // 재귀적으로 모든 하위 디렉토리에서 이미지 파일 수집
      const collectImages = async (dirPath) => {
        try {
          const items = await fs.readdir(dirPath);
          
          for (const item of items) {
            const itemPath = path.join(dirPath, item);
            const stats = await fs.stat(itemPath);
            
            if (stats.isDirectory()) {
              // 디렉토리인 경우 재귀적으로 처리
              await collectImages(itemPath);
            } else if (stats.isFile() && item.startsWith('kma_ko_rgb_') && item.endsWith('.png')) {
              // 이미지 파일인 경우 목록에 추가
              allImages.push({
                filename: item,
                filepath: itemPath,
                size: stats.size,
                created: stats.birthtime,
                modified: stats.mtime,
                relativePath: path.relative(this.baseImageDir, itemPath)
              });
            }
          }
        } catch (error) {
          console.error(`❌ 디렉토리 검색 오류 (${dirPath}):`, error.message);
        }
      };

      await collectImages(this.baseImageDir);
      
      // 수정일 기준으로 정렬하고 제한된 개수만 반환
      const sortedImages = allImages
        .sort((a, b) => b.modified.getTime() - a.modified.getTime())
        .slice(0, limit);

      return sortedImages;
    } catch (error) {
      console.error('❌ 목록 조회 오류:', error);
      return [];
    }
  }

  /**
   * 디렉토리 구조 정보 조회
   */
  async getDirectoryStructure() {
    try {
      const structure = {
        basePath: this.baseImageDir,
        totalFiles: 0,
        totalSize: 0,
        directories: {},
        summary: {}
      };

      const processDirectory = async (dirPath, relativePath = '') => {
        try {
          const items = await fs.readdir(dirPath);
          const dirInfo = {
            files: 0,
            size: 0,
            subdirs: {}
          };

          for (const item of items) {
            const itemPath = path.join(dirPath, item);
            const stats = await fs.stat(itemPath);
            
            if (stats.isDirectory()) {
              const subRelativePath = relativePath ? `${relativePath}/${item}` : item;
              dirInfo.subdirs[item] = await processDirectory(itemPath, subRelativePath);
            } else if (stats.isFile() && item.startsWith('kma_ko_rgb_') && item.endsWith('.png')) {
              dirInfo.files++;
              dirInfo.size += stats.size;
              structure.totalFiles++;
              structure.totalSize += stats.size;
            }
          }

          return dirInfo;
        } catch (error) {
          console.error(`❌ 디렉토리 구조 분석 오류 (${dirPath}):`, error.message);
          return { files: 0, size: 0, subdirs: {} };
        }
      };

      structure.directories = await processDirectory(this.baseImageDir);
      
      // 요약 정보 생성
      structure.summary = {
        totalFiles: structure.totalFiles,
        totalSizeMB: (structure.totalSize / (1024 * 1024)).toFixed(2),
        totalSizeGB: (structure.totalSize / (1024 * 1024 * 1024)).toFixed(3),
        directoryCount: Object.keys(structure.directories.subdirs || {}).length
      };

      return structure;
    } catch (error) {
      console.error('❌ 디렉토리 구조 조회 오류:', error);
      return null;
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