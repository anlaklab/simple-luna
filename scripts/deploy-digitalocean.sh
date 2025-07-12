#!/bin/bash

# 🌊 Luna Platform - DigitalOcean VPS Deployment Script
# Complete setup for production deployment on DigitalOcean droplet

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
NC='\033[0m' # No Color

echo -e "${PURPLE}🌊 Luna Platform - DigitalOcean Deployment${NC}"
echo "============================================="
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
    echo "Make sure your SSH key is added to the droplet during creation"
    exit 1
fi

echo -e "${GREEN}✅ SSH connection successful${NC}"
echo ""

# =============================================================================
# STEP 1: SERVER SETUP
# =============================================================================
echo -e "${BLUE}🛠️  STEP 1: Setting up server...${NC}"

run_remote "apt update && apt upgrade -y"
run_remote "apt install -y curl wget git vim htop ufw"

# Configure firewall
echo -e "${BLUE}🔥 Configuring firewall...${NC}"
run_remote "ufw allow 22"      # SSH
run_remote "ufw allow 80"      # HTTP
run_remote "ufw allow 443"     # HTTPS
run_remote "ufw allow 3000"    # Backend (for debugging)
run_remote "ufw allow 3001"    # Grafana
run_remote "ufw allow 9090"    # Prometheus
run_remote "ufw --force enable"

echo -e "${GREEN}✅ Server setup completed${NC}"
echo ""

# =============================================================================
# STEP 2: DOCKER INSTALLATION
# =============================================================================
echo -e "${BLUE}🐳 STEP 2: Installing Docker...${NC}"

# Install Docker
run_remote "curl -fsSL https://get.docker.com -o get-docker.sh"
run_remote "sh get-docker.sh"
run_remote "systemctl enable docker"
run_remote "systemctl start docker"

# Install Docker Compose
run_remote "curl -L \"https://github.com/docker/compose/releases/latest/download/docker-compose-\$(uname -s)-\$(uname -m)\" -o /usr/local/bin/docker-compose"
run_remote "chmod +x /usr/local/bin/docker-compose"

# Test Docker
run_remote "docker --version"
run_remote "docker-compose --version"

echo -e "${GREEN}✅ Docker installation completed${NC}"
echo ""

# =============================================================================
# STEP 3: PROJECT DEPLOYMENT
# =============================================================================
echo -e "${BLUE}📦 STEP 3: Deploying Luna project...${NC}"

# Create project directory
run_remote "mkdir -p /opt/luna"

# Copy project files
echo -e "${YELLOW}📤 Copying project files...${NC}"
copy_to_remote "." "/opt/luna/"

# Create environment file
echo -e "${BLUE}⚙️  Creating environment configuration...${NC}"
cat > .env.production << EOF
# Luna Production Environment
NODE_ENV=production
DOMAIN=$DOMAIN

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

# Grafana
GRAFANA_PASSWORD=$(openssl rand -base64 16)

# Email alerts (optional)
SMTP_HOST=smtp.gmail.com:587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=alerts@$DOMAIN
EOF

copy_to_remote ".env.production" "/opt/luna/.env"
rm .env.production

echo -e "${GREEN}✅ Project deployment completed${NC}"
echo ""

# =============================================================================
# STEP 4: SSL CERTIFICATE SETUP
# =============================================================================
echo -e "${BLUE}🔒 STEP 4: Setting up SSL certificates...${NC}"

# Install Certbot
run_remote "apt install -y certbot"

# Create nginx configuration for SSL
cat > nginx.ssl.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

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
        
        # SSL settings
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;
        
        # API routes - proxy to backend
        location /api/ {
            proxy_pass http://luna-server:3000;
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
        
        # Frontend - proxy to React app
        location / {
            proxy_pass http://luna-client:80;
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
    }
}
EOF

# Replace domain placeholder
sed -i "s/DOMAIN_PLACEHOLDER/$DOMAIN/g" nginx.ssl.conf
copy_to_remote "nginx.ssl.conf" "/opt/luna/nginx.ssl.conf"
rm nginx.ssl.conf

echo -e "${GREEN}✅ SSL configuration completed${NC}"
echo ""

# =============================================================================
# STEP 5: APPLICATION STARTUP
# =============================================================================
echo -e "${BLUE}🚀 STEP 5: Starting Luna application...${NC}"

# Build and start containers
run_remote "cd /opt/luna && docker-compose -f docker-compose.digitalocean.yml build"
run_remote "cd /opt/luna && docker-compose -f docker-compose.digitalocean.yml up -d"

# Wait for services to be ready
echo -e "${YELLOW}⏳ Waiting for services to start...${NC}"
sleep 30

# Check container status
run_remote "cd /opt/luna && docker-compose -f docker-compose.digitalocean.yml ps"

echo -e "${GREEN}✅ Application startup completed${NC}"
echo ""

# =============================================================================
# STEP 6: SSL CERTIFICATE GENERATION
# =============================================================================
echo -e "${BLUE}🔐 STEP 6: Generating SSL certificate...${NC}"

# Stop nginx temporarily for certificate generation
run_remote "cd /opt/luna && docker-compose -f docker-compose.digitalocean.yml stop luna-nginx"

# Generate certificate
run_remote "certbot certonly --standalone -d $DOMAIN --email $EMAIL --agree-tos --non-interactive"

# Update nginx configuration to use SSL
run_remote "cd /opt/luna && cp nginx.ssl.conf nginx.digitalocean.conf"

# Restart nginx with SSL
run_remote "cd /opt/luna && docker-compose -f docker-compose.digitalocean.yml up -d luna-nginx"

echo -e "${GREEN}✅ SSL certificate generated and configured${NC}"
echo ""

# =============================================================================
# STEP 7: FINAL VERIFICATION
# =============================================================================
echo -e "${BLUE}🔍 STEP 7: Final verification...${NC}"

echo -e "${YELLOW}Testing endpoints...${NC}"
sleep 10

# Test endpoints
endpoints=(
    "https://$DOMAIN"
    "https://$DOMAIN/api/v1/health"
    "https://$DOMAIN/api/v1/docs"
    "https://$DOMAIN/grafana/"
    "https://$DOMAIN/prometheus/"
)

for endpoint in "${endpoints[@]}"; do
    if curl -k -s -f -m 10 "$endpoint" > /dev/null 2>&1; then
        echo -e "   ${GREEN}✅ $endpoint${NC}"
    else
        echo -e "   ${RED}❌ $endpoint${NC}"
    fi
done

echo ""
echo -e "${GREEN}🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!${NC}"
echo ""
echo -e "${BLUE}🌐 Access Points:${NC}"
echo "   Main Application: https://$DOMAIN"
echo "   API Documentation: https://$DOMAIN/api/v1/docs"
echo "   API Health: https://$DOMAIN/api/v1/health"
echo "   Grafana Dashboard: https://$DOMAIN/grafana/ (admin/[check .env])"
echo "   Prometheus: https://$DOMAIN/prometheus/"
echo ""
echo -e "${BLUE}📊 Monitoring:${NC}"
echo "   SSH: ssh -i $SSH_KEY_PATH root@$VPS_IP"
echo "   Logs: docker-compose -f docker-compose.digitalocean.yml logs -f"
echo "   Status: docker-compose -f docker-compose.digitalocean.yml ps"
echo ""
echo -e "${YELLOW}⚠️  Next Steps:${NC}"
echo "   1. Update .env file with your Firebase and OpenAI credentials"
echo "   2. Configure Grafana dashboards"
echo "   3. Set up email alerts in Prometheus"
echo "   4. Configure automatic SSL renewal: certbot renew --dry-run"
echo ""
echo -e "${PURPLE}🌙 Luna Platform is now live at https://$DOMAIN${NC}" 