# Vercel Quick Start (5 Minutes)

Deploy your Aviation Bot to Vercel in 5 minutes!

## Prerequisites

- ✅ Vercel account ([sign up](https://vercel.com/signup))
- ✅ GitHub account
- ✅ Remote MySQL database (PlanetScale, Railway, etc.)
- ✅ Telegram bot token
- ✅ AI API keys (Gemini/Claude)

## Step 1: Prepare Database (2 minutes)

### Option A: PlanetScale (Recommended)

1. Go to [planetscale.com](https://planetscale.com)
2. Create account and new database
3. Get connection string
4. Keep credentials handy

### Option B: Railway

1. Go to [railway.app](https://railway.app)
2. Create MySQL database
3. Get connection details

## Step 2: Deploy to Vercel (1 minute)

### Option A: One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/aviation_bot)

### Option B: Manual Deploy

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Click "Deploy"

## Step 3: Configure Environment Variables (1 minute)

In Vercel Dashboard → Settings → Environment Variables, add:

```env
# Required
BOT_TOKEN=your_telegram_bot_token
GEMINI_API_KEY=your_gemini_key
DB_HOST=your-database-host.com
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=aviation_bot

# Security (generate random strings)
WEBHOOK_SECRET=random_secret_1
CRON_SECRET=random_secret_2
```

Generate secrets:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Step 4: Setup Webhook (1 minute)

After deployment completes:

1. **Get your Vercel URL**: `https://your-app.vercel.app`

2. **Setup webhook** - Visit:
   ```
   https://your-app.vercel.app/api/setup-webhook?secret=YOUR_WEBHOOK_SECRET
   ```

   Or use curl:
   ```bash
   curl "https://your-app.vercel.app/api/setup-webhook?secret=YOUR_WEBHOOK_SECRET"
   ```

## Step 5: Test (30 seconds)

1. **Health check**:
   ```bash
   curl https://your-app.vercel.app/api/health
   ```

   Expected: `{"status":"healthy",...}`

2. **Test bot**:
   - Open Telegram
   - Find your bot
   - Send `/start`
   - Should receive welcome message ✅

## Verification Checklist

- [ ] Vercel deployment successful
- [ ] Environment variables set
- [ ] Webhook configured
- [ ] Health check returns 200
- [ ] Bot responds to `/start`
- [ ] Database connection works

## Cron Schedule

Your bot will automatically send messages at:
- 🌅 9:00 AM KST (morning)
- ☀️ 2:00 PM KST (afternoon)
- 🌙 8:00 PM KST (evening)

Wait for the scheduled time or test manually:
```bash
curl https://your-app.vercel.app/api/cron/morning \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Monitoring

### View Logs
```bash
vercel logs --follow
```

### Check Webhook Status
```bash
curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo
```

### Monitor Deployments
Dashboard: `https://vercel.com/your-team/your-project`

## Common Issues

### ❌ Bot not responding
**Fix**: Re-setup webhook
```bash
curl "https://your-app.vercel.app/api/setup-webhook?secret=YOUR_WEBHOOK_SECRET"
```

### ❌ Database connection error
**Fix**: Check DB_HOST, DB_USER, DB_PASSWORD in Vercel environment variables

### ❌ Cron not running
**Fix**:
1. Check `CRON_SECRET` is set
2. Verify cron schedule in `vercel.json`
3. Check Vercel logs

## Next Steps

✅ **You're live!** Bot is now deployed and running.

### Recommended:
1. **Add GitHub Actions**: Automatic deployments on push
2. **Monitor usage**: Check Vercel analytics
3. **Set up alerts**: Get notified of errors
4. **Scale up**: Upgrade to Vercel Pro if needed

## Support

- **Full Guide**: See `.github/VERCEL.md`
- **GitHub Issues**: [Report problems](../../issues)
- **Vercel Support**: [vercel.com/support](https://vercel.com/support)

## Architecture Overview

```
User → Telegram → Webhook → Vercel Function → Database
                              ↓
                         Response to User

Vercel Cron (3x daily) → Generate Message → Send to Subscribers
```

**That's it! Your bot is now serverless on Vercel! 🚀**

---

For detailed information, troubleshooting, and advanced configuration, see [.github/VERCEL.md](.github/VERCEL.md)
