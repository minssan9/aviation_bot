# syntax=docker/dockerfile:1.7

# Frontend build stage
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci && npm cache clean --force
COPY frontend ./
RUN npm run build

# Backend build stage
FROM node:20-alpine AS backend-build
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Production stage
FROM node:20-alpine AS production
WORKDIR /app

# Install tini for signal handling
RUN apk add --no-cache tini

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy dependencies
COPY --from=backend-build --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy application files
COPY --chown=nodejs:nodejs backend ./backend
COPY --from=frontend-build --chown=nodejs:nodejs /app/frontend/dist ./frontend/dist
COPY --chown=nodejs:nodejs package*.json ./

# Switch to non-root user
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); const options = { host: 'localhost', port: 3010, timeout: 2000 }; const req = http.request(options, (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }); req.on('error', () => process.exit(1)); req.end();"

# Expose port
EXPOSE 3010

# Use tini as entrypoint
ENTRYPOINT ["/sbin/tini", "--"]

# Start application
CMD ["node", "backend/src/app.js"]
