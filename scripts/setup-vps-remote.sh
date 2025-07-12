#!/bin/bash

# 🚀 LUNA PLATFORM - REMOTE VPS SETUP
# This script connects to your Hostinger VPS and sets up everything automatically
# Run this script from your local machine: ./scripts/setup-vps-remote.sh

set -e

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

# Configuration
VPS_IP="31.97.193.83"
VPS_USER="root"
PROJECT_DIR="/opt/luna-platform"
REPO_URL="https://github.com/anlaklab/simple-luna.git"

echo "🚀 Luna Platform - Remote VPS Setup"
echo "====================================="
echo "Target VPS: $VPS_USER@$VPS_IP"
echo "Project Directory: $PROJECT_DIR"
echo ""

# Check if we can connect to VPS
log_info "Testing SSH connection to VPS..."
if ssh -o ConnectTimeout=10 -o BatchMode=yes "$VPS_USER@$VPS_IP" exit 2>/dev/null; then
    log_success "SSH connection successful"
else
    log_error "Cannot connect to VPS. Please check:"
    echo "  1. VPS IP address: $VPS_IP"
    echo "  2. SSH key is properly configured"
    echo "  3. VPS is running and accessible"
    echo ""
    echo "To connect manually: ssh $VPS_USER@$VPS_IP"
    exit 1
fi

# Create setup script on VPS
log_info "Creating setup script on VPS..."
cat << 'EOF' | ssh "$VPS_USER@$VPS_IP" 'cat > /tmp/luna-setup.sh'
#!/bin/bash

# 🚀 LUNA PLATFORM - VPS SETUP SCRIPT
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

PROJECT_DIR="/opt/luna-platform"
REPO_URL="https://github.com/anlaklab/simple-luna.git"

log_info "Starting Luna Platform VPS setup..."

# Update system
log_info "Updating system packages..."
export DEBIAN_FRONTEND=noninteractive
apt update && apt upgrade -y

# Install essential packages
log_info "Installing essential packages..."
apt install -y curl wget git htop nano ufw fail2ban unzip software-properties-common \
    apt-transport-https ca-certificates gnupg lsb-release

# Install Docker
log_info "Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt update
    apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    systemctl start docker
    systemctl enable docker
    log_success "Docker installed successfully"
else
    log_success "Docker already installed"
fi

# Install Docker Compose
log_info "Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    log_success "Docker Compose installed"
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
ufw allow 3000/tcp
ufw allow 9090/tcp
ufw allow 3001/tcp
log_success "Firewall configured"

# Configure fail2ban
log_info "Configuring fail2ban..."
systemctl enable fail2ban
systemctl start fail2ban

# Create project directory
log_info "Setting up project directory..."
mkdir -p "$PROJECT_DIR"
cd "$PROJECT_DIR"

# Clone repository
log_info "Cloning Luna Platform repository..."
if [ -d ".git" ]; then
    log_warning "Repository already exists, pulling latest changes..."
    git pull origin main
else
    git clone "$REPO_URL" .
    log_success "Repository cloned successfully"
fi

# Set permissions
chown -R root:root "$PROJECT_DIR"
chmod +x "$PROJECT_DIR/scripts/"*.sh

# Create directories
mkdir -p "$PROJECT_DIR/monitoring/prometheus/data"
mkdir -p "$PROJECT_DIR/monitoring/grafana/data"
mkdir -p "$PROJECT_DIR/logs"
mkdir -p /opt/backups/luna-platform
mkdir -p /opt/backups/database

# Create environment file if it doesn't exist
if [ ! -f "$PROJECT_DIR/.env" ]; then
    log_warning "Creating .env template file..."
    cat > "$PROJECT_DIR/.env" << 'ENVEOF'
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
ENVEOF
    log_warning "Please edit .env file with your actual configuration values"
else
    log_success ".env file already exists"
fi

# Install additional tools
log_info "Installing additional monitoring tools..."
apt install -y sysstat iotop nethogs

# Install SSL certificate tools
log_info "Installing SSL certificate tools..."
apt install -y certbot python3-certbot-nginx

# Set up automatic security updates
log_info "Setting up automatic security updates..."
apt install -y unattended-upgrades
echo 'Unattended-Upgrade::Automatic-Reboot "false";' >> /etc/apt/apt.conf.d/50unattended-upgrades

# Create systemd service
log_info "Creating systemd service..."
cat > /etc/systemd/system/luna-platform.service << 'SERVICEEOF'
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
SERVICEEOF

systemctl daemon-reload
systemctl enable luna-platform.service

log_success "🎉 VPS setup completed successfully!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 NEXT STEPS:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. 🔧 Configure environment variables:"
echo "   nano $PROJECT_DIR/.env"
echo ""
echo "2. 🚀 Deploy Luna Platform:"
echo "   cd $PROJECT_DIR"
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
echo "   https://luna.anlaklab.com"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "System Information:"
echo "OS: $(lsb_release -d | cut -f2)"
echo "Kernel: $(uname -r)"
echo "CPU Cores: $(nproc)"
echo "Memory: $(free -h | grep Mem | awk '{print $2}')"
echo "Disk Space: $(df -h / | awk 'NR==2{print $4}')"
echo "Docker Version: $(docker --version)"
echo "Docker Compose Version: $(docker-compose --version)"
EOF

# Make the script executable and run it
log_info "Executing setup script on VPS..."
ssh "$VPS_USER@$VPS_IP" 'chmod +x /tmp/luna-setup.sh && /tmp/luna-setup.sh'

# Clean up the temporary script
ssh "$VPS_USER@$VPS_IP" 'rm /tmp/luna-setup.sh'

log_success "🎉 Remote VPS setup completed successfully!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 NEXT STEPS:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. 🔧 Configure environment on VPS:"
echo "   ssh $VPS_USER@$VPS_IP"
echo "   cd $PROJECT_DIR"
echo "   nano .env"
echo ""
echo "2. 🚀 Deploy Luna Platform:"
echo "   ./scripts/deploy-hostinger.sh"
echo ""
echo "3. 🔐 Set up SSL certificate:"
echo "   certbot --nginx -d luna.anlaklab.com"
echo ""
echo "4. 📊 Access monitoring:"
echo "   Prometheus: http://$VPS_IP:9090"
echo "   Grafana: http://$VPS_IP:3001"
echo ""
echo "5. 🌐 Access application:"
echo "   Frontend: https://luna.anlaklab.com"
echo "   Backend API: https://luna.anlaklab.com/api/v1"
echo "   API Docs: https://luna.anlaklab.com/api/v1/docs"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🛟 USEFUL COMMANDS:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Connect to VPS:"
echo "  ssh $VPS_USER@$VPS_IP"
echo ""
echo "Monitor services:"
echo "  docker-compose -f docker-compose.hostinger.yml ps"
echo "  docker-compose -f docker-compose.hostinger.yml logs -f"
echo ""
echo "System monitoring:"
echo "  htop"
echo "  docker stats"
echo "  df -h"
echo "  free -h"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
log_success "VPS is ready! Your Luna Platform is configured and ready for deployment! 🚀" 