#!/bin/bash

# 🚀 Luna Platform - Hostinger VPS Deployment Script
# Optimized for KVM 4 plan (4 cores, 16GB RAM, 200GB NVMe)

set -e

# Configuration
DOMAIN=${1:-"luna.yourdomain.com"}
EMAIL=${2:-"admin@yourdomain.com"}
VPS_IP=${3:-""}
SSH_KEY_PATH=${4:-"~/.ssh/id_rsa"}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${PURPLE}🚀 Luna Platform - Hostinger VPS Deployment${NC}"
echo -e "${CYAN}Optimized for KVM 4: 4 cores, 16GB RAM, 200GB NVMe${NC}"
echo "=================================================="
echo -e "${BLUE}Domain:${NC} $DOMAIN"
echo -e "${BLUE}Email:${NC} $EMAIL"
echo -e "${BLUE}VPS IP:${NC} $VPS_IP"
echo ""

# Function to run commands on remote server
run_remote() {
    local cmd="$1"
    echo -e "${YELLOW}📡 Running on VPS:${NC} $cmd"
    ssh -i "$SSH_KEY_PATH" root@"$VPS_IP" "$cmd"
}

# Function to copy files to remote server
copy_to_remote() {
    local local_path="$1"
    local remote_path="$2"
    echo -e "${YELLOW}📤 Copying:${NC} $local_path → $remote_path"
    scp -i "$SSH_KEY_PATH" -r "$local_path" root@"$VPS_IP":"$remote_path"
}

# Validate inputs
if [[ -z "$VPS_IP" ]]; then
    echo -e "${RED}❌ Error: VPS IP address is required${NC}"
    echo "Usage: $0 <domain> <email> <vps_ip> [ssh_key_path]"
    echo "Example: $0 luna.yourdomain.com admin@yourdomain.com 142.93.123.456"
    exit 1
fi

# Check if SSH key exists
if [[ ! -f "$SSH_KEY_PATH" ]]; then
    echo -e "${RED}❌ Error: SSH key not found at $SSH_KEY_PATH${NC}"
    exit 1
fi

# Test SSH connection
echo -e "${BLUE}🔐 Testing SSH connection...${NC}"
if ! ssh -i "$SSH_KEY_PATH" -o ConnectTimeout=10 root@"$VPS_IP" "echo 'SSH connection successful'"; then
    echo -e "${RED}❌ Error: Cannot connect to VPS via SSH${NC}"
    echo "Make sure your SSH key is added to the VPS during creation"
    exit 1
fi

echo -e "${GREEN}✅ SSH connection successful${NC}"
echo ""

# =============================================================================
# STEP 1: HIGH-PERFORMANCE SERVER SETUP
# =============================================================================
echo -e "${BLUE}🛠️  STEP 1: Setting up high-performance server...${NC}"

run_remote "apt update && apt upgrade -y"
run_remote "apt install -y curl wget git vim htop ufw iotop nethogs ncdu"

# Configure firewall
echo -e "${BLUE}🔥 Configuring firewall...${NC}"
run_remote "ufw allow 22"      # SSH
run_remote "ufw allow 80"      # HTTP
run_remote "ufw allow 443"     # HTTPS
run_remote "ufw allow 3000"    # Backend (debugging)
run_remote "ufw allow 3001"    # Grafana
run_remote "ufw allow 9090"    # Prometheus
run_remote "ufw allow 6379"    # Redis (internal)
run_remote "ufw --force enable"

# Optimize system for high performance
echo -e "${BLUE}⚡ Optimizing system performance...${NC}"
run_remote "echo 'vm.swappiness=10' >> /etc/sysctl.conf"
run_remote "echo 'net.core.rmem_max=16777216' >> /etc/sysctl.conf"
run_remote "echo 'net.core.wmem_max=16777216' >> /etc/sysctl.conf"
run_remote "echo 'net.ipv4.tcp_rmem=4096 65536 16777216' >> /etc/sysctl.conf"
run_remote "echo 'net.ipv4.tcp_wmem=4096 65536 16777216' >> /etc/sysctl.conf"
run_remote "sysctl -p"

echo -e "${GREEN}✅ High-performance server setup completed${NC}"
echo ""

# =============================================================================
# STEP 2: DOCKER INSTALLATION (OPTIMIZED)
# =============================================================================
echo -e "${BLUE}🐳 STEP 2: Installing Docker (optimized for NVMe)...${NC}"

# Install Docker
run_remote "curl -fsSL https://get.docker.com -o get-docker.sh"
run_remote "sh get-docker.sh"
run_remote "systemctl enable docker"
run_remote "systemctl start docker"

# Install Docker Compose
run_remote "curl -L \"https://github.com/docker/compose/releases/latest/download/docker-compose-\$(uname -s)-\$(uname -m)\" -o /usr/local/bin/docker-compose"
run_remote "chmod +x /usr/local/bin/docker-compose"

# Configure Docker for high performance
echo -e "${BLUE}⚡ Configuring Docker for high performance...${NC}"
run_remote "mkdir -p /etc/docker"
cat > docker-daemon.json << 'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "100m",
    "max-file": "3"
  },
  "storage-driver": "overlay2",
  "default-ulimits": {
    "nofile": {
      "Hard": 64000,
      "Name": "nofile",
      "Soft": 64000
    }
  },
  "max-concurrent-downloads": 10,
  "max-concurrent-uploads": 5
}
EOF

copy_to_remote "docker-daemon.json" "/etc/docker/daemon.json"
rm docker-daemon.json
run_remote "systemctl restart docker"

# Test Docker
run_remote "docker --version"
run_remote "docker-compose --version"

echo -e "${GREEN}✅ Optimized Docker installation completed${NC}"
echo ""

# =============================================================================
# STEP 3: PROJECT DEPLOYMENT (HIGH PERFORMANCE)
# =============================================================================
echo -e "${BLUE}📦 STEP 3: Deploying Luna project (high performance)...${NC}"

# Create project directory
run_remote "mkdir -p /opt/luna"

# Copy project files
echo -e "${YELLOW}📤 Copying project files...${NC}"
copy_to_remote "." "/opt/luna/"

# Create optimized environment file
echo -e "${BLUE}⚙️  Creating high-performance environment configuration...${NC}"
cat > .env.hostinger << EOF
# Luna Hostinger Production Environment (High Performance)
NODE_ENV=production
DOMAIN=$DOMAIN

# High Performance Node.js Settings
UV_THREADPOOL_SIZE=8
NODE_OPTIONS=--max-old-space-size=4096

# File Processing (Large files supported)
MAX_FILE_SIZE=104857600
BODY_PARSER_LIMIT=100mb

# Java High Performance Settings
JAVA_OPTS=-Xmx6g -Xms2g -Djava.awt.headless=true -XX:+UseG1GC -XX:MaxGCPauseMillis=200

# Redis Configuration
REDIS_URL=redis://redis:6379
REDIS_PASSWORD=

# Firebase Configuration (REPLACE WITH YOUR VALUES)
FIREBASE_PROJECT_ID=your-firebase-project
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
FIREBASE_STORAGE_BUCKET=your-project.appspot.com

# OpenAI Configuration (REPLACE WITH YOUR VALUES)
OPENAI_API_KEY=sk-your-openai-api-key

# Security
JWT_SECRET=$(openssl rand -base64 32)
CORS_ORIGIN=https://$DOMAIN

# Database (Optional)
POSTGRES_PASSWORD=$(openssl rand -base64 16)

# Monitoring
GRAFANA_PASSWORD=$(openssl rand -base64 16)

# Email alerts (optional)
SMTP_HOST=smtp.gmail.com:587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=alerts@$DOMAIN
EOF

copy_to_remote ".env.hostinger" "/opt/luna/.env"
rm .env.hostinger

echo -e "${GREEN}✅ High-performance project deployment completed${NC}"
echo ""

# =============================================================================
# STEP 4: SSL CERTIFICATE SETUP
# =============================================================================
echo -e "${BLUE}🔒 STEP 4: Setting up SSL certificates...${NC}"

# Install Certbot
run_remote "apt install -y certbot"

# Create nginx configuration for SSL
cat > nginx.hostinger.conf << 'EOF'
user nginx;
worker_processes auto;
worker_rlimit_nofile 65535;
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

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    # High Performance Settings
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    keepalive_requests 1000;
    types_hash_max_size 2048;
    client_max_body_size 100M;
    client_body_buffer_size 128k;
    client_header_buffer_size 3m;
    large_client_header_buffers 4 256k;

    # Gzip Compression (High Performance)
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=uploads:10m rate=1r/s;

    # Upstream backend server
    upstream backend {
        server luna-server:3000 max_fails=3 fail_timeout=30s;
        keepalive 32;
    }

    # Upstream frontend server
    upstream frontend {
        server luna-client:80 max_fails=3 fail_timeout=30s;
        keepalive 16;
    }

    server {
        listen 80;
        server_name DOMAIN_PLACEHOLDER;
        
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }
        
        location / {
            return 301 https://$server_name$request_uri;
        }
    }

    server {
        listen 443 ssl http2;
        server_name DOMAIN_PLACEHOLDER;
        
        ssl_certificate /etc/letsencrypt/live/DOMAIN_PLACEHOLDER/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/DOMAIN_PLACEHOLDER/privkey.pem;
        
        # High Performance SSL settings
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;
        ssl_stapling on;
        ssl_stapling_verify on;
        
        # API routes - proxy to backend
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
            proxy_read_timeout 300s;
            proxy_connect_timeout 75s;
            proxy_buffering off;
        }
        
        # File upload routes (special rate limiting)
        location ~* /api/.*/upload {
            limit_req zone=uploads burst=5 nodelay;
            
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_read_timeout 600s;
            proxy_connect_timeout 75s;
            proxy_request_buffering off;
            client_max_body_size 100M;
        }
        
        # Monitoring endpoints
        location /grafana/ {
            proxy_pass http://grafana:3000/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
        
        location /prometheus/ {
            proxy_pass http://prometheus:9090/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
        
        # Health check for nginx
        location /nginx-health {
            access_log off;
            return 200 "nginx proxy healthy (Hostinger KVM 4)\n";
            add_header Content-Type text/plain;
        }
        
        # Frontend - proxy to React app
        location / {
            proxy_pass http://frontend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }
        
        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header Referrer-Policy "no-referrer-when-downgrade" always;
        add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
        add_header X-Powered-By "Luna Platform on Hostinger KVM 4" always;
    }
}
EOF

# Replace domain placeholder
sed -i "s/DOMAIN_PLACEHOLDER/$DOMAIN/g" nginx.hostinger.conf
copy_to_remote "nginx.hostinger.conf" "/opt/luna/nginx.hostinger.conf"
rm nginx.hostinger.conf

echo -e "${GREEN}✅ SSL configuration completed${NC}"
echo ""

# =============================================================================
# STEP 5: HIGH-PERFORMANCE APPLICATION STARTUP
# =============================================================================
echo -e "${BLUE}🚀 STEP 5: Starting Luna application (high performance)...${NC}"

# Build and start containers with high performance configuration
echo -e "${YELLOW}⏳ Building containers (this may take 5-10 minutes with NVMe speed)...${NC}"
run_remote "cd /opt/luna && docker-compose -f docker-compose.hostinger.yml build --parallel"

echo -e "${YELLOW}⏳ Starting all services...${NC}"
run_remote "cd /opt/luna && docker-compose -f docker-compose.hostinger.yml up -d"

# Wait for services to be ready
echo -e "${YELLOW}⏳ Waiting for services to start (checking health)...${NC}"
sleep 45

# Check container status
run_remote "cd /opt/luna && docker-compose -f docker-compose.hostinger.yml ps"

echo -e "${GREEN}✅ High-performance application startup completed${NC}"
echo ""

# =============================================================================
# STEP 6: SSL CERTIFICATE GENERATION
# =============================================================================
echo -e "${BLUE}🔐 STEP 6: Generating SSL certificate...${NC}"

# Stop nginx temporarily for certificate generation
run_remote "cd /opt/luna && docker-compose -f docker-compose.hostinger.yml stop luna-nginx"

# Generate certificate
run_remote "certbot certonly --standalone -d $DOMAIN --email $EMAIL --agree-tos --non-interactive"

# Restart nginx with SSL
run_remote "cd /opt/luna && docker-compose -f docker-compose.hostinger.yml up -d luna-nginx"

echo -e "${GREEN}✅ SSL certificate generated and configured${NC}"
echo ""

# =============================================================================
# STEP 7: PERFORMANCE VERIFICATION
# =============================================================================
echo -e "${BLUE}🔍 STEP 7: Performance verification...${NC}"

echo -e "${YELLOW}Testing endpoints with performance checks...${NC}"
sleep 15

# Test endpoints with timing
endpoints=(
    "https://$DOMAIN"
    "https://$DOMAIN/api/v1/health"
    "https://$DOMAIN/api/v1/docs"
    "https://$DOMAIN/grafana/"
    "https://$DOMAIN/prometheus/"
)

for endpoint in "${endpoints[@]}"; do
    response_time=$(curl -o /dev/null -s -w "%{time_total}" -m 10 "$endpoint" 2>/dev/null || echo "timeout")
    if [[ "$response_time" != "timeout" ]]; then
        echo -e "   ${GREEN}✅ $endpoint${NC} (${response_time}s)"
    else
        echo -e "   ${RED}❌ $endpoint${NC} (timeout)"
    fi
done

# Performance statistics
echo -e "${YELLOW}Getting performance statistics...${NC}"
run_remote "cd /opt/luna && docker stats --no-stream --format 'table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}'"

echo ""
echo -e "${GREEN}🎉 HIGH-PERFORMANCE DEPLOYMENT COMPLETED!${NC}"
echo ""
echo -e "${CYAN}🚀 Hostinger KVM 4 Performance Summary:${NC}"
echo -e "${BLUE}   CPU Cores:${NC} 4 cores allocated optimally"
echo -e "${BLUE}   RAM:${NC} 16GB distributed across services"
echo -e "${BLUE}   Storage:${NC} 200GB NVMe for ultra-fast I/O"
echo -e "${BLUE}   Bandwidth:${NC} 16TB monthly allowance"
echo ""
echo -e "${BLUE}🌐 Access Points:${NC}"
echo "   Main Application: https://$DOMAIN"
echo "   API Documentation: https://$DOMAIN/api/v1/docs"
echo "   API Health: https://$DOMAIN/api/v1/health"
echo "   Grafana Dashboard: https://$DOMAIN/grafana/ (admin/[check .env])"
echo "   Prometheus: https://$DOMAIN/prometheus/"
echo ""
echo -e "${BLUE}📊 Performance Monitoring:${NC}"
echo "   SSH: ssh -i $SSH_KEY_PATH root@$VPS_IP"
echo "   Performance: docker stats"
echo "   Logs: docker-compose -f docker-compose.hostinger.yml logs -f"
echo "   Status: docker-compose -f docker-compose.hostinger.yml ps"
echo ""
echo -e "${YELLOW}⚠️  Next Steps for Maximum Performance:${NC}"
echo "   1. Update .env file with your Firebase and OpenAI credentials"
echo "   2. Configure Grafana dashboards for high-performance monitoring"
echo "   3. Set up email alerts for performance thresholds"
echo "   4. Enable Redis caching in your application"
echo "   5. Consider enabling PostgreSQL for advanced features"
echo ""
echo -e "${PURPLE}🌙 Luna Platform is now running at maximum performance on Hostinger KVM 4!${NC}" 