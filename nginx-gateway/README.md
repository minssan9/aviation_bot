# Nginx Gateway

This directory contains the nginx reverse proxy configuration for routing multiple domains to different backend services.

## Features

- **Multi-domain routing**: Routes traffic based on domain name
  - `aviation-bott.com` → Aviation Bot application
  - `en9door.com` → En9door application
  - `workschd.com` → Work Schedule application
- **SSL/TLS termination**: Handled by Digital Ocean Load Balancer
- **Health checks**: Upstream server health monitoring with automatic failover
- **Error handling**: Custom 503 error pages with automatic retry
- **Rate limiting**: Protects against DoS attacks
- **Security headers**: Adds security-related HTTP headers
- **Gzip compression**: Reduces bandwidth usage

## Architecture

```
Internet → Digital Ocean Load Balancer (HTTPS/SSL) → Nginx Gateway (HTTP) → Backend Services
```

The nginx gateway operates behind a Digital Ocean Load Balancer which handles:
- SSL/TLS termination
- DDoS protection
- Traffic distribution
- Health checks

## Domains

### aviation-bott.com
Routes to the Aviation Bot application (port 3010)

### en9door.com
Routes to the En9door application (update upstream configuration as needed)

### workschd.com
Routes to the Work Schedule application (update upstream configuration as needed)

## Health Checks & Failover

### Upstream Health Checks
Each upstream server is monitored:
- **max_fails**: 3 failed attempts before marking as down
- **fail_timeout**: 30 seconds before retrying
- Automatic failover to backup servers (if configured)

### Gateway Health Check
- Endpoint: `/health`
- Returns: `200 OK` with "healthy" message
- Used by Digital Ocean LB for health monitoring

### Error Handling
- **502/503/504 errors**: Automatically try next upstream server
- **Custom error page**: User-friendly 503 page with retry button
- **proxy_next_upstream**: Automatic failover on errors

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

upstream workschd {
    server workschd-app:PORT;  # Update this
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
