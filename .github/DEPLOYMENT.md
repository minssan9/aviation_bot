# GitHub Actions Deployment Guide

This guide explains how to deploy the Aviation Bot using GitHub Actions.

## Table of Contents

- [Overview](#overview)
- [Workflows](#workflows)
- [Setup Instructions](#setup-instructions)
- [Deployment Platforms](#deployment-platforms)
- [Environment Variables](#environment-variables)
- [Troubleshooting](#troubleshooting)

## Overview

The project includes three main GitHub Actions workflows:

1. **CI Workflow** (`ci.yml`) - Runs tests and security audits on every push/PR
2. **Docker Build** (`docker-build.yml`) - Builds and pushes Docker images to GitHub Container Registry
3. **Deploy** (`deploy.yml`) - Deploys the application to your production server

## Workflows

### 1. CI Workflow (ci.yml)

**Triggers:**
- Push to `main`, `develop`, or `claude/**` branches
- Pull requests to `main` or `develop`

**Actions:**
- Installs dependencies
- Runs linter (if configured)
- Runs tests (if configured)
- Checks for syntax errors
- Runs security audit

### 2. Docker Build Workflow (docker-build.yml)

**Triggers:**
- Push to `main` branch
- Git tags matching `v*.*.*`
- Manual trigger via workflow_dispatch

**Actions:**
- Builds Docker image using Buildx
- Pushes to GitHub Container Registry (ghcr.io)
- Creates tags for versioning
- Supports multi-platform builds (amd64, arm64)

**Image Location:**
```
ghcr.io/<your-username>/aviation_bot:latest
ghcr.io/<your-username>/aviation_bot:main
ghcr.io/<your-username>/aviation_bot:v1.0.0
```

### 3. Deploy Workflow (deploy.yml)

**Triggers:**
- Push to `main` branch
- Manual trigger with environment selection

**Actions:**
- Connects to your server via SSH
- Pulls latest changes
- Restarts Docker containers
- Performs health checks

## Setup Instructions

### Prerequisites

1. GitHub repository with the Aviation Bot code
2. A deployment server (VPS, EC2, Droplet, etc.) with:
   - Docker and Docker Compose installed
   - SSH access configured
   - Git installed

### Step 1: Configure GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add the following secrets:

#### Required for Deployment:

```
DEPLOY_HOST         # Your server IP or hostname (e.g., 192.168.1.100)
DEPLOY_USER         # SSH username (e.g., ubuntu, root)
DEPLOY_SSH_KEY      # Your private SSH key
DEPLOY_PORT         # SSH port (default: 22)
DEPLOY_PATH         # Path to project on server (e.g., /opt/aviation_bot)
```

#### Required for Application:

```
BOT_TOKEN           # Your Telegram bot token
GEMINI_API_KEY      # Google Gemini API key
CLAUDE_API_KEY      # Anthropic Claude API key (optional)
DB_HOST             # Database host
DB_USER             # Database username
DB_PASSWORD         # Database password
DB_NAME             # Database name (default: aviation_bot)
```

### Step 2: Set Up Your Server

#### Option A: Using Git (Recommended)

1. SSH into your server:
```bash
ssh user@your-server-ip
```

2. Clone your repository:
```bash
cd /opt
git clone https://github.com/<your-username>/aviation_bot.git
cd aviation_bot
```

3. Create `.env` file:
```bash
cp .env.example .env
nano .env  # Edit with your actual values
```

4. Start the application:
```bash
docker compose up -d
```

#### Option B: Using GHCR Image

1. Create a directory:
```bash
mkdir -p /opt/aviation_bot
cd /opt/aviation_bot
```

2. Download docker-compose.yml from your repo

3. Create `.env` file with your configuration

4. Login to GitHub Container Registry:
```bash
echo YOUR_GITHUB_TOKEN | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

5. Pull and start:
```bash
docker compose pull
docker compose up -d
```

### Step 3: Generate SSH Key for GitHub Actions

On your local machine:

```bash
# Generate a new SSH key pair
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github-actions

# Copy the public key to your server
ssh-copy-id -i ~/.ssh/github-actions.pub user@your-server

# Display the private key (to add to GitHub Secrets)
cat ~/.ssh/github-actions
```

Add the entire private key (including `-----BEGIN` and `-----END` lines) to `DEPLOY_SSH_KEY` secret.

### Step 4: Test SSH Connection

```bash
ssh -i ~/.ssh/github-actions user@your-server
```

### Step 5: Enable GitHub Container Registry

The Docker build workflow pushes images to GitHub Container Registry (GHCR). This is automatically enabled and uses `GITHUB_TOKEN`.

To pull private images from GHCR on your server:

```bash
# Create a Personal Access Token at: https://github.com/settings/tokens
# Grant: read:packages scope

echo YOUR_PAT | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

### Step 6: Trigger Deployment

Push to main branch:
```bash
git add .
git commit -m "Deploy: initial setup"
git push origin main
```

Or manually trigger:
1. Go to Actions tab in GitHub
2. Select "Deploy to Production"
3. Click "Run workflow"
4. Select environment and run

## Deployment Platforms

### Current Setup: SSH-based VPS Deployment

The default configuration deploys to any server accessible via SSH.

**Supported Platforms:**
- AWS EC2
- DigitalOcean Droplets
- Linode
- Vultr
- Hetzner
- Azure VMs
- Google Compute Engine
- Any VPS with SSH access

### Alternative Platforms

See `.github/workflows/deploy-examples.yml` for ready-to-use configurations for:

1. **Heroku** - Simple PaaS deployment
2. **Google Cloud Run** - Serverless containers
3. **Azure Container Instances** - Managed containers
4. **Railway.app** - Modern deployment platform
5. **Render.com** - Zero-config deployments
6. **Kubernetes** - Production-grade orchestration
7. **Docker Swarm** - Docker-native clustering
8. **Fly.io** - Global application platform

To use an alternative platform:
1. Open `deploy-examples.yml`
2. Find your platform's section
3. Set `if: false` to `if: true`
4. Copy to `deploy.yml` or create a new workflow
5. Add required secrets

## Environment Variables

### Required Environment Variables

These must be set in GitHub Secrets and on your server:

```bash
# Telegram Bot
BOT_TOKEN=your_bot_token_from_botfather

# AI Providers (at least one required)
GEMINI_API_KEY=your_google_gemini_key
CLAUDE_API_KEY=your_anthropic_claude_key

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_secure_password
DB_NAME=aviation_bot

# Optional
NODE_ENV=production
REQUEST_TIMEOUT=60000
POLLING_TIMEOUT=100
```

### Setting Environment Variables

#### On GitHub (for CI/CD):
Settings → Secrets and variables → Actions → New repository secret

#### On Server (for runtime):
Edit `/opt/aviation_bot/.env` file

#### In Docker Compose:
Variables are automatically loaded from `.env` file

## Continuous Deployment Flow

```
Developer pushes to main
    ↓
GitHub Actions triggers
    ↓
1. CI Workflow runs
   - Tests pass ✓
   - Security audit ✓
    ↓
2. Docker Build runs
   - Build image ✓
   - Push to GHCR ✓
    ↓
3. Deploy Workflow runs
   - SSH to server ✓
   - Pull latest code/image ✓
   - Restart containers ✓
   - Health check ✓
    ↓
Application deployed! 🚀
```

## Monitoring Deployment

### View Logs on Server

```bash
# SSH into server
ssh user@your-server-ip

# View application logs
cd /opt/aviation_bot
docker compose logs -f

# View specific service
docker compose logs -f app

# View recent logs
docker compose logs --tail=100 app
```

### Check Service Status

```bash
# Check running containers
docker compose ps

# Check container health
docker inspect aviation_bot_app | grep Health
```

### GitHub Actions Logs

1. Go to your repository on GitHub
2. Click "Actions" tab
3. Click on a workflow run
4. View detailed logs for each step

## Rollback

If deployment fails, you can quickly rollback:

### Option 1: Rollback via Git

```bash
# SSH to server
ssh user@your-server-ip
cd /opt/aviation_bot

# Revert to previous commit
git log --oneline -10  # Find the commit hash
git reset --hard <previous-commit-hash>

# Restart services
docker compose up -d --force-recreate
```

### Option 2: Rollback via Docker Tags

```bash
# SSH to server
ssh user@your-server-ip
cd /opt/aviation_bot

# Use previous image version
docker compose down
docker compose up -d aviation-bot:previous-tag
```

### Option 3: Re-run Previous Workflow

1. Go to Actions tab
2. Find last successful deployment
3. Click "Re-run all jobs"

## Security Best Practices

### 1. SSH Key Management
- Use dedicated SSH keys for GitHub Actions
- Rotate keys regularly
- Restrict key permissions on server

### 2. Secrets Management
- Never commit secrets to repository
- Use GitHub Secrets for sensitive data
- Rotate API keys periodically

### 3. Server Security
- Enable firewall (UFW, iptables)
- Keep system updated
- Use fail2ban for SSH protection
- Restrict SSH to key-based authentication

### 4. Docker Security
- Run containers as non-root user
- Use official base images
- Scan images for vulnerabilities
- Limit container resources

## Troubleshooting

### Deployment Fails: SSH Connection Error

**Problem:** Cannot connect to server

**Solutions:**
1. Verify `DEPLOY_HOST` is correct
2. Check `DEPLOY_PORT` (default: 22)
3. Ensure SSH key is correct and complete
4. Verify firewall allows GitHub IPs

### Docker Image Not Found

**Problem:** Cannot pull image from GHCR

**Solutions:**
1. Verify image was built successfully
2. Check repository visibility (public/private)
3. Authenticate to GHCR on server
4. Verify image tag is correct

### Application Fails to Start

**Problem:** Container starts but crashes

**Solutions:**
1. Check logs: `docker compose logs app`
2. Verify environment variables
3. Check database connectivity
4. Ensure required volumes are mounted

### Database Connection Failed

**Problem:** Cannot connect to MySQL

**Solutions:**
1. Verify database is running: `docker compose ps db`
2. Check database logs: `docker compose logs db`
3. Verify credentials in `.env`
4. Ensure database service started before app

### Out of Disk Space

**Problem:** Deployment fails due to disk space

**Solutions:**
```bash
# Remove unused Docker images
docker image prune -a -f

# Remove unused volumes
docker volume prune -f

# Remove unused containers
docker container prune -f

# Check disk usage
df -h
du -sh /var/lib/docker
```

### Health Check Fails

**Problem:** Service doesn't respond after deployment

**Solutions:**
1. Increase wait time in deploy workflow
2. Check if port 3000 is accessible
3. Verify application logs for errors
4. Test health endpoint: `curl http://localhost:3000`

## Advanced Configuration

### Blue-Green Deployment

For zero-downtime deployments:

```yaml
# Add to deploy.yml
script: |
  cd /opt/aviation_bot

  # Start new containers with different name
  docker compose -p aviation_bot_new up -d

  # Wait for health check
  sleep 15

  # Test new deployment
  curl http://localhost:3001/health

  # Switch traffic (update reverse proxy)
  # Then stop old containers
  docker compose -p aviation_bot_old down
```

### Database Migrations

Add migration step before deployment:

```yaml
- name: Run Database Migrations
  run: |
    docker compose run --rm app npm run migrate
```

### Slack/Discord Notifications

Add notification step:

```yaml
- name: Send Notification
  if: always()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

## Getting Help

If you encounter issues:

1. Check GitHub Actions logs
2. Review server logs: `docker compose logs`
3. Verify all secrets are set correctly
4. Ensure server meets requirements
5. Test SSH connection manually

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [GitHub Container Registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)

---

**Last Updated:** 2025-10-22
