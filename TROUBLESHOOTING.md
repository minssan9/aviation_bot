# Troubleshooting Guide for Aviation Bot

## RequestError: AggregateError

This error typically occurs due to network connectivity issues with Telegram's API. Here are the solutions:

### 1. Network Connectivity Issues

**Symptoms:**
- `RequestError: AggregateError`
- `ETIMEDOUT` errors
- Connection refused errors

**Solutions:**

#### A. Check Network Connectivity
```bash
# Test basic connectivity
npm run test:network

# Test specific endpoints
curl -I https://api.telegram.org
ping api.telegram.org
```

#### B. Use Proxy (if Telegram is blocked in your region)
Add to your `.env` file:
```env
HTTP_PROXY=http://your-proxy-server:port
HTTPS_PROXY=http://your-proxy-server:port
```

#### C. Use VPN
- Connect to a VPN service
- Ensure the VPN allows access to Telegram's API

### 2. Bot Token Issues

**Symptoms:**
- `401 Unauthorized` errors
- Bot not responding

**Solutions:**

#### A. Verify Bot Token
```bash
npm run test:token
```

#### B. Check Bot Token Format
- Ensure token starts with numbers followed by a colon
- Example: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`

#### C. Regenerate Bot Token
1. Go to @BotFather on Telegram
2. Send `/mybots`
3. Select your bot
4. Choose "API Token"
5. Generate a new token

### 3. Dependencies Issues

**Symptoms:**
- `request-promise-core` errors
- Module not found errors

**Solutions:**

#### A. Update Dependencies
```bash
npm update
npm install node-telegram-bot-api@latest
```

#### B. Clear npm Cache
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### 4. Environment Configuration

**Symptoms:**
- Configuration errors
- Missing environment variables

**Solutions:**

#### A. Check .env File
Ensure your `.env` file exists and contains:
```env
BOT_TOKEN=your_bot_token_here
ANTHROPIC_API_KEY=your_anthropic_key
GOOGLE_API_KEY=your_google_key
DB_HOST=localhost
DB_PORT=3306
DB_NAME=aviation_bot
DB_USER=your_db_user
DB_PASSWORD=your_db_password
```

#### B. Verify Environment Variables
```bash
# Check if .env is loaded
node -e "require('dotenv').config(); console.log('BOT_TOKEN:', process.env.BOT_TOKEN ? 'Set' : 'Not set')"
```

### 5. Database Issues

**Symptoms:**
- Database connection errors
- Migration failures

**Solutions:**

#### A. Check Database Connection
```bash
# Test MySQL connection
mysql -h localhost -u your_user -p your_database
```

#### B. Run Migrations
```bash
# Check if migrations exist
ls src/migrations/

# Run migrations manually if needed
```

### 6. Runtime Issues

**Symptoms:**
- Bot crashes on startup
- Memory issues

**Solutions:**

#### A. Check Node.js Version
```bash
node --version
# Ensure you're using Node.js 16+ for best compatibility
```

#### B. Increase Memory Limit
```bash
node --max-old-space-size=4096 src/app.js
```

#### C. Check Logs
```bash
# Run with verbose logging
DEBUG=* npm start
```

### 7. Production Deployment Issues

**Symptoms:**
- Bot works locally but not in production
- Environment-specific errors

**Solutions:**

#### A. Environment Variables
Ensure all environment variables are set in production:
```bash
# Check production environment
echo $NODE_ENV
echo $BOT_TOKEN
```

#### B. Process Management
Use PM2 or similar for production:
```bash
npm install -g pm2
pm2 start src/app.js --name aviation-bot
pm2 logs aviation-bot
```

### 8. Common Error Codes

| Error Code | Meaning | Solution |
|------------|---------|----------|
| `ECONNRESET` | Connection reset | Check network/VPN |
| `ETIMEDOUT` | Request timeout | Increase timeout or check network |
| `ENOTFOUND` | DNS resolution failed | Check DNS settings |
| `ECONNREFUSED` | Connection refused | Check firewall/proxy |
| `401` | Unauthorized | Check bot token |
| `429` | Rate limited | Wait and retry |

### 9. Debugging Commands

```bash
# Test network connectivity
npm run test:network

# Test bot token
npm run test:token

# Run with debug logging
DEBUG=* npm start

# Check system resources
top
df -h
free -h

# Check network connections
netstat -an | grep :443
lsof -i :443
```

### 10. Getting Help

If none of the above solutions work:

1. **Check the logs** for specific error messages
2. **Run diagnostic scripts** to identify the issue
3. **Check Telegram Bot API status** at https://api.telegram.org
4. **Verify your network** can access Telegram's servers
5. **Consider using a different network** or VPN service

### 11. Prevention

To prevent future issues:

1. **Regular updates**: Keep dependencies updated
2. **Monitoring**: Set up monitoring for the bot
3. **Backups**: Regular database backups
4. **Testing**: Test changes in development first
5. **Documentation**: Keep configuration documented