#!/bin/bash

# Aviation Bot Deployment Script
# Deployment script for production environment using host files

set -e

# Configuration
COMPOSE_FILE="docker-compose.yml"
DEPLOYMENT_DIR="/opt/aviation-bot"

echo "🚀 Starting Aviation Bot deployment..."

# Change to deployment directory
if [ -d "$DEPLOYMENT_DIR" ]; then
    cd "$DEPLOYMENT_DIR"
    echo "📂 Changed to deployment directory: $DEPLOYMENT_DIR"
else
    echo "❌ Error: Deployment directory $DEPLOYMENT_DIR not found"
    echo "Please ensure the deployment directory exists and contains the necessary files"
    exit 1
fi

# Check if required files exist
required_files=("$COMPOSE_FILE" ".env")
for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        echo "❌ Error: Required file $file not found in $DEPLOYMENT_DIR"
        exit 1
    fi
done

echo "✅ Required files found"

# Load environment variables
source .env

# Check required environment variables
required_vars=("BOT_TOKEN" "GEMINI_API_KEY" "DATABASE_PASSWORD" "GITHUB_REPOSITORY")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Error: $var is not set in .env file"
        exit 1
    fi
done

echo "✅ Environment variables validated"

# Login to GitHub Container Registry if GITHUB_TOKEN is available
if [ -n "$GITHUB_TOKEN" ] && [ -n "$GITHUB_USERNAME" ]; then
    echo "🔐 Logging into GitHub Container Registry..."
    echo "$GITHUB_TOKEN" | docker login ghcr.io -u "$GITHUB_USERNAME" --password-stdin
else
    echo "⚠️  GITHUB_TOKEN or GITHUB_USERNAME not set. Make sure you're logged into ghcr.io manually"
fi

# Pull latest images
echo "📦 Pulling latest Docker images..."
docker-compose -f "$COMPOSE_FILE" pull

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose -f "$COMPOSE_FILE" down

# Clean up old containers and images
echo "🧹 Cleaning up old containers and images..."
docker system prune -f

# Start services
echo "🔄 Starting services..."
docker-compose -f "$COMPOSE_FILE" up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 30

# Check if services are running
if docker-compose -f "$COMPOSE_FILE" ps | grep -q "Up"; then
    echo "✅ Aviation Bot deployed successfully!"
    echo "📊 Service status:"
    docker-compose -f "$COMPOSE_FILE" ps

    # Show service URLs
    echo "🌐 Service endpoints:"
    echo "   • Admin Interface: http://localhost:3000"
    echo "   • Database: localhost:3306"

else
    echo "❌ Deployment failed. Checking logs..."
    docker-compose -f "$COMPOSE_FILE" logs --tail=50
    exit 1
fi

# Show logs for monitoring
echo "📋 Recent logs:"
docker-compose -f "$COMPOSE_FILE" logs --tail=20

# Show resource usage
echo "💾 Resource usage:"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"

echo "🎉 Deployment completed! Bot is running successfully."