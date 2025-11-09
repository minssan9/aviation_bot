# Quick Start: GitHub Actions Deployment

Get your Aviation Bot deployed in 15 minutes!

## Prerequisites

- A GitHub account
- A server (VPS, EC2, Droplet, etc.) with Ubuntu 20.04+
- SSH access to your server
- Telegram Bot Token (from [@BotFather](https://t.me/botfather))
- API keys (Gemini and/or Claude)

## Step 1: Prepare Your Server (5 minutes)

### Option A: Automated Setup (Recommended)

SSH into your server and run:

```bash
sudo su
bash <(curl -fsSL https://raw.githubusercontent.com/<your-username>/aviation_bot/main/scripts/setup-server.sh)
```

The script will:
- Install Docker and Docker Compose
- Set up the project directory
- Configure firewall
- Create systemd service (optional)

### Option B: Manual Setup

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Clone repository
sudo mkdir -p /opt/aviation_bot
cd /opt/aviation_bot
git clone https://github.com/<your-username>/aviation_bot.git .

# Create environment file
cp .env.example .env
nano .env  # Add your credentials
```

## Step 2: Configure GitHub Secrets (3 minutes)

Go to: `https://github.com/<your-username>/aviation_bot/settings/secrets/actions`

Add these secrets:

### Deployment Secrets
| Secret | Value | Example |
|--------|-------|---------|
| `DEPLOY_HOST` | Your server IP | `192.168.1.100` |
| `DEPLOY_USER` | SSH username | `ubuntu` or `root` |
| `DEPLOY_SSH_KEY` | Private SSH key | Contents of `~/.ssh/id_rsa` |
| `DEPLOY_PATH` | Install path | `/opt/aviation_bot` |

### Application Secrets
| Secret | Value |
|--------|-------|
| `BOT_TOKEN` | Telegram bot token from @BotFather |
| `GEMINI_API_KEY` | Google Gemini API key |
| `CLAUDE_API_KEY` | Anthropic Claude API key (optional) |
| `DB_PASSWORD` | MySQL root password |

### Getting Your SSH Key

On your local machine:

```bash
# Generate new key (if you don't have one)
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github-actions

# Copy public key to server
ssh-copy-id -i ~/.ssh/github-actions.pub user@your-server-ip

# Display private key (copy this to DEPLOY_SSH_KEY secret)
cat ~/.ssh/github-actions
```

Copy the **entire** private key including the `-----BEGIN` and `-----END` lines.

## Step 3: Deploy! (2 minutes)

### First Deployment

1. Update your `.env` file on the server with actual values:
```bash
ssh user@your-server-ip
cd /opt/aviation_bot
nano .env
```

2. Push to main branch:
```bash
git add .
git commit -m "Initial deployment setup"
git push origin main
```

3. Watch the magic happen:
   - Go to `https://github.com/<your-username>/aviation_bot/actions`
   - Watch workflows run automatically
   - CI → Docker Build → Deploy

### Subsequent Deployments

Just push to main:
```bash
git push origin main
```

Or manually trigger:
1. Go to Actions tab
2. Select "Deploy to Production"
3. Click "Run workflow"

## Step 4: Verify Deployment (2 minutes)

### Check GitHub Actions

Go to: `https://github.com/<your-username>/aviation_bot/actions`

All three workflows should show green checkmarks:
- ✅ CI - Test and Lint
- ✅ Build and Push Docker Image
- ✅ Deploy to Production

### Check Server

```bash
# SSH into your server
ssh user@your-server-ip

# Check running containers
cd /opt/aviation_bot
docker compose ps

# View logs
docker compose logs -f

# Test bot
# Send /start to your bot on Telegram
```

### Expected Output

```
NAME                    STATUS              PORTS
aviation_bot_app_1      Up 5 minutes       0.0.0.0:3000->3000/tcp
aviation_bot_db_1       Up 5 minutes       0.0.0.0:3306->3306/tcp
```

## Step 5: Monitor and Maintain (3 minutes)

### View Logs

```bash
# Real-time logs
docker compose logs -f

# Last 100 lines
docker compose logs --tail=100

# Specific service
docker compose logs -f app
```

### Restart Services

```bash
docker compose restart
```

### Update Configuration

```bash
# Edit environment variables
nano .env

# Restart to apply changes
docker compose up -d --force-recreate
```

### Health Check

Visit: `http://your-server-ip:3000` (if admin server is enabled)

Or check with curl:
```bash
curl http://localhost:3000
```

## Common Issues

### ❌ SSH Connection Failed

**Problem:** GitHub Actions can't connect to server

**Fix:**
```bash
# Test SSH connection locally
ssh -i ~/.ssh/github-actions user@your-server-ip

# Check firewall
sudo ufw allow ssh
sudo ufw status
```

### ❌ Docker Image Not Found

**Problem:** Server can't pull image from GHCR

**Fix:**
```bash
# On server, login to GitHub Container Registry
echo YOUR_GITHUB_TOKEN | docker login ghcr.io -u YOUR_USERNAME --password-stdin
```

Create token at: https://github.com/settings/tokens (with `read:packages` permission)

### ❌ Bot Not Responding

**Problem:** Bot starts but doesn't respond to messages

**Fix:**
1. Check logs: `docker compose logs app`
2. Verify BOT_TOKEN is correct
3. Check API keys (GEMINI_API_KEY or CLAUDE_API_KEY)
4. Ensure database is running: `docker compose ps db`

### ❌ Database Connection Error

**Problem:** Can't connect to MySQL

**Fix:**
```bash
# Check database status
docker compose ps db

# View database logs
docker compose logs db

# Restart database
docker compose restart db

# Wait for database to be ready (10-20 seconds)
sleep 15
docker compose restart app
```

## Workflow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  Developer pushes to main                                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  GitHub Actions: CI Workflow                                 │
│  ✓ Install dependencies                                      │
│  ✓ Run tests                                                 │
│  ✓ Security audit                                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  GitHub Actions: Docker Build                                │
│  ✓ Build Docker image                                        │
│  ✓ Push to ghcr.io                                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  GitHub Actions: Deploy                                      │
│  ✓ SSH to server                                             │
│  ✓ Pull latest code                                          │
│  ✓ Restart containers                                        │
│  ✓ Health check                                              │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  🚀 Bot is live!                                             │
└─────────────────────────────────────────────────────────────┘
```

## Next Steps

### Add More Features

1. **Add tests** to `package.json`:
```json
"scripts": {
  "test": "jest",
  "lint": "eslint src/"
}
```

2. **Enable auto-updates** - Deployments happen automatically on push to main

3. **Set up monitoring** - Add health checks and alerts

4. **Scale up** - Use load balancers and multiple instances

### Advanced Configuration

See [DEPLOYMENT.md](DEPLOYMENT.md) for:
- Multiple environment deployment (staging, production)
- Database migrations
- Backup strategies
- Blue-green deployments
- Alternative platforms (Heroku, Railway, Cloud Run)

## Support

- **Documentation:** [.github/DEPLOYMENT.md](.github/DEPLOYMENT.md)
- **Issues:** [GitHub Issues](../../issues)
- **Workflows:** [.github/workflows/](.github/workflows/)

## Summary Checklist

- [ ] Server prepared with Docker installed
- [ ] Repository cloned to `/opt/aviation_bot`
- [ ] `.env` file configured with credentials
- [ ] GitHub Secrets added (DEPLOY_HOST, DEPLOY_USER, DEPLOY_SSH_KEY, etc.)
- [ ] SSH key generated and added to server
- [ ] First push to main branch completed
- [ ] Workflows ran successfully (green checkmarks)
- [ ] Bot responding to `/start` command
- [ ] Logs showing no errors

**Congratulations! Your bot is now deployed with CI/CD! 🎉**

Every push to main will automatically deploy your changes.
