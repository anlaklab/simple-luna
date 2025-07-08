# Luna Server Deployment Guide

Professional deployment documentation for Luna Server with Docker, Docker Compose, and production-ready configurations.

## Table of Contents

- [Quick Start](#quick-start)
- [Environment Setup](#environment-setup)
- [Docker Deployment](#docker-deployment)
- [Production Deployment](#production-deployment)
- [Development Setup](#development-setup)
- [Monitoring & Maintenance](#monitoring--maintenance)
- [Troubleshooting](#troubleshooting)

## Quick Start

### Prerequisites

- Docker 20.x or higher
- Docker Compose 2.x or higher
- Node.js 18.x or higher (for local development)
- 4GB RAM minimum, 8GB recommended
- 20GB free disk space

### 1-Minute Development Setup

```bash
# Clone and navigate to server directory
cd server/

# Copy environment template
cp .env.example .env.development

# Deploy with one command
./scripts/deploy.sh development deploy

# Access the API
curl http://localhost:3000/api/v1/health
# Visit: http://localhost:3000/api/v1/docs
```

### 1-Minute Production Setup

```bash
# Setup environment
cp .env.example .env.production
# Edit .env.production with your configuration

# Generate SSL certificates
./scripts/deploy.sh production ssl

# Deploy
./scripts/deploy.sh production deploy

# Access the API
curl https://your-domain.com/api/v1/health
```

## Environment Setup

### Environment Files

Luna Server uses different environment files for different stages:

| Environment | File | Purpose |
|-------------|------|---------|
| Development | `.env.development` | Local development with hot reloading |
| Staging | `.env.staging` | Testing environment |
| Production | `.env.production` | Production deployment |

### Required Environment Variables

```bash
# Core Configuration
NODE_ENV=production
PORT=3000
API_VERSION=v1

# File Processing
MAX_FILE_SIZE=52428800          # 50MB in bytes
BODY_PARSER_LIMIT=50mb
ASPOSE_TEMP_DIR=/app/temp/aspose
UPLOAD_TEMP_DIR=/app/temp/uploads
ASPOSE_LICENSE_PATH=/path/to/license.lic

# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=service-account@project.iam.gserviceaccount.com
FIREBASE_STORAGE_BUCKET=your-bucket.appspot.com
FIRESTORE_DATABASE_URL=https://your-project.firebaseio.com

# OpenAI Configuration
OPENAI_API_KEY=sk-...

# Feature Flags
FEATURE_FIREBASE_STORAGE=true
FEATURE_AI_TRANSLATION=true
FEATURE_AI_ANALYSIS=true

# Security
CORS_ORIGIN=https://your-domain.com,https://app.your-domain.com

# Redis (Optional)
REDIS_URL=redis://redis:6379
REDIS_PASSWORD=your-redis-password
```

### Firebase Setup

1. **Create Firebase Project**
   ```bash
   # Install Firebase CLI
   npm install -g firebase-tools
   
   # Login and create project
   firebase login
   firebase projects:create luna-server-prod
   ```

2. **Generate Service Account**
   - Go to Firebase Console → Project Settings → Service Accounts
   - Generate new private key
   - Download JSON file
   - Extract values for environment variables

3. **Setup Storage**
   ```bash
   # Enable Storage in Firebase Console
   # Configure security rules for your use case
   ```

### OpenAI Setup

1. **Get API Key**
   - Visit https://platform.openai.com/
   - Create API key
   - Add to `OPENAI_API_KEY` environment variable

2. **Configure Limits**
   - Set up billing limits
   - Monitor usage in OpenAI dashboard

## Docker Deployment

### Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Nginx       │    │   Luna Server   │    │     Redis       │
│  (Reverse Proxy)│────│   (Node.js)     │────│   (Cache)       │
│   Port 80/443   │    │   Port 3000     │    │   Port 6379     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
          │                       │                       │
          └───────────────────────┼───────────────────────┘
                                  │
                      ┌─────────────────┐
                      │    Volumes      │
                      │ (File Storage)  │
                      └─────────────────┘
```

### Deployment Script Usage

The `scripts/deploy.sh` script provides automated deployment for all environments:

```bash
# General syntax
./scripts/deploy.sh <environment> <action>

# Examples
./scripts/deploy.sh development deploy    # Full dev deployment
./scripts/deploy.sh production up         # Start production services
./scripts/deploy.sh staging down          # Stop staging services
./scripts/deploy.sh production logs       # View production logs
./scripts/deploy.sh production backup     # Create backup
```

### Available Actions

| Action | Description |
|--------|-------------|
| `deploy` | Full deployment (build + up + health check) |
| `build` | Build Docker images only |
| `up` | Start services |
| `down` | Stop services |
| `restart` | Restart services |
| `logs` | Show real-time logs |
| `status` | Show service status |
| `health` | Check application health |
| `backup` | Create backup archive |
| `ssl` | Generate SSL certificates |
| `cleanup` | Clean up Docker resources |

## Production Deployment

### Step-by-Step Production Setup

1. **Server Preparation**
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Docker
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   
   # Install Docker Compose
   sudo apt install docker-compose-plugin -y
   
   # Create deployment user
   sudo useradd -m -s /bin/bash luna
   sudo usermod -aG docker luna
   ```

2. **Application Deployment**
   ```bash
   # Switch to deployment user
   sudo su - luna
   
   # Clone repository
   git clone https://github.com/your-org/luna-server.git
   cd luna-server/server
   
   # Setup environment
   cp .env.example .env.production
   nano .env.production  # Edit with your configuration
   
   # Generate SSL certificates (for HTTPS)
   ./scripts/deploy.sh production ssl
   
   # Deploy
   ./scripts/deploy.sh production deploy
   ```

3. **Verify Deployment**
   ```bash
   # Check service status
   ./scripts/deploy.sh production status
   
   # Check health
   ./scripts/deploy.sh production health
   
   # View logs
   ./scripts/deploy.sh production logs
   ```

### SSL Configuration

#### Using Let's Encrypt (Recommended)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Generate certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

#### Using Self-Signed Certificates

```bash
# Generate certificates
./scripts/deploy.sh production ssl

# Certificates will be created in ssl/ directory
ls ssl/
# server.crt  server.key
```

### Nginx Configuration

The included Nginx configuration provides:

- **SSL/TLS Termination** with modern security headers
- **Rate Limiting** to prevent abuse
- **Gzip Compression** for better performance
- **Request Routing** with specialized handling
- **Health Check Monitoring** for load balancers
- **Error Handling** with JSON responses

Custom configuration can be modified in `nginx/conf.d/default.conf`.

### Resource Requirements

#### Minimum Requirements
- **CPU:** 2 cores
- **RAM:** 4GB
- **Storage:** 20GB
- **Network:** 100 Mbps

#### Recommended for Production
- **CPU:** 4 cores
- **RAM:** 8GB
- **Storage:** 100GB SSD
- **Network:** 1 Gbps

### Scaling Configuration

#### Horizontal Scaling
```yaml
# docker-compose.yml
services:
  luna-server:
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 1G
          cpus: '0.5'
```

#### Load Balancing
```nginx
# nginx/conf.d/default.conf
upstream luna_backend {
    server luna-server-1:3000;
    server luna-server-2:3000;
    server luna-server-3:3000;
    keepalive 32;
}
```

## Development Setup

### Development Environment

The development setup includes additional tools:

- **Hot Reloading** with `tsx watch`
- **Debug Port** exposed on 9229
- **Redis Commander** GUI on port 8081
- **File Browser** for file management on port 8080
- **Volume Mounting** for real-time code changes

```bash
# Start development environment
./scripts/deploy.sh development deploy

# Access services
# API: http://localhost:3000
# Docs: http://localhost:3000/api/v1/docs
# Redis GUI: http://localhost:8081
# File Browser: http://localhost:8080
```

### Development Tools

#### VS Code Debugging

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Attach to Docker",
      "type": "node",
      "request": "attach",
      "port": 9229,
      "address": "localhost",
      "localRoot": "${workspaceFolder}/server/src",
      "remoteRoot": "/app/src",
      "protocol": "inspector"
    }
  ]
}
```

#### API Testing

```bash
# Using curl
curl -X POST http://localhost:3000/api/v1/pptx2json \
  -F "file=@example.pptx" \
  -F "options={\"includeMetadata\":true}"

# Using HTTPie
http POST localhost:3000/api/v1/json2pptx \
  presentationData:='{"metadata":{"id":"test"},"slides":[]}'
```

## Monitoring & Maintenance

### Health Monitoring

#### Application Health
```bash
# Check application health
curl http://localhost:3000/api/v1/health

# Expected response
{
  "success": true,
  "data": {
    "status": "healthy",
    "services": {
      "conversion": "healthy",
      "aspose": "healthy",
      "firebase": "healthy"
    }
  }
}
```

#### Docker Health Checks
```bash
# Check container health
docker ps --filter "health=healthy"
docker ps --filter "health=unhealthy"

# Inspect health check logs
docker inspect luna-server-app | jq '.[0].State.Health'
```

### Logging

#### View Logs
```bash
# All services
./scripts/deploy.sh production logs

# Specific service
docker-compose logs -f luna-server
docker-compose logs -f nginx
docker-compose logs -f redis
```

#### Log Files
- **Application logs:** `volumes/logs/app.log`
- **Nginx logs:** `volumes/logs/nginx/`
- **Docker logs:** `docker-compose logs`

### Backup & Recovery

#### Automated Backups
```bash
# Create backup
./scripts/deploy.sh production backup

# Backups are stored in backups/ directory
ls backups/
# 20240115_143022_production.tar.gz
```

#### Backup Contents
- Volume data (uploads, downloads, cache)
- Configuration files
- Application logs
- Environment files

#### Recovery Process
```bash
# Stop services
./scripts/deploy.sh production down

# Extract backup
tar -xzf backups/20240115_143022_production.tar.gz

# Restore volumes
cp -r 20240115_143022_production/volumes/* volumes/

# Restart services
./scripts/deploy.sh production up
```

### Updates & Maintenance

#### Application Updates
```bash
# Pull latest code
git pull origin main

# Rebuild and deploy
./scripts/deploy.sh production build
./scripts/deploy.sh production restart
```

#### Security Updates
```bash
# Update base images
docker-compose pull
./scripts/deploy.sh production deploy

# Update system packages
sudo apt update && sudo apt upgrade -y
```

## Troubleshooting

### Common Issues

#### 1. Container Won't Start
```bash
# Check logs
docker-compose logs luna-server

# Common causes:
# - Environment variables missing
# - Ports already in use
# - Insufficient permissions
# - Missing volumes
```

#### 2. Health Check Failing
```bash
# Check application logs
./scripts/deploy.sh production logs

# Test health endpoint directly
curl -v http://localhost:3000/api/v1/health

# Common causes:
# - Service dependencies not ready
# - Configuration errors
# - Network connectivity issues
```

#### 3. File Upload Issues
```bash
# Check volume permissions
ls -la volumes/uploads/

# Fix permissions
sudo chown -R 1001:1001 volumes/

# Check disk space
df -h volumes/
```

#### 4. High Memory Usage
```bash
# Monitor resource usage
docker stats

# Check for memory leaks
docker exec luna-server-app node --expose-gc -e "global.gc(); console.log(process.memoryUsage())"

# Adjust memory limits in docker-compose.yml
```

### Performance Tuning

#### Node.js Optimization
```bash
# Environment variables for production
NODE_OPTIONS="--max-old-space-size=4096 --optimize-for-size"
UV_THREADPOOL_SIZE=16
```

#### Nginx Optimization
```nginx
# worker processes
worker_processes auto;

# worker connections
worker_connections 1024;

# buffer sizes
client_body_buffer_size 128k;
client_max_body_size 100m;
```

#### Redis Optimization
```bash
# Redis configuration
maxmemory 256mb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
```

### Debug Mode

#### Enable Debug Logging
```bash
# Add to environment file
DEBUG=luna:*
LOG_LEVEL=debug

# Restart services
./scripts/deploy.sh production restart
```

#### Container Shell Access
```bash
# Access running container
docker exec -it luna-server-app /bin/sh

# Check application state
ps aux
netstat -tlnp
cat /app/logs/app.log
```

### Support & Resources

- **Documentation:** `/api/v1/docs`
- **Health Check:** `/api/v1/health`
- **GitHub Issues:** [Repository Issues](https://github.com/your-org/luna-server/issues)
- **Email Support:** support@lunaserver.com

### Emergency Procedures

#### Complete System Recovery
```bash
# 1. Stop all services
./scripts/deploy.sh production down

# 2. Clean up Docker
./scripts/deploy.sh production cleanup

# 3. Restore from backup
tar -xzf backups/latest_backup.tar.gz
cp -r backup_data/* ./

# 4. Rebuild and deploy
./scripts/deploy.sh production deploy

# 5. Verify health
./scripts/deploy.sh production health
```

#### Rollback Deployment
```bash
# 1. Checkout previous version
git checkout <previous-commit>

# 2. Rebuild and deploy
./scripts/deploy.sh production build
./scripts/deploy.sh production restart

# 3. Verify functionality
curl http://localhost:3000/api/v1/health
```

---

## Security Considerations

### Production Security Checklist

- [ ] Environment variables properly configured
- [ ] SSL/TLS certificates installed and valid
- [ ] Firewall configured (only necessary ports open)
- [ ] Regular security updates applied
- [ ] Backup encryption enabled
- [ ] Access logs monitored
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] Security headers enabled
- [ ] Container running as non-root user

### Security Headers

The Nginx configuration includes security headers:

```nginx
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: default-src 'self'; ...
```

### Network Security

```bash
# Configure firewall
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw --force enable

# Block unnecessary ports
sudo ufw deny 3000   # Direct API access
sudo ufw deny 6379   # Redis
```

This deployment guide provides a complete production-ready setup for Luna Server with professional DevOps practices, monitoring, and maintenance procedures. 