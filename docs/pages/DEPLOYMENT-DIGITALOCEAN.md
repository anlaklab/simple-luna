# 🌊 Luna Platform - DigitalOcean VPS Deployment Guide

Complete guide for deploying Luna Platform on DigitalOcean VPS with Docker + Prometheus + Grafana monitoring.

## 🎯 Overview

This deployment uses:
- **DigitalOcean Droplet**: Ubuntu 22.04 LTS VPS ($5-10/month)
- **Docker Architecture**: Separate containers for better isolation
- **Monitoring Stack**: Prometheus + Grafana + Alerting
- **SSL**: Let's Encrypt automatic certificates
- **Reverse Proxy**: Nginx for routing and load balancing

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│                  NGINX (SSL)                    │
│          Reverse Proxy + Load Balancer         │
└─────────────────┬───────────────────────────────┘
                  │
    ┌─────────────┼─────────────┐
    ▼             ▼             ▼
┌─────────┐  ┌─────────┐  ┌─────────────┐
│Frontend │  │Backend  │  │ Monitoring  │
│(React)  │  │(Node.js)│  │(Prometheus) │
│:80      │  │:3000    │  │:9090/:3001  │
└─────────┘  └─────────┘  └─────────────┘
```

## 🚀 Quick Deployment

### Prerequisites

1. **DigitalOcean Account** with SSH key configured
2. **Domain name** pointing to your droplet IP
3. **Local setup**: Git, SSH client

### One-Command Deployment

```bash
./scripts/deploy-digitalocean.sh luna.yourdomain.com admin@yourdomain.com YOUR_VPS_IP
```

This script will:
- ✅ Setup Ubuntu server with security
- ✅ Install Docker + Docker Compose
- ✅ Deploy Luna application
- ✅ Configure SSL certificates
- ✅ Start monitoring stack
- ✅ Test all endpoints

## 📋 Step-by-Step Manual Deployment

### Step 1: Create DigitalOcean Droplet

1. **Login to DigitalOcean**
2. **Create Droplet**:
   - Image: Ubuntu 22.04 (LTS) x64
   - Plan: Basic ($5-10/month, 1-2GB RAM)
   - Add your SSH key
   - Choose datacenter region
3. **Configure DNS**: Point your domain to droplet IP

### Step 2: Initial Server Setup

```bash
# Connect to VPS
ssh root@YOUR_VPS_IP

# Update system
apt update && apt upgrade -y

# Install essentials
apt install -y curl wget git vim htop ufw

# Configure firewall
ufw allow 22       # SSH
ufw allow 80       # HTTP
ufw allow 443      # HTTPS
ufw allow 3000     # Backend (debugging)
ufw allow 3001     # Grafana
ufw allow 9090     # Prometheus
ufw enable
```

### Step 3: Install Docker

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

### Step 4: Deploy Luna

```bash
# Create project directory
mkdir -p /opt/luna
cd /opt/luna

# Clone or copy project
git clone https://github.com/yourusername/luna-platform.git .
# OR copy files via SCP

# Create environment file
cp .env.example .env
nano .env  # Configure your environment variables
```

### Step 5: Configure Environment

Edit `/opt/luna/.env`:

```bash
# Luna Production Environment
NODE_ENV=production
DOMAIN=luna.yourdomain.com

# Firebase Configuration
FIREBASE_PROJECT_ID=your-firebase-project
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@...
FIREBASE_STORAGE_BUCKET=your-project.appspot.com

# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key

# Security
JWT_SECRET=$(openssl rand -base64 32)
CORS_ORIGIN=https://luna.yourdomain.com

# Grafana
GRAFANA_PASSWORD=$(openssl rand -base64 16)

# Email alerts (optional)
SMTP_HOST=smtp.gmail.com:587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=alerts@yourdomain.com
```

### Step 6: Start Application

```bash
# Build and start all services
docker-compose -f docker-compose.digitalocean.yml build
docker-compose -f docker-compose.digitalocean.yml up -d

# Check status
docker-compose -f docker-compose.digitalocean.yml ps
```

### Step 7: Configure SSL

```bash
# Install Certbot
apt install -y certbot

# Stop nginx temporarily
docker-compose -f docker-compose.digitalocean.yml stop luna-nginx

# Generate certificate
certbot certonly --standalone -d luna.yourdomain.com --email admin@yourdomain.com --agree-tos --non-interactive

# Update nginx config for SSL and restart
docker-compose -f docker-compose.digitalocean.yml up -d luna-nginx
```

## 🔍 Verification

### Test Endpoints

```bash
curl https://luna.yourdomain.com                    # Frontend
curl https://luna.yourdomain.com/api/v1/health      # Backend API
curl https://luna.yourdomain.com/api/v1/docs        # Swagger docs
```

### Access Monitoring

- **Application**: https://luna.yourdomain.com
- **API Docs**: https://luna.yourdomain.com/api/v1/docs
- **Grafana**: https://luna.yourdomain.com/grafana/
- **Prometheus**: https://luna.yourdomain.com/prometheus/

## 📊 Monitoring Setup

### Grafana Configuration

1. **Access Grafana**: https://luna.yourdomain.com/grafana/
2. **Login**: admin / [password from .env]
3. **Add Prometheus datasource**: http://prometheus:9090
4. **Import dashboards**:
   - Node Exporter Full (ID: 1860)
   - Docker Container Metrics (ID: 893)
   - Custom Luna metrics

### Prometheus Alerts

Alerts are configured for:
- High CPU/Memory usage
- Container failures
- Application health issues
- Disk space warnings
- External API failures

## 🛠️ Management Commands

### Container Management

```bash
# View all containers
docker-compose -f docker-compose.digitalocean.yml ps

# View logs
docker-compose -f docker-compose.digitalocean.yml logs -f [service]

# Restart service
docker-compose -f docker-compose.digitalocean.yml restart [service]

# Rebuild and restart
docker-compose -f docker-compose.digitalocean.yml up -d --build [service]
```

### Monitoring Commands

```bash
# Run monitoring script
./scripts/monitor-containers.sh

# Restart all services
./scripts/restart-services.sh

# Check SSL certificate
certbot certificates

# Renew SSL certificate
certbot renew --dry-run
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Frontend Not Loading

```bash
# Check frontend container
docker logs luna-client

# Check nginx configuration
docker exec luna-nginx nginx -t

# Verify files exist
docker exec luna-client ls -la /usr/share/nginx/html/
```

#### 2. Backend API Errors

```bash
# Check backend logs
docker logs luna-server

# Test backend directly
curl http://localhost:3000/api/v1/health

# Check Java/Aspose integration
docker exec luna-server node -e "console.log(require('./lib/aspose.slides.js'))"
```

#### 3. SSL Certificate Issues

```bash
# Check certificate status
certbot certificates

# Test SSL configuration
nginx -t

# Renew certificate manually
certbot renew --force-renewal
```

#### 4. High Resource Usage

```bash
# Check container resources
docker stats

# Check system resources
htop
df -h

# Restart resource-heavy containers
docker-compose restart luna-server
```

### Performance Optimization

#### For High Traffic

```yaml
# In docker-compose.digitalocean.yml
deploy:
  resources:
    limits:
      memory: 4G
      cpus: '2'
  replicas: 2  # Load balance multiple backend instances
```

#### For Large Files

```bash
# Increase file size limits
MAX_FILE_SIZE=1048576000  # 1GB
BODY_PARSER_LIMIT=1000mb
JAVA_OPTS="-Xmx4g -Xms1g"
```

## 🔧 Maintenance

### Regular Tasks

```bash
# Weekly updates
apt update && apt upgrade -y
docker system prune -f

# Monthly certificate renewal (automatic via cron)
certbot renew

# Backup data
docker run --rm -v luna_uploads:/data -v $(pwd):/backup alpine tar czf /backup/luna-backup-$(date +%Y%m%d).tar.gz /data
```

### Scaling

#### Horizontal Scaling

```bash
# Scale backend instances
docker-compose -f docker-compose.digitalocean.yml up -d --scale luna-server=3

# Add load balancing in nginx
upstream backend {
    server luna-server:3000;
    server luna-server_2:3000;
    server luna-server_3:3000;
}
```

#### Vertical Scaling

```bash
# Upgrade droplet to higher plan
# Update resource limits in docker-compose
# Restart services with new resources
```

## 💰 Cost Optimization

### DigitalOcean Pricing

- **Basic Droplet**: $5/month (1GB RAM, 1 CPU, 25GB SSD)
- **Standard Droplet**: $10/month (2GB RAM, 1 CPU, 50GB SSD)
- **Premium Droplet**: $20/month (4GB RAM, 2 CPU, 80GB SSD)

### Cost Savings

- Use **reserved instances** for 1-year commitment (save 20%)
- Enable **backups** only if needed (+20% cost)
- Monitor **bandwidth usage** (1TB included)
- Use **block storage** for large files if needed

## 🎯 Next Steps

1. **Configure environment variables** with your actual credentials
2. **Set up Grafana dashboards** for application monitoring
3. **Configure email alerts** for critical issues
4. **Set up automated backups** for persistent data
5. **Implement CI/CD pipeline** for automated deployments
6. **Add custom metrics** for business logic monitoring

## 📞 Support

- **Logs**: Check container logs first
- **Monitoring**: Use Grafana dashboards
- **Performance**: Monitor Prometheus metrics
- **Issues**: Check troubleshooting section

---

**🌙 Luna Platform deployed on DigitalOcean VPS with professional monitoring and SSL security!** 