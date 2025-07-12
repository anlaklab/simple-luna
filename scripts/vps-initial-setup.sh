#!/bin/bash

# 🚀 LUNA PLATFORM - VPS INITIAL SETUP
# Hostinger VPS Configuration Script
# Run this script on the VPS: ./scripts/vps-initial-setup.sh

set -e

echo "🚀 Luna Platform - VPS Initial Setup"
echo "======================================"
echo "Configuring Hostinger VPS (31.97.193.83) for Luna Platform"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   log_error "This script must be run as root"
   exit 1
fi

# Update system
log_info "Updating system packages..."
apt update && apt upgrade -y

# Install essential packages
log_info "Installing essential packages..."
apt install -y \
    curl \
    wget \
    git \
    htop \
    nano \
    ufw \
    fail2ban \
    unzip \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release

# Install Docker
log_info "Installing Docker..."
if ! command -v docker &> /dev/null; then
    # Add Docker's official GPG key
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    
    # Add Docker repository
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Install Docker
    apt update
    apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # Start and enable Docker
    systemctl start docker
    systemctl enable docker
    
    log_success "Docker installed successfully"
else
    log_success "Docker already installed"
fi

# Install Docker Compose (standalone)
log_info "Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    log_success "Docker Compose installed successfully"
else
    log_success "Docker Compose already installed"
fi

# Configure firewall
log_info "Configuring firewall..."
ufw --force enable
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3000/tcp  # Luna backend
ufw allow 5173/tcp  # Luna frontend (development)
ufw allow 9090/tcp  # Prometheus
ufw allow 3001/tcp  # Grafana
log_success "Firewall configured"

# Configure fail2ban
log_info "Configuring fail2ban..."
systemctl enable fail2ban
systemctl start fail2ban

# Create project directory
log_info "Creating project directory..."
mkdir -p /opt/luna-platform
cd /opt/luna-platform

# Clone the repository
log_info "Cloning Luna Platform repository..."
if [ -d ".git" ]; then
    log_warning "Repository already exists, pulling latest changes..."
    git pull origin main
else
    git clone https://github.com/anlaklab/simple-luna.git .
    log_success "Repository cloned successfully"
fi

# Set up environment variables
log_info "Setting up environment variables..."
if [ ! -f ".env" ]; then
    log_warning ".env file not found. Creating template..."
    cat > .env << EOF
# 🚀 LUNA PLATFORM - PRODUCTION ENVIRONMENT
# Hostinger VPS Configuration

# Server Configuration
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://luna.anlaklab.com
BACKEND_URL=https://luna.anlaklab.com/api/v1

# Database Configuration
# Add your Firebase configuration here
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_STORAGE_BUCKET=your-project.appspot.com

# AI Configuration (Optional)
OPENAI_API_KEY=sk-your-openai-api-key-here
OPENAI_MODEL=gpt-4-turbo-preview

# Aspose.Slides Configuration
ASPOSE_LICENSE_PATH=/app/lib/Aspose.Slides.lic
JAVA_HOME=/usr/lib/jvm/java-11-openjdk

# Upload Configuration
MAX_FILE_SIZE=100MB
UPLOAD_TIMEOUT=300000

# Security
JWT_SECRET=your-jwt-secret-here
CORS_ORIGIN=https://luna.anlaklab.com

# Monitoring
PROMETHEUS_PORT=9090
GRAFANA_PORT=3001
GRAFANA_ADMIN_PASSWORD=admin123

# Redis Configuration
REDIS_URL=redis://luna-redis:6379
REDIS_PASSWORD=your-redis-password

# PostgreSQL Configuration (Optional)
POSTGRES_DB=luna_platform
POSTGRES_USER=luna_user
POSTGRES_PASSWORD=your-postgres-password
POSTGRES_HOST=luna-postgres
POSTGRES_PORT=5432
EOF
    log_warning "Please edit .env file with your actual configuration values"
else
    log_success ".env file already exists"
fi

# Set proper permissions
log_info "Setting proper permissions..."
chown -R root:root /opt/luna-platform
chmod +x /opt/luna-platform/scripts/*.sh

# Create monitoring directories
log_info "Creating monitoring directories..."
mkdir -p /opt/luna-platform/monitoring/prometheus/data
mkdir -p /opt/luna-platform/monitoring/grafana/data
mkdir -p /opt/luna-platform/logs

# Set up log rotation
log_info "Setting up log rotation..."
cat > /etc/logrotate.d/luna-platform << EOF
/opt/luna-platform/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 0644 root root
}
EOF

# Create systemd service for monitoring
log_info "Creating systemd service..."
cat > /etc/systemd/system/luna-platform.service << EOF
[Unit]
Description=Luna Platform Docker Services
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/luna-platform
ExecStart=/usr/local/bin/docker-compose -f docker-compose.hostinger.yml up -d
ExecStop=/usr/local/bin/docker-compose -f docker-compose.hostinger.yml down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable luna-platform.service

# Install system monitoring tools
log_info "Installing system monitoring tools..."
apt install -y sysstat iotop nethogs

# Set up automatic security updates
log_info "Setting up automatic security updates..."
apt install -y unattended-upgrades
echo 'Unattended-Upgrade::Automatic-Reboot "false";' >> /etc/apt/apt.conf.d/50unattended-upgrades

# Create backup directories
log_info "Creating backup directories..."
mkdir -p /opt/backups/luna-platform
mkdir -p /opt/backups/database
mkdir -p /opt/backups/logs

# Install SSL certificate tools
log_info "Installing SSL certificate tools..."
apt install -y certbot python3-certbot-nginx

# Show system information
log_info "System Information:"
echo "=================="
echo "OS: $(lsb_release -d | cut -f2)"
echo "Kernel: $(uname -r)"
echo "Architecture: $(uname -m)"
echo "CPU Cores: $(nproc)"
echo "Memory: $(free -h | grep Mem | awk '{print $2}')"
echo "Disk Space: $(df -h / | awk 'NR==2{print $4}')"
echo "Docker Version: $(docker --version)"
echo "Docker Compose Version: $(docker-compose --version)"
echo ""

# Final setup steps
log_success "🎉 VPS Initial Setup Complete!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 NEXT STEPS:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. 🔧 Edit configuration:"
echo "   nano /opt/luna-platform/.env"
echo ""
echo "2. 🚀 Deploy Luna Platform:"
echo "   cd /opt/luna-platform"
echo "   ./scripts/deploy-hostinger.sh"
echo ""
echo "3. 🔐 Set up SSL certificate:"
echo "   certbot --nginx -d luna.anlaklab.com"
echo ""
echo "4. 📊 Access monitoring:"
echo "   Prometheus: http://31.97.193.83:9090"
echo "   Grafana: http://31.97.193.83:3001"
echo ""
echo "5. 🌐 Access application:"
echo "   Frontend: https://luna.anlaklab.com"
echo "   Backend API: https://luna.anlaklab.com/api/v1"
echo "   API Docs: https://luna.anlaklab.com/api/v1/docs"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🛟 SUPPORT COMMANDS:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Monitor services:"
echo "  docker-compose -f docker-compose.hostinger.yml ps"
echo "  docker-compose -f docker-compose.hostinger.yml logs -f"
echo ""
echo "System monitoring:"
echo "  htop                    # Real-time processes"
echo "  docker stats            # Container resources"
echo "  df -h                   # Disk usage"
echo "  free -h                 # Memory usage"
echo "  ufw status              # Firewall status"
echo ""
echo "Restart services:"
echo "  systemctl restart luna-platform.service"
echo "  ./scripts/deploy-hostinger.sh"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
log_success "VPS is ready for Luna Platform deployment! 🚀" 