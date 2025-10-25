const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const WeatherImageDTO = require('../dtos/WeatherImageDTO');

/**
 * Business logic service for Weather operations
 * Implements weather data collection and management
 */
class WeatherService {
  constructor(config, weatherImageRepository = null) {
    this.config = config;
    this.weatherImageRepository = weatherImageRepository;
    this.baseUrl = 'https://www.weather.go.kr/w/repositary/image/sat/gk2a/KO';
    this.baseImageDir = path.join(config.BASE_PATH, 'data/weather-images');
    this.timeout = 30000;
    this.maxRetries = 3;
  }

  /**
   * Get latest weather image
   * @returns {Promise<Object>} Latest weather image data
   */
  async getLatestWeatherImage() {
    try {
      const imageData = await this._fetchLatestImage();
      return {
        success: true,
        data: imageData
      };
    } catch (error) {
      console.error('Error getting latest weather image:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Download and save weather image
   * @param {Object} options - Download options
   * @returns {Promise<Object>} Download result
   */
  async downloadWeatherImage(options = {}) {
    try {
      const { imageType = 'satellite', date = null } = options;
      
      // Ensure directory exists
      await this._ensureDirectoryExists();
      
      // Fetch image data
      const imageData = await this._fetchImageData(imageType, date);
      
      // Save to file system
      const filePath = await this._saveImageToFile(imageData, imageType);
      
      // Save to database if repository is available
      if (this.weatherImageRepository) {
        await this._saveToDatabase(imageData, filePath, imageType);
      }
      
      return {
        success: true,
        filePath,
        imageData
      };
    } catch (error) {
      console.error('Error downloading weather image:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get weather images by date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Array of weather images
   */
  async getWeatherImagesByDateRange(startDate, endDate) {
    try {
      if (!this.weatherImageRepository) {
        throw new Error('Weather image repository not available');
      }

      const images = await this.weatherImageRepository.findByDateRange(startDate, endDate);
      return images.map(image => WeatherImageDTO.fromDatabase(image));
    } catch (error) {
      console.error('Error getting weather images by date range:', error);
      throw new Error('Failed to retrieve weather images');
    }
  }

  /**
   * Get weather image by ID
   * @param {number} id - Image ID
   * @returns {Promise<WeatherImageDTO>} Weather image DTO
   */
  async getWeatherImageById(id) {
    try {
      if (!this.weatherImageRepository) {
        throw new Error('Weather image repository not available');
      }

      const image = await this.weatherImageRepository.findById(id);
      if (!image) {
        throw new Error('Weather image not found');
      }
      return WeatherImageDTO.fromDatabase(image);
    } catch (error) {
      console.error(`Error getting weather image ${id}:`, error);
      throw error;
    }
  }

  /**
   * Clean up old weather images
   * @param {number} daysToKeep - Number of days to keep
   * @returns {Promise<Object>} Cleanup result
   */
  async cleanupOldImages(daysToKeep = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      // Clean up database records
      if (this.weatherImageRepository) {
        await this.weatherImageRepository.deleteByDateRange(null, cutoffDate);
      }

      // Clean up file system
      const files = await fs.readdir(this.baseImageDir);
      let deletedCount = 0;

      for (const file of files) {
        const filePath = path.join(this.baseImageDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime < cutoffDate) {
          await fs.unlink(filePath);
          deletedCount++;
        }
      }

      return {
        success: true,
        deletedCount,
        cutoffDate
      };
    } catch (error) {
      console.error('Error cleaning up old images:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get weather service statistics
   * @returns {Promise<Object>} Service statistics
   */
  async getWeatherStats() {
    try {
      if (!this.weatherImageRepository) {
        return {
          totalImages: 0,
          message: 'Database repository not available'
        };
      }

      const stats = await this.weatherImageRepository.getStats();
      return stats;
    } catch (error) {
      console.error('Error getting weather statistics:', error);
      throw new Error('Failed to retrieve weather statistics');
    }
  }

  /**
   * Fetch latest image data from weather service
   * @returns {Promise<Object>} Image data
   * @private
   */
  async _fetchLatestImage() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');

    const filename = `kma_ko_rgb_${year}${month}${day}_${hour}${minute}.png`;
    const url = `${this.baseUrl}/${filename}`;

    try {
      const response = await axios.get(url, {
        timeout: this.timeout,
        responseType: 'arraybuffer'
      });

      return {
        filename,
        url,
        data: response.data,
        contentType: response.headers['content-type'],
        size: response.data.length
      };
    } catch (error) {
      throw new Error(`Failed to fetch weather image: ${error.message}`);
    }
  }

  /**
   * Fetch image data with retry logic
   * @param {string} imageType - Type of image
   * @param {Date} date - Specific date
   * @returns {Promise<Object>} Image data
   * @private
   */
  async _fetchImageData(imageType, date) {
    let lastError;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await this._fetchLatestImage();
      } catch (error) {
        lastError = error;
        console.warn(`Attempt ${attempt} failed:`, error.message);
        
        if (attempt < this.maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Save image to file system
   * @param {Object} imageData - Image data
   * @param {string} imageType - Type of image
   * @returns {Promise<string>} File path
   * @private
   */
  async _saveImageToFile(imageData, imageType) {
    const filename = imageData.filename;
    const filePath = path.join(this.baseImageDir, filename);
    
    await fs.writeFile(filePath, imageData.data);
    return filePath;
  }

  /**
   * Save image metadata to database
   * @param {Object} imageData - Image data
   * @param {string} filePath - File path
   * @param {string} imageType - Type of image
   * @returns {Promise<number>} Database record ID
   * @private
   */
  async _saveToDatabase(imageData, filePath, imageType) {
    const stats = await fs.stat(filePath);
    
    const imageRecord = {
      filename: imageData.filename,
      filePath,
      imageType,
      capturedAt: new Date().toISOString(),
      fileSize: stats.size,
      dimensions: null, // Could be extracted from image data
      metadata: {
        url: imageData.url,
        contentType: imageData.contentType,
        downloadTime: new Date().toISOString()
      }
    };

    return await this.weatherImageRepository.create(imageRecord);
  }

  /**
   * Ensure directory exists
   * @returns {Promise<void>}
   * @private
   */
  async _ensureDirectoryExists() {
    try {
      await fs.access(this.baseImageDir);
    } catch (error) {
      await fs.mkdir(this.baseImageDir, { recursive: true });
    }
  }
}

module.exports = WeatherService;
