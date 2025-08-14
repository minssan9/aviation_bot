# Aviation Knowledge Telegram Bot

A Telegram bot that sends daily aviation knowledge content to subscribers three times a day (9 AM, 2 PM, 8 PM KST).

## Features

- 🛩️ Daily aviation knowledge notifications
- 📅 Weekly topics covering different aviation subjects
- ⏰ Three daily notifications at scheduled times
- 🇰🇷 Korean timezone support
- 📱 Interactive commands for user management

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
   - Copy `.env.example` to `.env`
   - Replace `YOUR_BOT_TOKEN_HERE` in `bot.js` with your actual bot token

4. Start the bot:
   ```bash
   npm start
   ```

   For development:
   ```bash
   npm run dev
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

## Deployment

For production deployment, consider:
- Using a database instead of in-memory subscriber storage
- Setting up proper logging
- Using environment variables for configuration
- Implementing graceful shutdown handling