# 🚀 LunaSlides.com Production Deployment Guide
## Complete Setup for Hostinger VPS (Ubuntu 22.04)

This guide ensures a fully functional, production-ready deployment with all features working.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [VPS Initial Setup](#vps-initial-setup)
3. [Docker & Dependencies](#docker--dependencies)
4. [Repository Setup](#repository-setup)
5. [Configuration](#configuration)
6. [SSL Certificate Setup](#ssl-certificate-setup)
7. [Deployment](#deployment)
8. [Testing & Verification](#testing--verification)
9. [Monitoring Setup](#monitoring-setup)
10. [Maintenance](#maintenance)

## Prerequisites

### VPS Requirements
- **OS**: Ubuntu 22.04 LTS
- **RAM**: Minimum 16GB (for Aspose.Slides processing)
- **CPU**: 4+ cores recommended
- **Storage**: 50GB+ SSD
- **Ports**: 80, 443, 3000, 3001, 9090 (monitoring)

### Required Accounts & Keys
- Firebase project with credentials
- OpenAI API key
- Domain name pointed to VPS IP
- Aspose.Slides license file

## VPS Initial Setup

### 1. Connect to VPS
```bash
ssh root@your-vps-ip
```

### 2. Create Deploy User
```bash
# Create user with sudo privileges
useradd -m -s /bin/bash deploy
usermod -aG sudo deploy
echo "deploy ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# Set password
passwd deploy

# Switch to deploy user
su - deploy
```

### 3. Update System
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git vim htop
```

### 4. Configure Firewall
```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000/tcp    # API
sudo ufw allow 3001/tcp    # Grafana
sudo ufw allow 9090/tcp    # Prometheus
sudo ufw --force enable
```

## Docker & Dependencies

### 1. Install Docker
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Log out and back in for group changes
exit
su - deploy

# Verify Docker
docker --version
```

### 2. Install Docker Compose
```bash
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
docker-compose --version
```

### 3. Install Java (Required for Aspose.Slides)
```bash
sudo apt install -y openjdk-11-jdk
java -version
```

## Repository Setup

### 1. Clone Repository
```bash
cd ~
git clone https://github.com/your-repo/lunaslides.git
cd lunaslides
```

### 2. Create Required Directories
```bash
mkdir -p temp/{uploads,aspose,conversions}
mkdir -p logs
mkdir -p ssl
```

### 3. Copy License File
```bash
# Copy your Aspose.Slides license file
cp /path/to/Aspose.Slides.Product.Family.lic ./
```

## Configuration

### 1. Environment Variables
```bash
# Copy example env
cp env.example .env

# Edit with your values
nano .env
```

Required values in `.env`:
```env
# Server Configuration
NODE_ENV=production
PORT=3000
CORS_ORIGIN=https://lunaslides.com

# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
FIREBASE_STORAGE_BUCKET=your-project.appspot.com

# OpenAI Configuration
OPENAI_API_KEY=sk-your-api-key
OPENAI_MODEL=gpt-4-turbo-preview

# Security
JWT_SECRET=your-secure-jwt-secret

# Monitoring
GRAFANA_PASSWORD=secure-grafana-password

# SMTP (for alerts)
SMTP_HOST=smtp.gmail.com:587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=alerts@lunaslides.com

# Database (if using PostgreSQL)
POSTGRES_PASSWORD=secure-postgres-password
```

### 2. Create Production Nginx Config
```bash
nano nginx.hostinger.conf
```

Add the following content:
```nginx
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 4096;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';
    access_log /var/log/nginx/access.log main;

    # Performance
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 100M;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=30r/s;
    limit_req_zone $binary_remote_addr zone=upload:10m rate=5r/s;

    # HTTP to HTTPS redirect
    server {
        listen 80;
        server_name lunaslides.com www.lunaslides.com;
        return 301 https://$server_name$request_uri;
    }

    # HTTPS server
    server {
        listen 443 ssl http2;
        server_name lunaslides.com www.lunaslides.com;

        # SSL Configuration
        ssl_certificate /etc/letsencrypt/live/lunaslides.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/lunaslides.com/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256;
        ssl_prefer_server_ciphers off;

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "no-referrer-when-downgrade" always;
        add_header Content-Security-Policy "default-src 'self' https: data: 'unsafe-inline' 'unsafe-eval';" always;

        # Frontend
        location / {
            proxy_pass http://luna-client;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # API with rate limiting
        location /api {
            limit_req zone=api burst=50 nodelay;
            
            proxy_pass http://luna-server:3000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # WebSocket support
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
        }

        # File upload with special rate limit
        location /api/v1/upload {
            limit_req zone=upload burst=10 nodelay;
            client_max_body_size 100M;
            
            proxy_pass http://luna-server:3000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Health check endpoint
        location /nginx-health {
            access_log off;
            return 200 "healthy\n";
        }
    }

    # Monitoring endpoints (internal only)
    server {
        listen 3001 ssl http2;
        server_name lunaslides.com;

        ssl_certificate /etc/letsencrypt/live/lunaslides.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/lunaslides.com/privkey.pem;

        # Grafana
        location / {
            proxy_pass http://grafana:3000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
    }
}
```

## SSL Certificate Setup

### 1. Initial Certificate Generation
```bash
# Stop any running services
docker-compose -f docker-compose.hostinger.yml down

# Generate certificate
docker-compose -f docker-compose.hostinger.yml run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email your-email@domain.com \
  --agree-tos \
  --no-eff-email \
  -d lunaslides.com \
  -d www.lunaslides.com
```

### 2. Auto-renewal Setup
```bash
# Create renewal script
cat > ~/renew-certs.sh << 'EOF'
#!/bin/bash
cd /home/deploy/lunaslides
docker-compose -f docker-compose.hostinger.yml run --rm certbot renew
docker-compose -f docker-compose.hostinger.yml exec luna-nginx nginx -s reload
EOF

chmod +x ~/renew-certs.sh

# Add to crontab
crontab -e
# Add: 0 0 * * 0 /home/deploy/renew-certs.sh >> /home/deploy/cert-renewal.log 2>&1
```

## Deployment

### 1. Build and Start Services
```bash
cd ~/lunaslides

# Build all images
docker-compose -f docker-compose.hostinger.yml build

# Start all services
docker-compose -f docker-compose.hostinger.yml up -d

# Check logs
docker-compose -f docker-compose.hostinger.yml logs -f
```

### 2. Verify Services
```bash
# Check all containers are running
docker-compose -f docker-compose.hostinger.yml ps

# Test API health
curl https://lunaslides.com/api/v1/health

# Test frontend
curl -I https://lunaslides.com
```

## Testing & Verification

### 1. API Documentation
Visit: https://lunaslides.com/api/docs

### 2. Test File Upload
```bash
# Test PPTX conversion
curl -X POST https://lunaslides.com/api/v1/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test.pptx"
```

### 3. Check Aspose License
```bash
# Check license status
curl https://lunaslides.com/api/v1/health/aspose
```

### 4. Monitor Logs
```bash
# API logs
docker-compose -f docker-compose.hostinger.yml logs -f luna-server

# Nginx logs
docker-compose -f docker-compose.hostinger.yml logs -f luna-nginx
```

## Monitoring Setup

### 1. Access Monitoring Tools
- **Prometheus**: http://your-vps-ip:9090
- **Grafana**: https://lunaslides.com:3001
  - Default user: admin
  - Password: (from .env GRAFANA_PASSWORD)

### 2. Configure Alerts
1. Log into Grafana
2. Go to Alerting > Contact points
3. Add email notification channel
4. Create alerts for:
   - High CPU usage (>80%)
   - High memory usage (>80%)
   - API errors (>5% error rate)
   - Disk space low (<10GB)

### 3. Import Dashboards
```bash
# From Grafana UI:
# 1. Go to Dashboards > Import
# 2. Import these dashboard IDs:
#    - 1860 (Node Exporter)
#    - 893 (Docker)
#    - 11133 (Nginx)
```

## Maintenance

### Daily Tasks
```bash
# Check system health
docker-compose -f docker-compose.hostinger.yml ps
df -h
free -m

# Check logs for errors
docker-compose -f docker-compose.hostinger.yml logs --tail=100 | grep ERROR
```

### Weekly Tasks
```bash
# Backup Firebase data
# Clean old conversion files
find ~/lunaslides/temp -type f -mtime +7 -delete

# Update containers
docker-compose -f docker-compose.hostinger.yml pull
docker-compose -f docker-compose.hostinger.yml up -d
```

### Monthly Tasks
```bash
# System updates
sudo apt update && sudo apt upgrade -y

# Docker cleanup
docker system prune -af

# Review monitoring data
# Check SSL certificate expiry
```

## Troubleshooting

### Common Issues

1. **Aspose License Error**
   ```bash
   # Check license file exists
   ls -la ~/lunaslides/Aspose.Slides.Product.Family.lic
   
   # Check Java is installed
   java -version
   ```

2. **Memory Issues**
   ```bash
   # Increase swap
   sudo fallocate -l 8G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   ```

3. **Port Conflicts**
   ```bash
   # Check port usage
   sudo netstat -tlnp | grep -E ':(80|443|3000|3001|9090)'
   ```

4. **Firebase Connection**
   ```bash
   # Test Firebase connection
   docker-compose -f docker-compose.hostinger.yml exec luna-server npm run test:firebase
   ```

## Security Checklist

- [ ] Firewall configured and enabled
- [ ] SSH key authentication only
- [ ] Regular security updates enabled
- [ ] SSL certificates valid
- [ ] Environment variables secured
- [ ] Database passwords strong
- [ ] API rate limiting enabled
- [ ] Monitoring alerts configured

## Performance Optimization

### 1. Enable Redis Caching
Already configured in docker-compose.hostinger.yml

### 2. CDN Setup (Optional)
Consider Cloudflare for static assets

### 3. Database Indexing
If using PostgreSQL, ensure proper indexes

## Backup Strategy

### Automated Backups
```bash
# Create backup script
cat > ~/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/deploy/backups/$(date +%Y%m%d)"
mkdir -p $BACKUP_DIR

# Backup Docker volumes
docker run --rm -v luna_uploads:/data -v $BACKUP_DIR:/backup alpine tar czf /backup/uploads.tar.gz -C /data .
docker run --rm -v luna_logs:/data -v $BACKUP_DIR:/backup alpine tar czf /backup/logs.tar.gz -C /data .

# Backup config
cp /home/deploy/lunaslides/.env $BACKUP_DIR/

# Clean old backups (keep 30 days)
find /home/deploy/backups -type d -mtime +30 -exec rm -rf {} +
EOF

chmod +x ~/backup.sh

# Add to crontab
crontab -e
# Add: 0 2 * * * /home/deploy/backup.sh
```

## Support & Maintenance Contact

For issues or questions:
- Check logs first: `docker-compose -f docker-compose.hostinger.yml logs`
- API Documentation: https://lunaslides.com/api/docs
- Monitoring: https://lunaslides.com:3001

Remember: Always test changes in a staging environment first!