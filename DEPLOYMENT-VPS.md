# 🚀 Luna Platform - VPS Deployment Guide

## 📋 Overview

This guide walks you through deploying Luna Platform on your Hostinger VPS with complete automation scripts.

**Target Environment:**
- **VPS Provider**: Hostinger KVM 4 VPS
- **IP Address**: 31.97.193.83
- **Specifications**: 4 CPU cores, 16GB RAM, 200GB NVMe SSD
- **OS**: Ubuntu 22.04 LTS (recommended)

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Hostinger VPS (31.97.193.83)                │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Luna Client   │  │   Luna Server   │  │   Luna Nginx    │ │
│  │  (React App)    │  │  (Node.js API)  │  │ (Reverse Proxy) │ │
│  │    Port: 3000   │  │    Port: 3001   │  │   Port: 80/443  │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Prometheus    │  │     Grafana     │  │      Redis      │ │
│  │  (Monitoring)   │  │  (Dashboards)   │  │    (Cache)      │ │
│  │    Port: 9090   │  │    Port: 3002   │  │    Port: 6379   │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐                      │
│  │   PostgreSQL    │  │   File Storage  │                      │
│  │   (Optional)    │  │   (Uploads)     │                      │
│  │    Port: 5432   │  │                 │                      │
│  └─────────────────┘  └─────────────────┘                      │
└─────────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start (Automated)

### Step 1: Connect to VPS
```bash
ssh root@31.97.193.83
```

### Step 2: Download and Run Setup Script
```bash
# Download setup script
wget https://raw.githubusercontent.com/anlaklab/simple-luna/main/scripts/vps-initial-setup.sh

# Make it executable
chmod +x vps-initial-setup.sh

# Run the setup
./vps-initial-setup.sh
```

### Step 3: Configure Environment
```bash
# Edit configuration
nano /opt/luna-platform/.env

# Add your Firebase credentials and other secrets
```

### Step 4: Deploy Application
```bash
cd /opt/luna-platform
./scripts/deploy-hostinger.sh
```

### Step 5: Set up SSL Certificate
```bash
# Install SSL certificate for your domain
certbot --nginx -d luna.anlaklab.com
```

## 📚 Manual Setup (Detailed)

### 1. System Preparation

```bash
# Update system
apt update && apt upgrade -y

# Install essential packages
apt install -y curl wget git htop nano ufw fail2ban unzip
```

### 2. Docker Installation

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Start Docker service
systemctl start docker
systemctl enable docker

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
```

### 3. Security Configuration

```bash
# Configure firewall
ufw --force enable
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3000/tcp
ufw allow 9090/tcp
ufw allow 3001/tcp

# Configure fail2ban
systemctl enable fail2ban
systemctl start fail2ban
```

### 4. Project Setup

```bash
# Create project directory
mkdir -p /opt/luna-platform
cd /opt/luna-platform

# Clone repository
git clone https://github.com/anlaklab/simple-luna.git .

# Set permissions
chown -R root:root /opt/luna-platform
chmod +x scripts/*.sh
```

### 5. Environment Configuration

Create and configure `/opt/luna-platform/.env`:

```env
# 🚀 LUNA PLATFORM - PRODUCTION ENVIRONMENT
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://luna.anlaklab.com
BACKEND_URL=https://luna.anlaklab.com/api/v1

# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_STORAGE_BUCKET=your-project.appspot.com

# OpenAI Configuration (Optional)
OPENAI_API_KEY=sk-your-openai-api-key-here
OPENAI_MODEL=gpt-4-turbo-preview

# Aspose.Slides Configuration
ASPOSE_LICENSE_PATH=/app/lib/Aspose.Slides.lic
JAVA_HOME=/usr/lib/jvm/java-11-openjdk

# Security
JWT_SECRET=your-jwt-secret-here
CORS_ORIGIN=https://luna.anlaklab.com

# File Upload
MAX_FILE_SIZE=100MB
UPLOAD_TIMEOUT=300000

# Monitoring
PROMETHEUS_PORT=9090
GRAFANA_PORT=3001
GRAFANA_ADMIN_PASSWORD=your-secure-password

# Redis
REDIS_URL=redis://luna-redis:6379
REDIS_PASSWORD=your-redis-password

# PostgreSQL (Optional)
POSTGRES_DB=luna_platform
POSTGRES_USER=luna_user
POSTGRES_PASSWORD=your-postgres-password
POSTGRES_HOST=luna-postgres
POSTGRES_PORT=5432
```

### 6. Deploy Application

```bash
# Run deployment script
./scripts/deploy-hostinger.sh
```

### 7. SSL Certificate Setup

```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Get SSL certificate
certbot --nginx -d luna.anlaklab.com

# Set up auto-renewal
crontab -e
# Add this line:
# 0 12 * * * /usr/bin/certbot renew --quiet
```

## 🔧 Configuration Files

### Docker Compose Configuration
The deployment uses `docker-compose.hostinger.yml` which includes:

- **Luna Client**: React frontend with optimized build
- **Luna Server**: Node.js backend with Aspose.Slides
- **Nginx**: Reverse proxy with SSL termination
- **Redis**: Caching layer for performance
- **Prometheus**: Metrics collection
- **Grafana**: Monitoring dashboards

### Nginx Configuration
Automatic configuration for:
- SSL termination
- Reverse proxy to backend
- Static file serving
- Compression and caching
- Rate limiting

## 📊 Monitoring Stack

### Prometheus Metrics
Access at: `http://31.97.193.83:9090`

**Available Metrics:**
- System resources (CPU, memory, disk)
- Docker container metrics
- Application metrics
- HTTP request metrics
- Error rates and response times

### Grafana Dashboards
Access at: `http://31.97.193.83:3001`

**Default Login:**
- Username: `admin`
- Password: Set in `.env` file

**Pre-configured Dashboards:**
- System Overview
- Docker Containers
- Application Performance
- Error Monitoring
- Business Metrics

## 🛠️ Management Commands

### Service Management
```bash
# View all services
docker-compose -f docker-compose.hostinger.yml ps

# View logs
docker-compose -f docker-compose.hostinger.yml logs -f

# View specific service logs
docker-compose -f docker-compose.hostinger.yml logs -f luna-server

# Restart services
docker-compose -f docker-compose.hostinger.yml restart

# Stop services
docker-compose -f docker-compose.hostinger.yml down

# Start services
docker-compose -f docker-compose.hostinger.yml up -d
```

### System Monitoring
```bash
# System resources
htop                    # Real-time processes
docker stats            # Container resources
df -h                   # Disk usage
free -h                 # Memory usage
iotop                   # I/O monitoring
nethogs                 # Network monitoring

# Service status
systemctl status luna-platform.service
ufw status              # Firewall status
```

### Backup and Maintenance
```bash
# Backup database
docker-compose -f docker-compose.hostinger.yml exec luna-postgres pg_dump -U luna_user luna_platform > /opt/backups/database/backup-$(date +%Y%m%d).sql

# Backup uploads
tar -czf /opt/backups/luna-platform/uploads-$(date +%Y%m%d).tar.gz /opt/luna-platform/uploads/

# Clean up old containers
docker system prune -a --volumes

# Update application
git pull origin main
./scripts/deploy-hostinger.sh
```

## 🔍 Troubleshooting

### Common Issues

**1. Docker containers not starting**
```bash
# Check logs
docker-compose -f docker-compose.hostinger.yml logs

# Check system resources
docker stats
free -h
df -h
```

**2. SSL certificate issues**
```bash
# Check certificate status
certbot certificates

# Renew certificates
certbot renew --dry-run
```

**3. Database connection issues**
```bash
# Check PostgreSQL logs
docker-compose -f docker-compose.hostinger.yml logs luna-postgres

# Test database connection
docker-compose -f docker-compose.hostinger.yml exec luna-postgres psql -U luna_user -d luna_platform
```

**4. High memory usage**
```bash
# Check Java heap usage
docker-compose -f docker-compose.hostinger.yml exec luna-server jstat -gc 1

# Restart services to clear memory
docker-compose -f docker-compose.hostinger.yml restart
```

### Performance Optimization

**1. Monitoring Resource Usage**
```bash
# Check container resource usage
docker stats --no-stream

# Monitor system load
uptime
iostat 1 5
```

**2. Optimizing Database**
```bash
# Analyze database performance
docker-compose -f docker-compose.hostinger.yml exec luna-postgres psql -U luna_user -d luna_platform -c "ANALYZE;"

# Vacuum database
docker-compose -f docker-compose.hostinger.yml exec luna-postgres psql -U luna_user -d luna_platform -c "VACUUM ANALYZE;"
```

**3. Log Management**
```bash
# Check log sizes
du -sh /opt/luna-platform/logs/

# Clean old logs
find /opt/luna-platform/logs/ -name "*.log" -mtime +30 -delete
```

## 🔐 Security Recommendations

### 1. System Security
- Keep system updated with automatic security updates
- Use fail2ban for intrusion prevention
- Configure proper firewall rules
- Regular security audits

### 2. Application Security
- Use strong passwords and JWT secrets
- Enable SSL/TLS for all communications
- Regular dependency updates
- Implement proper input validation

### 3. Database Security
- Use strong database passwords
- Enable SSL for database connections
- Regular database backups
- Access control and user management

### 4. Network Security
- Configure proper firewall rules
- Use VPN for administrative access
- Monitor network traffic
- Regular security scans

## 📈 Scaling Considerations

### Horizontal Scaling
- Load balancer configuration
- Multiple server instances
- Database clustering
- CDN integration

### Vertical Scaling
- Upgrade VPS resources
- Optimize application performance
- Database optimization
- Caching strategies

## 🆘 Support

### Documentation
- [Luna Platform Documentation](https://github.com/anlaklab/simple-luna)
- [Docker Documentation](https://docs.docker.com/)
- [Nginx Documentation](https://nginx.org/en/docs/)

### Monitoring
- Prometheus: `http://31.97.193.83:9090`
- Grafana: `http://31.97.193.83:3001`
- Application: `https://luna.anlaklab.com`

### Logs
- Application logs: `/opt/luna-platform/logs/`
- Docker logs: `docker-compose logs`
- System logs: `/var/log/`

---

## 🎉 Deployment Complete!

After following this guide, you should have:

✅ **Fully configured Hostinger VPS**
✅ **Luna Platform deployed and running**
✅ **SSL certificate installed**
✅ **Monitoring stack active**
✅ **Backup system configured**
✅ **Security measures in place**

Access your application at: **https://luna.anlaklab.com**

For any issues or questions, check the troubleshooting section or contact support. 