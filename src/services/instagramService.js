const axios = require('axios');

class InstagramService {
  constructor(config) {
    this.accessToken = config.INSTAGRAM_ACCESS_TOKEN;
    this.pageId = config.INSTAGRAM_PAGE_ID;
    this.baseUrl = 'https://graph.facebook.com/v18.0';
  }

  async uploadVideo(videoPath, caption) {
    try {
      // Step 1: Create video container
      const containerResponse = await this._createVideoContainer(videoPath, caption);
      const containerId = containerResponse.id;
      
      // Step 2: Check upload status
      await this._waitForUploadCompletion(containerId);
      
      // Step 3: Publish the video
      const publishResponse = await this._publishVideo(containerId);
      
      return {
        success: true,
        postId: publishResponse.id,
        containerId
      };
    } catch (error) {
      console.error('Instagram upload failed:', error);
      throw error;
    }
  }

  async _createVideoContainer(videoPath, caption) {
    const fs = require('fs');
    const FormData = require('form-data');
    
    const formData = new FormData();
    formData.append('media_type', 'REELS');
    formData.append('video_url', videoPath); // URL to video file
    formData.append('caption', caption);
    
    const response = await axios.post(
      `${this.baseUrl}/${this.pageId}/media`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${this.accessToken}`
        },
        timeout: 30000
      }
    );
    
    return response.data;
  }

  async _waitForUploadCompletion(containerId, maxRetries = 30) {
    for (let i = 0; i < maxRetries; i++) {
      const status = await this._checkUploadStatus(containerId);
      
      if (status.status_code === 'FINISHED') {
        return true;
      } else if (status.status_code === 'ERROR') {
        throw new Error(`Upload failed: ${status.error_message}`);
      }
      
      // Wait 10 seconds before next check
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
    
    throw new Error('Upload timeout: Video processing took too long');
  }

  async _checkUploadStatus(containerId) {
    const response = await axios.get(
      `${this.baseUrl}/${containerId}`,
      {
        params: {
          fields: 'status_code,error_message',
          access_token: this.accessToken
        }
      }
    );
    
    return response.data;
  }

  async _publishVideo(containerId) {
    const response = await axios.post(
      `${this.baseUrl}/${this.pageId}/media_publish`,
      {
        creation_id: containerId,
        access_token: this.accessToken
      }
    );
    
    return response.data;
  }

  async getMediaInsights(mediaId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/${mediaId}/insights`,
        {
          params: {
            metric: 'reach,impressions,likes,comments,shares,video_views',
            access_token: this.accessToken
          }
        }
      );
      
      return response.data.data;
    } catch (error) {
      console.warn('Failed to get media insights:', error.message);
      return null;
    }
  }

  async validateToken() {
    try {
      const response = await axios.get(
        `${this.baseUrl}/me`,
        {
          params: {
            access_token: this.accessToken
          }
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Instagram token validation failed:', error.message);
      return false;
    }
  }
}

module.exports = InstagramService;