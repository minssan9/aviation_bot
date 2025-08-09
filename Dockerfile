# syntax=docker/dockerfile:1.7

# ---- Base image ----
FROM node:20-alpine AS base
WORKDIR /app
ENV NODE_ENV=production

# Install openssl for mysql tls if needed
RUN apk add --no-cache tini

# Copy package files
COPY package.json package-lock.json* ./

# Install only production deps by default
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev || npm install --omit=dev

# Copy sources
COPY src ./src
COPY admin ./admin

# Use Tini as init
ENTRYPOINT ["/sbin/tini", "--"]

# Default command
CMD ["node", "src/app.js"]

# Expose admin server port
EXPOSE 3000
