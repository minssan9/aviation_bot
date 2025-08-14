const { createCanvas, loadImage, registerFont } = require('canvas');
const fs = require('fs').promises;
const path = require('path');

class MediaGeneratorService {
  constructor() {
    this.width = 1080;
    this.height = 1920;
    this.mediaDir = path.join(__dirname, '../../media');
    this.ensureDirectories();
  }

  async ensureDirectories() {
    const dirs = [
      this.mediaDir,
      path.join(this.mediaDir, 'images'),
      path.join(this.mediaDir, 'videos'),
      path.join(this.mediaDir, 'temp')
    ];
    
    for (const dir of dirs) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        console.warn(`Failed to create directory ${dir}:`, error.message);
      }
    }
  }

  async generateImage(content) {
    const canvas = createCanvas(this.width, this.height);
    const ctx = canvas.getContext('2d');
    
    // Create gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(1, '#764ba2');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);
    
    // Add decorative elements
    this._addDecorations(ctx);
    
    // Parse content
    const { word, pronunciation, definition, examples } = this._parseContent(content);
    
    // Draw main word
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 120px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(word, this.width / 2, 300);
    
    // Draw pronunciation
    if (pronunciation) {
      ctx.font = '48px Arial';
      ctx.fillStyle = '#f0f0f0';
      ctx.fillText(pronunciation, this.width / 2, 380);
    }
    
    // Draw definition
    ctx.font = '42px Arial';
    ctx.fillStyle = '#ffffff';
    this._drawWrappedText(ctx, definition, this.width / 2, 520, 900, 60);
    
    // Draw examples
    let yPos = 800;
    examples.forEach((example, index) => {
      ctx.font = '36px Arial';
      ctx.fillStyle = '#e8f4f8';
      
      // Korean example
      ctx.textAlign = 'left';
      this._drawWrappedText(ctx, example.korean, 100, yPos, 880, 50);
      yPos += 80;
      
      // English example
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px Arial';
      this._drawWrappedText(ctx, example.english, 100, yPos, 880, 50);
      yPos += 120;
    });
    
    // Add footer
    ctx.font = '32px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText('en9door.com', this.width / 2, this.height - 100);
    
    // Save image
    const imagePath = path.join(this.mediaDir, 'images', `${word}_${Date.now()}.png`);
    const buffer = canvas.toBuffer('image/png');
    await fs.writeFile(imagePath, buffer);
    
    return imagePath;
  }

  async generateVideo(imagePath, audioPath = null) {
    const ffmpeg = require('fluent-ffmpeg');
    const outputPath = path.join(
      this.mediaDir, 
      'videos', 
      `reel_${Date.now()}.mp4`
    );
    
    return new Promise((resolve, reject) => {
      let command = ffmpeg()
        .input(imagePath)
        .inputOptions([
          '-loop 1',
          '-t 20' // 20 second duration
        ])
        .videoFilters([
          // Zoom and pan effect
          'zoompan=z=\'min(zoom+0.0015,1.5)\':x=iw/2-(iw/zoom/2):y=ih/2-(ih/zoom/2):d=25*20',
          // Scale to Instagram Reels format
          'scale=1080:1920:force_original_aspect_ratio=decrease',
          'pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black'
        ])
        .outputOptions([
          '-pix_fmt yuv420p',
          '-r 25', // 25 fps
          '-c:v libx264',
          '-preset medium',
          '-crf 23'
        ]);
      
      // Add audio if provided
      if (audioPath) {
        command = command.input(audioPath)
          .outputOptions(['-c:a aac', '-b:a 128k', '-shortest']);
      } else {
        // Generate silent audio track (required by Instagram)
        command = command.outputOptions([
          '-f lavfi',
          '-i anullsrc=channel_layout=stereo:sample_rate=48000',
          '-c:a aac',
          '-shortest'
        ]);
      }
      
      command
        .output(outputPath)
        .on('end', () => {
          console.log('Video generation completed:', outputPath);
          resolve(outputPath);
        })
        .on('error', (error) => {
          console.error('Video generation failed:', error);
          reject(error);
        })
        .run();
    });
  }

  _parseContent(content) {
    const lines = content.split('\n').filter(line => line.trim());
    
    const word = lines[0] || 'Word';
    let pronunciation = '';
    let definition = '';
    const examples = [];
    
    let currentSection = 'definition';
    let koreanExample = '';
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.includes('어떻게 말하면 될까요?')) {
        currentSection = 'english_examples';
        continue;
      }
      
      if (line.includes('https://en9door.com')) {
        break;
      }
      
      // Extract pronunciation from definition if present
      if (currentSection === 'definition' && line.includes('[') && line.includes(']')) {
        const pronunciationMatch = line.match(/\[([^\]]+)\]/);
        if (pronunciationMatch) {
          pronunciation = pronunciationMatch[1];
        }
      }
      
      if (currentSection === 'definition' && !line.includes('어떻게')) {
        if (line.length > 10 && !line.includes('✨') && !line.includes('💃') && !line.includes('🌙')) {
          definition += line + ' ';
        } else if (line.includes('💃') || line.includes('🌙') || line.includes('🌕')) {
          koreanExample = line;
        }
      }
      
      if (currentSection === 'english_examples' && line.includes('.')) {
        if (koreanExample) {
          examples.push({
            korean: koreanExample.replace(/[💃🌙🌕✨🎉]/g, '').trim(),
            english: line.replace(/[💃🌙🌕✨🎉]/g, '').trim()
          });
          koreanExample = '';
        }
      }
    }
    
    return {
      word: word.trim(),
      pronunciation: pronunciation.trim(),
      definition: definition.trim(),
      examples: examples.slice(0, 2) // Limit to 2 examples
    };
  }

  _drawWrappedText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let currentY = y;
    
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, x, currentY);
        line = words[n] + ' ';
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, currentY);
  }

  _addDecorations(ctx) {
    // Add some geometric shapes for visual appeal
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    
    // Circles
    ctx.beginPath();
    ctx.arc(200, 150, 80, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(880, 1800, 120, 0, 2 * Math.PI);
    ctx.fill();
    
    // Triangles
    ctx.beginPath();
    ctx.moveTo(900, 200);
    ctx.lineTo(980, 120);
    ctx.lineTo(980, 280);
    ctx.closePath();
    ctx.fill();
  }

  async cleanup(filePath) {
    try {
      await fs.unlink(filePath);
      console.log('Cleaned up file:', filePath);
    } catch (error) {
      console.warn('Failed to cleanup file:', filePath, error.message);
    }
  }
}

module.exports = MediaGeneratorService;