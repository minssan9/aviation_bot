# Vercel Deployment Guide

Complete guide to deploying the Aviation Bot on Vercel as a serverless application.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Webhook Setup](#webhook-setup)
- [Cron Jobs](#cron-jobs)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)
- [Limitations](#limitations)

## Overview

This deployment configuration converts the Aviation Bot from a long-running polling-based application to a **serverless webhook-based** application suitable for Vercel.

### Key Changes

- **Polling → Webhooks**: Bot uses Telegram webhooks instead of polling
- **Cron Jobs → Vercel Cron**: Scheduled messages use Vercel's cron feature
- **Always-on → Serverless**: Functions run on-demand, not continuously

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Telegram                                                │
└──────────┬──────────────────────────────────────────────┘
           │
           │ User sends /start
           ▼
┌─────────────────────────────────────────────────────────┐
│  Vercel: /api/webhook.js                                │
│  - Processes commands                                    │
│  - Responds to user                                      │
│  - Stores subscribers in DB                              │
└─────────────────────────────────────────────────────────┘

           ⏰ Cron Schedule
           │
           ├── 9:00 AM KST  → /api/cron/morning.js
           ├── 2:00 PM KST  → /api/cron/afternoon.js
           └── 8:00 PM KST  → /api/cron/evening.js
                    │
                    ▼
           ┌─────────────────────┐
           │  Load subscribers   │
           │  Generate message   │
           │  Send to all users  │
           └─────────────────────┘
```

## Prerequisites

1. **Vercel Account** - Sign up at [vercel.com](https://vercel.com)
2. **GitHub Account** - For continuous deployment
3. **MySQL Database** - Remote database (PlanetScale, Railway, AWS RDS, etc.)
4. **Telegram Bot Token** - From [@BotFather](https://t.me/botfather)
5. **AI API Keys** - Gemini and/or Claude

### Why Remote Database?

Vercel is **stateless** - you cannot use local SQLite. You need a remote MySQL database.

**Recommended Options:**
- [PlanetScale](https://planetscale.com) - Free tier, serverless MySQL
- [Railway](https://railway.app) - Free $5 credit/month
- [AWS RDS](https://aws.amazon.com/rds/) - Production-grade
- [Aiven](https://aiven.io) - Managed MySQL

## Quick Start

### 1. Install Vercel CLI

```bash
npm install -g vercel
```

### 2. Clone and Configure

```bash
git clone https://github.com/<your-username>/aviation_bot.git
cd aviation_bot
```

### 3. Create `.env.local` (for local testing)

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
BOT_TOKEN=your_telegram_bot_token
GEMINI_API_KEY=your_gemini_api_key
CLAUDE_API_KEY=your_claude_api_key

# Remote MySQL Database
DB_HOST=your-db-host.com
DB_PORT=3306
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=aviation_bot

# Webhook Security
WEBHOOK_SECRET=your_random_secret_string
CRON_SECRET=another_random_secret_string
```

### 4. Test Locally

```bash
vercel dev
```

Visit: `http://localhost:3000/api/health`

### 5. Deploy to Vercel

```bash
vercel --prod
```

## Configuration

### vercel.json

The project includes a pre-configured `vercel.json`:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/webhook.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/webhook",
      "dest": "/api/webhook.js"
    }
  ],
  "crons": [
    {
      "path": "/api/cron/morning",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/cron/afternoon",
      "schedule": "0 14 * * *"
    },
    {
      "path": "/api/cron/evening",
      "schedule": "0 20 * * *"
    }
  ]
}
```

### File Structure

```
aviation_bot/
├── api/                          # Vercel serverless functions
│   ├── webhook.js               # Main webhook handler
│   ├── setup-webhook.js         # Webhook configuration helper
│   ├── health.js                # Health check endpoint
│   └── cron/                    # Scheduled functions
│       ├── morning.js           # 9 AM notification
│       ├── afternoon.js         # 2 PM notification
│       └── evening.js           # 8 PM notification
├── src/                         # Application code
├── vercel.json                  # Vercel configuration
└── .env.local                   # Local environment (gitignored)
```

## Webhook Setup

After deploying to Vercel, you must configure the Telegram webhook.

### Automatic Setup (Recommended)

1. **Set Environment Variables** in Vercel Dashboard:
   - Go to: `https://vercel.com/<your-team>/<your-project>/settings/environment-variables`
   - Add `WEBHOOK_SECRET` with a random string

2. **Visit Setup URL**:
   ```
   https://your-app.vercel.app/api/setup-webhook?secret=YOUR_WEBHOOK_SECRET
   ```

   This will automatically configure the webhook.

### Manual Setup

Using curl:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://your-app.vercel.app/api/webhook"}'
```

### Verify Webhook

```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
```

Expected response:
```json
{
  "ok": true,
  "result": {
    "url": "https://your-app.vercel.app/api/webhook",
    "has_custom_certificate": false,
    "pending_update_count": 0
  }
}
```

## Cron Jobs

Vercel Cron automatically triggers serverless functions on schedule.

### Schedules (All times in UTC)

| Function | UTC Time | KST Time | Description |
|----------|----------|----------|-------------|
| `morning.js` | 0:00 | 9:00 AM | Morning aviation knowledge |
| `afternoon.js` | 5:00 | 2:00 PM | Afternoon deep dive |
| `evening.js` | 11:00 | 8:00 PM | Evening review |

**Note**: Vercel Cron uses UTC. The cron expressions in `vercel.json` are adjusted for KST:
- 9 AM KST = 0:00 UTC (midnight)
- 2 PM KST = 5:00 UTC
- 8 PM KST = 11:00 UTC

### Cron Security

**Important**: Secure your cron endpoints!

1. **Set CRON_SECRET** in Vercel environment variables
2. Vercel automatically adds `Authorization: Bearer <CRON_SECRET>` header to cron requests
3. Cron functions verify this header before executing

Without `CRON_SECRET`, anyone can trigger your cron endpoints.

### Test Cron Manually

```bash
curl -X GET "https://your-app.vercel.app/api/cron/morning" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Environment Variables

### Required Variables

Set these in Vercel Dashboard: `Settings → Environment Variables`

```env
# Telegram Bot
BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz

# AI Providers (at least one required)
GEMINI_API_KEY=AIzaSyC...
CLAUDE_API_KEY=sk-ant-...

# Database (MUST be remote)
DB_HOST=aws-us-east-1-portal.25.dblayer.com
DB_PORT=3306
DB_USER=admin
DB_PASSWORD=your_secure_password
DB_NAME=aviation_bot

# Security (generate random strings)
WEBHOOK_SECRET=random_string_for_webhook_setup
CRON_SECRET=random_string_for_cron_auth

# Optional
NODE_ENV=production
REQUEST_TIMEOUT=60000
```

### Generating Secrets

```bash
# Generate random secrets
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Environment Scopes

- **Production**: Live deployment
- **Preview**: Pull request previews
- **Development**: Local `vercel dev`

Set variables for all scopes or specific ones as needed.

## Deployment

### Via Vercel CLI

```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

### Via GitHub (Recommended)

1. **Connect Repository** to Vercel:
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your GitHub repository
   - Configure environment variables
   - Deploy

2. **Automatic Deployments**:
   - Push to `main` → Production deployment
   - Pull requests → Preview deployments

### Via GitHub Actions

Create `.github/workflows/vercel.yml`:

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

Get tokens from: [vercel.com/account/tokens](https://vercel.com/account/tokens)

## Monitoring

### Check Deployment Status

```bash
vercel ls
```

### View Logs

```bash
# Real-time logs
vercel logs --follow

# Function-specific logs
vercel logs --follow api/webhook.js
```

### Vercel Dashboard

Go to: `https://vercel.com/<team>/<project>`

- **Deployments**: View deployment history
- **Functions**: Monitor function invocations
- **Logs**: Real-time and historical logs
- **Analytics**: Usage statistics

### Health Check

```bash
curl https://your-app.vercel.app/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "Aviation Knowledge Bot",
  "platform": "Vercel Serverless",
  "timestamp": "2025-10-22T10:00:00.000Z",
  "features": {
    "webhook": true,
    "cron": true,
    "database": true
  }
}
```

### Monitor Cron Executions

Check logs after scheduled times:
- 9:00 AM KST
- 2:00 PM KST
- 8:00 PM KST

Look for:
```
🌅 Starting morning notification...
📤 Sending to X subscribers...
✅ Morning notifications sent: X successful, Y failed
```

## Troubleshooting

### Bot Not Responding

**Problem**: User sends /start, no response

**Check**:
1. Webhook is set: `curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo`
2. Function logs: `vercel logs api/webhook.js`
3. Environment variables are set in Vercel

**Fix**:
```bash
# Re-set webhook
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -d "url=https://your-app.vercel.app/api/webhook"
```

### Cron Not Running

**Problem**: Scheduled messages not sent

**Check**:
1. Cron is configured in `vercel.json`
2. `CRON_SECRET` is set
3. Check logs: `vercel logs api/cron/morning.js`

**Fix**:
1. Verify cron schedule is correct (UTC time)
2. Test manually: `curl https://your-app.vercel.app/api/cron/morning -H "Authorization: Bearer SECRET"`

### Database Connection Failed

**Problem**: Cannot connect to MySQL

**Check**:
1. Database is accessible from internet
2. Firewall allows Vercel IPs
3. Connection string is correct

**Fix**:
- Test connection locally: `vercel dev`
- Check database logs
- Verify DB_HOST, DB_USER, DB_PASSWORD

### Function Timeout

**Problem**: 504 Gateway Timeout

**Cause**: Function exceeds 60-second limit (Pro plan)

**Fix**:
1. Optimize database queries
2. Reduce AI API calls
3. Use async operations
4. Batch operations where possible

### Webhook Certificate Error

**Problem**: Telegram reports certificate issue

**Cause**: Using HTTP instead of HTTPS

**Fix**: Always use HTTPS with Vercel:
```
https://your-app.vercel.app/api/webhook  ✅
http://your-app.vercel.app/api/webhook   ❌
```

## Limitations

### Vercel Free Plan

| Feature | Limit |
|---------|-------|
| Function execution | 10 seconds |
| Bandwidth | 100 GB/month |
| Serverless function invocations | 100,000/month |
| Cron jobs | 1 job/day |

### Vercel Pro Plan ($20/month)

| Feature | Limit |
|---------|-------|
| Function execution | 60 seconds |
| Bandwidth | 1 TB/month |
| Serverless function invocations | 1,000,000/month |
| Cron jobs | Unlimited |

### Important Limitations

1. **No Polling**: Must use webhooks
2. **Stateless**: Cannot store data locally
3. **Cold Starts**: First request may be slow (1-2s)
4. **Cron Timing**: May have 1-minute variance
5. **No WebSocket**: Cannot maintain persistent connections
6. **Region**: Functions run in specific regions (configure in vercel.json)

## Best Practices

### 1. Database Connection Pooling

Use connection pooling to handle serverless database connections:

```javascript
// In database.js
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  connectionLimit: 1, // Important for serverless
  queueLimit: 0
});
```

### 2. Environment Variable Management

- **Never commit secrets** to Git
- Use Vercel's environment variable UI
- Different secrets for production and preview

### 3. Error Handling

Always respond to Telegram quickly:

```javascript
// Process async, respond immediately
processUpdate(update).catch(console.error);
res.status(200).json({ ok: true });
```

### 4. Monitoring

- Set up alerts in Vercel
- Monitor function execution times
- Track error rates
- Check cron job success

### 5. Cost Optimization

- Use caching where possible
- Minimize AI API calls
- Optimize database queries
- Use webhook instead of polling (much cheaper)

## Migration from Polling to Webhook

If migrating from existing polling-based deployment:

1. **Stop old deployment**
2. **Set webhook** on Telegram
3. **Deploy to Vercel**
4. **Test thoroughly**
5. **Monitor for 24 hours**

**Note**: You cannot use both polling and webhook simultaneously. Choose one.

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
- [Telegram Bot API - Webhooks](https://core.telegram.org/bots/api#setwebhook)
- [Serverless Best Practices](https://vercel.com/docs/concepts/functions/serverless-functions)

## Support

For issues specific to:
- **Vercel**: [Vercel Support](https://vercel.com/support)
- **Bot**: [GitHub Issues](../../issues)
- **Database**: Your database provider's support

---

**Last Updated:** 2025-10-22
