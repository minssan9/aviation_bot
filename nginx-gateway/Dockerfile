FROM nginx:1.25-alpine

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy custom error pages
COPY 50x.html /usr/share/nginx/html/50x.html

# Expose HTTP port (HTTPS handled by Digital Ocean Load Balancer)
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:80/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
