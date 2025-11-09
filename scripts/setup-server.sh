#!/bin/bash

# Aviation Bot - Server Setup Script
# This script prepares a fresh server for deployment

set -e

echo "=========================================="
echo "Aviation Bot - Server Setup"
echo "=========================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root or with sudo${NC}"
    exit 1
fi

echo -e "${GREEN}Step 1: Updating system packages...${NC}"
apt-get update
apt-get upgrade -y

echo ""
echo -e "${GREEN}Step 2: Installing required packages...${NC}"
apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git \
    ufw

echo ""
echo -e "${GREEN}Step 3: Installing Docker...${NC}"

# Remove old Docker versions
apt-get remove -y docker docker-engine docker.io containerd runc || true

# Add Docker's official GPG key
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

# Set up Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Start and enable Docker
systemctl start docker
systemctl enable docker

# Verify Docker installation
docker --version
docker compose version

echo ""
echo -e "${GREEN}Step 4: Creating deployment directory...${NC}"

# Prompt for installation path
read -p "Enter installation path (default: /opt/aviation_bot): " INSTALL_PATH
INSTALL_PATH=${INSTALL_PATH:-/opt/aviation_bot}

mkdir -p "$INSTALL_PATH"
cd "$INSTALL_PATH"

echo ""
echo -e "${GREEN}Step 5: Setting up GitHub repository...${NC}"

read -p "Enter your GitHub username: " GITHUB_USER
read -p "Enter repository name (default: aviation_bot): " REPO_NAME
REPO_NAME=${REPO_NAME:-aviation_bot}

# Clone repository
if [ -d .git ]; then
    echo "Repository already exists, pulling latest changes..."
    git pull origin main
else
    git clone "https://github.com/$GITHUB_USER/$REPO_NAME.git" .
fi

echo ""
echo -e "${GREEN}Step 6: Creating environment file...${NC}"

if [ -f .env ]; then
    echo -e "${YELLOW}Warning: .env file already exists${NC}"
    read -p "Do you want to overwrite it? (y/n): " OVERWRITE
    if [ "$OVERWRITE" != "y" ]; then
        echo "Skipping .env creation"
    else
        cp .env.example .env
        echo -e "${YELLOW}Please edit .env file with your credentials${NC}"
    fi
else
    cp .env.example .env
    echo -e "${YELLOW}Please edit .env file with your credentials${NC}"
fi

echo ""
echo -e "${GREEN}Step 7: Configuring firewall...${NC}"

# Configure UFW
ufw --force enable
ufw allow ssh
ufw allow 3000/tcp  # Admin server
ufw status

echo ""
echo -e "${GREEN}Step 8: Setting up Docker logging...${NC}"

# Configure Docker daemon for log rotation
cat > /etc/docker/daemon.json <<EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF

systemctl restart docker

echo ""
echo -e "${GREEN}Step 9: Setting up systemd service (optional)...${NC}"

read -p "Do you want to create a systemd service for auto-start? (y/n): " CREATE_SERVICE

if [ "$CREATE_SERVICE" = "y" ]; then
    cat > /etc/systemd/system/aviation-bot.service <<EOF
[Unit]
Description=Aviation Bot
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$INSTALL_PATH
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable aviation-bot.service

    echo -e "${GREEN}Systemd service created and enabled${NC}"
fi

echo ""
echo -e "${GREEN}Step 10: Testing Docker Compose...${NC}"

# Test docker compose configuration
if docker compose config > /dev/null 2>&1; then
    echo -e "${GREEN}Docker Compose configuration is valid${NC}"
else
    echo -e "${RED}Error: Docker Compose configuration is invalid${NC}"
    exit 1
fi

echo ""
echo "=========================================="
echo -e "${GREEN}Setup Complete!${NC}"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Edit the .env file with your credentials:"
echo -e "   ${YELLOW}nano $INSTALL_PATH/.env${NC}"
echo ""
echo "2. Start the application:"
echo -e "   ${YELLOW}cd $INSTALL_PATH${NC}"
echo -e "   ${YELLOW}docker compose up -d${NC}"
echo ""
echo "3. View logs:"
echo -e "   ${YELLOW}docker compose logs -f${NC}"
echo ""
echo "4. Set up GitHub Actions secrets in your repository:"
echo "   - DEPLOY_HOST (this server's IP)"
echo "   - DEPLOY_USER (current user or deployment user)"
echo "   - DEPLOY_SSH_KEY (SSH private key)"
echo "   - DEPLOY_PATH ($INSTALL_PATH)"
echo ""
echo "5. For detailed deployment instructions, see:"
echo -e "   ${YELLOW}.github/DEPLOYMENT.md${NC}"
echo ""

# Display server information
echo "Server Information:"
echo "==================="
echo "IP Address: $(curl -s ifconfig.me)"
echo "Install Path: $INSTALL_PATH"
echo "Docker Version: $(docker --version)"
echo "Docker Compose Version: $(docker compose version)"
echo ""

echo -e "${GREEN}Happy deploying! 🚀${NC}"
