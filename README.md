# Aviation Knowledge Telegram Bot + Instagram Reels Automation

A comprehensive system that includes:
1. **Telegram bot** for daily aviation knowledge (9 AM, 2 PM, 8 PM KST)
2. **Instagram Reels automation** for English learning content
3. **Weather photo collection** from KMA satellite data

## Features

### 🛩️ Aviation Knowledge Bot
- Daily aviation knowledge notifications
- Weekly topics covering different aviation subjects
- Three daily notifications at scheduled times
- Korean timezone support
- Interactive commands for user management

### 📱 Instagram Reels Automation
- **AI Content Generation**: Google Gemini API for English word content
- **Visual Media**: Canvas-based image generation (1080x1920px)
- **Video Creation**: FFmpeg 20-second Reels with animations
- **Auto Posting**: Instagram Graph API integration
- **Scheduling**: Automated daily posting with cron
- **200+ Word Bank**: A2-level English vocabulary for Korean learners

### 🌤️ Weather Data Collection
- KMA satellite image collection
- Automated download and storage
- File management and cleanup
- Status monitoring and reporting

## Weekly Learning Schedule

- **Monday**: 항공역학 (Aerodynamics)  
- **Tuesday**: 항법 (Navigation)
- **Wednesday**: 기상학 (Meteorology)
- **Thursday**: 항공기 시스템 (Aircraft Systems)
- **Friday**: 비행 규정 (Flight Regulations)
- **Saturday**: 비행 계획 및 성능 (Flight Planning & Performance)
- **Sunday**: 응급상황 및 안전 (Emergency & Safety)

## Available Commands

- `/start` - Subscribe to notifications
- `/stop` - Unsubscribe from notifications  
- `/status` - Check current status and topic
- `/now` - Get immediate learning content

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a new bot on Telegram:
   - Message @BotFather on Telegram
   - Use `/newbot` command
   - Follow instructions to get your bot token

3. Configure environment:
   Create a `.env` file in the root directory with the following variables:
   ```bash
   # Telegram Bot Configuration
   BOT_TOKEN=your_telegram_bot_token_here
   
   # AI Provider API Keys (at least one required)
   GEMINI_API_KEY=your_gemini_api_key_here
   CLAUDE_API_KEY=your_claude_api_key_here
   
   # Instagram Reels Configuration (for English content automation)
   INSTAGRAM_ACCESS_TOKEN=your_instagram_access_token_here
   INSTAGRAM_PAGE_ID=your_instagram_page_id_here
   
   # Database Configuration
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_database_password_here
   DB_NAME=aviation_bot
   
   # Environment
   NODE_ENV=development
   ```

4. Start the bot:
   ```bash
   npm start
   ```

   For development:
   ```bash
   npm run dev
   ```

   For legacy bot (if needed):
   ```bash
   npm run legacy
   ```

   To test your bot token:
   ```bash
   npm run test:token
   ```

## Project Structure

```
aviation-telegram-bot/
├── bot.js              # Main bot application
├── package.json        # Dependencies and scripts
├── .env.example        # Environment variables template
└── README.md          # This file
```

## Dependencies

- `node-telegram-bot-api` - Telegram Bot API wrapper
- `node-cron` - Task scheduling
- `moment-timezone` - Timezone handling

## Troubleshooting

### Polling Error (EFATAL)
If you encounter `[polling_error] %j RequestError: AggregateError` with code `EFATAL`:

1. **Check your bot token**: Ensure `BOT_TOKEN` in `.env` is correct
2. **Verify network connectivity**: Check if you can access Telegram API
3. **Check if bot is already running**: Only one instance can poll at a time
4. **Restart the bot**: The enhanced error handling will retry automatically

### Database Connection Issues
If database connection fails:
- The bot will fall back to hardcoded data
- Check your database credentials in `.env`
- Ensure MySQL server is running

### AI Provider Issues
If AI features don't work:
- Ensure at least one AI provider key is set (GEMINI_API_KEY or CLAUDE_API_KEY)
- Check API key validity and quotas

## Instagram Reels Automation

### 🎯 Generated Content Format

**Example English Learning Content:**
```
beautiful

[ˈbjuːtɪfəl]

Beautiful은 아름다운, 예쁜 것을 의미합니다. ✨

그 꽃은 정말 아름다워요. 🌸
오늘 날씨가 아름다워요. ☀️

어떻게 말하면 될까요?

The flower is really beautiful. 🌺
The weather is beautiful today. 🌞

https://en9door.com 
#영어문 #전화영어 #영어회화 #화상영어 #원어민 #여행
```

### 📊 Management Interface

Access the admin panel at `http://localhost:3000` to:
- **Generate daily Reels**: Automatic English word content
- **Create custom Reels**: Specify your own words
- **Monitor status**: View success rates and execution logs  
- **Schedule posts**: Set automatic daily posting times
- **Validate setup**: Check Instagram API connectivity

### 🔧 Instagram Reels API Endpoints

```javascript
// Generate today's Reel
POST /api/reels/generate

// Generate custom word Reel  
POST /api/reels/generate-custom
Body: { "word": "beautiful" }

// Schedule daily automation
POST /api/reels/schedule
Body: { "hour": 9, "minute": 0 }

// Check system status
GET /api/reels/status

// View execution logs
GET /api/reels/logs?days=7

// Validate Instagram setup
GET /api/reels/validate
```

### 🎨 Visual Specifications

- **Resolution**: 1080x1920px (Instagram Reels format)
- **Duration**: 20 seconds with zoom animation
- **Background**: Blue-purple gradient with decorative elements
- **Typography**: Clear hierarchy with Korean and English text
- **Format**: H.264/AAC video codec

## Weather Photo Collection

### 🛰️ KMA Satellite Integration

```javascript
// Collect latest satellite image
POST /api/weather/collect

// View stored images
GET /api/weather/images?limit=20

// Check service status  
GET /api/weather/kma/status

// Cleanup old files
POST /api/weather/cleanup
Body: { "daysToKeep": 7 }
```

## System Requirements

### Required Dependencies
```bash
# Core system dependencies
npm install

# For Instagram Reels (Canvas + FFmpeg)
# macOS:
brew install pkg-config cairo pango libpng jpeg giflib librsvg ffmpeg

# Ubuntu/Debian:
sudo apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev ffmpeg

# Windows:
# Install windows-build-tools and FFmpeg separately
```

### Hardware Requirements
- **Memory**: Minimum 2GB RAM
- **Storage**: 10GB+ free space for media generation
- **Network**: Stable internet for API calls

## Deployment

### Production Considerations
- **Database**: MySQL with proper indexing
- **File Storage**: Automated cleanup of generated media
- **API Limits**: Monitor Instagram Graph API quotas
- **Security**: Secure API key storage and rotation
- **Monitoring**: Health checks and error alerting
- **Scaling**: Consider multiple worker processes for heavy loads

### Docker Deployment
```bash
# Build container
npm run docker:build

# Run with compose
npm run compose:up

# Stop services
npm run compose:down
```

## Troubleshooting

### Instagram API Issues
```bash
# Test Instagram connectivity
curl -X GET "https://graph.facebook.com/v18.0/me?access_token=YOUR_TOKEN"

# Validate page permissions
curl -X GET "https://graph.facebook.com/v18.0/YOUR_PAGE_ID?access_token=YOUR_TOKEN"
```

### Canvas/FFmpeg Issues
- **Canvas not found**: Install system dependencies first
- **FFmpeg errors**: Verify FFmpeg in PATH
- **Permission denied**: Check media directory permissions

### Performance Optimization
- **Media cleanup**: Automatic removal of old files
- **Log rotation**: Archive logs older than 30 days  
- **API caching**: Cache content generation results
- **Queue management**: Handle multiple requests gracefully

## API Documentation

For detailed Instagram setup instructions, see: `docs/INSTAGRAM_SETUP.md`

For complete API reference, see: `docs/API_REFERENCE.md`