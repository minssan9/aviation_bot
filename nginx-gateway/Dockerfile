FROM nginx:1.25-alpine

# Install certbot for Let's Encrypt SSL certificates
RUN apk add --no-cache certbot certbot-nginx

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Create directory for Let's Encrypt challenges
RUN mkdir -p /var/www/certbot

# Create directory for SSL certificates (will be mounted)
RUN mkdir -p /etc/letsencrypt

# Expose ports
EXPOSE 80 443

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
