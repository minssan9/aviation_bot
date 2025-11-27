# Nginx Gateway

This directory contains the nginx reverse proxy configuration for routing multiple domains to different backend services.

## Features

- **Multi-domain routing**: Routes traffic based on domain name
  - `aviation-bott.com` → Aviation Bot application
  - `en9door.com` → En9door application
- **SSL/TLS termination**: Handles HTTPS with Let's Encrypt certificates
- **Rate limiting**: Protects against DoS attacks
- **Security headers**: Adds security-related HTTP headers
- **Gzip compression**: Reduces bandwidth usage

## Domains

### aviation-bott.com
Routes to the Aviation Bot application (port 3010)

### en9door.com
Routes to the En9door application (update upstream configuration as needed)

## SSL Certificate Setup

Before deploying, you need to obtain SSL certificates:

### Using Certbot (Manual)

```bash
# For aviation-bott.com
certbot certonly --standalone -d aviation-bott.com -d www.aviation-bott.com

# For en9door.com
certbot certonly --standalone -d en9door.com -d www.en9door.com
```

### Using Docker Compose with Certbot

The nginx gateway can be deployed with certbot for automatic certificate renewal:

```bash
cd nginx-gateway
docker-compose up -d
```

## Configuration

### Updating Upstream Servers

Edit `nginx.conf` and update the upstream blocks:

```nginx
upstream aviation_bot {
    server app:3010;
}

upstream en9door {
    server en9door-app:PORT;  # Update this
}
```

### Rate Limiting

Current limits:
- General: 10 requests/second
- API: 30 requests/second

Adjust in `nginx.conf`:

```nginx
limit_req_zone $binary_remote_addr zone=general:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=api:10m rate=30r/s;
```

## Deployment

### Development

```bash
docker build -t aviation-bot/nginx-gateway .
docker run -p 80:80 -p 443:443 aviation-bot/nginx-gateway
```

### Production with Docker Compose

See root `docker-compose.prod.yml` for production deployment configuration.

## Security

- TLS 1.2 and 1.3 only
- Modern cipher suites
- HSTS enabled
- Security headers (X-Frame-Options, X-Content-Type-Options, etc.)
- Rate limiting on all endpoints

## Logs

Logs are available at:
- Access log: `/var/log/nginx/access.log`
- Error log: `/var/log/nginx/error.log`

## Monitoring

Health check endpoint: `http://localhost:80/`

Docker health check runs every 30 seconds.
