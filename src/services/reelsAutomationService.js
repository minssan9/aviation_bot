const EnglishContentService = require('./englishContentService');
const MediaGeneratorService = require('./mediaGeneratorService');
const InstagramService = require('./instagramService');
const path = require('path');
const fs = require('fs').promises;

class ReelsAutomationService {
  constructor(config) {
    this.config = config;
    this.contentService = new EnglishContentService(config);
    this.mediaService = new MediaGeneratorService();
    this.instagramService = new InstagramService(config);
    this.logDir = path.join(__dirname, '../../logs');
    this.ensureDirectories();
  }

  async ensureDirectories() {
    try {
      await fs.mkdir(this.logDir, { recursive: true });
    } catch (error) {
      console.warn('Failed to create log directory:', error.message);
    }
  }

  async generateAndPostDaily() {
    const startTime = Date.now();
    const logData = {
      timestamp: new Date().toISOString(),
      status: 'started',
      steps: []
    };

    try {
      console.log('🚀 Starting daily Reels automation...');
      
      // Step 1: Generate content
      logData.steps.push({ step: 'content_generation', status: 'started', timestamp: new Date().toISOString() });
      const contentData = await this.contentService.generateDailyContent();
      logData.steps[0].status = 'completed';
      logData.steps[0].word = contentData.word;
      console.log('✅ Content generated for word:', contentData.word);

      // Step 2: Generate image
      logData.steps.push({ step: 'image_generation', status: 'started', timestamp: new Date().toISOString() });
      const imagePath = await this.mediaService.generateImage(contentData.content);
      logData.steps[1].status = 'completed';
      logData.steps[1].imagePath = imagePath;
      console.log('✅ Image generated:', imagePath);

      // Step 3: Generate video
      logData.steps.push({ step: 'video_generation', status: 'started', timestamp: new Date().toISOString() });
      const videoPath = await this.mediaService.generateVideo(imagePath);
      logData.steps[2].status = 'completed';
      logData.steps[2].videoPath = videoPath;
      console.log('✅ Video generated:', videoPath);

      // Step 4: Upload to Instagram
      logData.steps.push({ step: 'instagram_upload', status: 'started', timestamp: new Date().toISOString() });
      const caption = this._buildInstagramCaption(contentData);
      const uploadResult = await this.instagramService.uploadVideo(videoPath, caption);
      logData.steps[3].status = 'completed';
      logData.steps[3].postId = uploadResult.postId;
      console.log('✅ Posted to Instagram:', uploadResult.postId);

      // Step 5: Cleanup temporary files
      logData.steps.push({ step: 'cleanup', status: 'started', timestamp: new Date().toISOString() });
      await this.mediaService.cleanup(imagePath);
      await this.mediaService.cleanup(videoPath);
      logData.steps[4].status = 'completed';
      console.log('✅ Temporary files cleaned up');

      // Final status
      const duration = Date.now() - startTime;
      logData.status = 'completed';
      logData.duration = duration;
      logData.postId = uploadResult.postId;

      console.log(`🎉 Daily Reels automation completed successfully in ${duration}ms`);
      
      await this._logExecution(logData);
      
      return {
        success: true,
        word: contentData.word,
        postId: uploadResult.postId,
        duration,
        logData
      };

    } catch (error) {
      console.error('❌ Daily Reels automation failed:', error);
      
      logData.status = 'failed';
      logData.error = error.message;
      logData.duration = Date.now() - startTime;
      
      await this._logExecution(logData);
      
      // Attempt cleanup on failure
      try {
        if (logData.steps[1] && logData.steps[1].imagePath) {
          await this.mediaService.cleanup(logData.steps[1].imagePath);
        }
        if (logData.steps[2] && logData.steps[2].videoPath) {
          await this.mediaService.cleanup(logData.steps[2].videoPath);
        }
      } catch (cleanupError) {
        console.warn('Failed to cleanup after error:', cleanupError.message);
      }
      
      throw error;
    }
  }

  async generateCustomReel(word) {
    const startTime = Date.now();
    const logData = {
      timestamp: new Date().toISOString(),
      status: 'started',
      type: 'custom',
      customWord: word,
      steps: []
    };

    try {
      console.log('🚀 Starting custom Reels generation for word:', word);
      
      // Generate content for specific word
      logData.steps.push({ step: 'content_generation', status: 'started', timestamp: new Date().toISOString() });
      const contentData = await this.contentService.generateContent(word);
      logData.steps[0].status = 'completed';
      console.log('✅ Custom content generated');

      // Generate media
      logData.steps.push({ step: 'image_generation', status: 'started', timestamp: new Date().toISOString() });
      const imagePath = await this.mediaService.generateImage(contentData.content);
      logData.steps[1].status = 'completed';
      logData.steps[1].imagePath = imagePath;

      logData.steps.push({ step: 'video_generation', status: 'started', timestamp: new Date().toISOString() });
      const videoPath = await this.mediaService.generateVideo(imagePath);
      logData.steps[2].status = 'completed';
      logData.steps[2].videoPath = videoPath;

      const duration = Date.now() - startTime;
      logData.status = 'completed';
      logData.duration = duration;
      
      console.log(`✅ Custom Reel generated successfully in ${duration}ms`);
      
      await this._logExecution(logData);
      
      return {
        success: true,
        word: contentData.word,
        imagePath,
        videoPath,
        content: contentData.content,
        duration
      };

    } catch (error) {
      console.error('❌ Custom Reels generation failed:', error);
      
      logData.status = 'failed';
      logData.error = error.message;
      logData.duration = Date.now() - startTime;
      
      await this._logExecution(logData);
      throw error;
    }
  }

  async scheduleDaily(hour = 9, minute = 0) {
    const cron = require('node-cron');
    
    // Schedule daily at specified time (KST)
    const cronExpression = `${minute} ${hour} * * *`;
    
    console.log(`📅 Scheduling daily Reels automation at ${hour}:${minute.toString().padStart(2, '0')} KST`);
    
    cron.schedule(cronExpression, async () => {
      console.log('⏰ Executing scheduled Reels automation...');
      try {
        await this.generateAndPostDaily();
      } catch (error) {
        console.error('❌ Scheduled Reels automation failed:', error);
        
        // Send notification or alert here
        await this._notifyError(error);
      }
    }, {
      timezone: "Asia/Seoul"
    });
  }

  _buildInstagramCaption(contentData) {
    const lines = contentData.content.split('\n');
    const word = contentData.word;
    
    // Extract key parts for caption
    let caption = `📚 오늘의 영어 단어: ${word}\n\n`;
    
    // Add definition (first meaningful line after word)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.length > 10 && line.includes('의미') && line.includes('✨')) {
        caption += line + '\n\n';
        break;
      }
    }
    
    // Add call to action
    caption += '더 많은 영어 학습 콘텐츠는 en9door.com에서! 📖\n\n';
    
    // Add hashtags
    caption += contentData.hashtags.join(' ') + ' #dailyenglish #englishlearning #reels';
    
    return caption;
  }

  async _logExecution(logData) {
    const logFile = path.join(this.logDir, `reels_automation_${new Date().toISOString().split('T')[0]}.json`);
    
    try {
      let existingLogs = [];
      try {
        const existingData = await fs.readFile(logFile, 'utf8');
        existingLogs = JSON.parse(existingData);
      } catch (readError) {
        // File doesn't exist or is invalid, start with empty array
      }
      
      existingLogs.push(logData);
      
      await fs.writeFile(logFile, JSON.stringify(existingLogs, null, 2));
    } catch (error) {
      console.warn('Failed to write execution log:', error.message);
    }
  }

  async _notifyError(error) {
    // This could be extended to send notifications via Telegram, email, etc.
    console.error('🚨 Reels Automation Error Notification:', {
      error: error.message,
      timestamp: new Date().toISOString(),
      stack: error.stack
    });
  }

  async getExecutionLogs(days = 7) {
    const logs = [];
    const today = new Date();
    
    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0];
      const logFile = path.join(this.logDir, `reels_automation_${dateString}.json`);
      
      try {
        const data = await fs.readFile(logFile, 'utf8');
        const dayLogs = JSON.parse(data);
        logs.push(...dayLogs);
      } catch (error) {
        // No log file for this day, continue
      }
    }
    
    return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  async validateSetup() {
    const checks = [];
    
    // Check Instagram token
    try {
      const tokenValid = await this.instagramService.validateToken();
      checks.push({
        service: 'Instagram API',
        status: tokenValid ? 'valid' : 'invalid',
        details: tokenValid
      });
    } catch (error) {
      checks.push({
        service: 'Instagram API',
        status: 'error',
        error: error.message
      });
    }
    
    // Check directories
    try {
      await this.ensureDirectories();
      checks.push({
        service: 'Directory Structure',
        status: 'valid'
      });
    } catch (error) {
      checks.push({
        service: 'Directory Structure',
        status: 'error',
        error: error.message
      });
    }
    
    // Check Gemini API (via content service)
    try {
      await this.contentService.generateContent('test');
      checks.push({
        service: 'Gemini API',
        status: 'valid'
      });
    } catch (error) {
      checks.push({
        service: 'Gemini API',
        status: 'error',
        error: error.message
      });
    }
    
    return checks;
  }
}

module.exports = ReelsAutomationService;