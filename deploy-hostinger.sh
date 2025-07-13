#!/bin/bash

# 🚀 LunaSlides.com Hostinger VPS Deployment Script
# This script automates the entire deployment process

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="lunaslides.com"
VPS_USER="deploy"
PROJECT_DIR="/home/$VPS_USER/lunaslides"
BACKUP_DIR="/home/$VPS_USER/backups"

# Functions
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
    exit 1
}

# Check if running as deploy user
check_user() {
    if [ "$USER" != "$VPS_USER" ]; then
        log_error "This script must be run as the $VPS_USER user"
    fi
}

# Create backup
create_backup() {
    log_info "Creating backup..."
    BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
    BACKUP_PATH="$BACKUP_DIR/$BACKUP_DATE"
    
    mkdir -p "$BACKUP_PATH"
    
    # Backup current deployment
    if [ -d "$PROJECT_DIR" ]; then
        cp -r "$PROJECT_DIR" "$BACKUP_PATH/"
        log_success "Backup created at $BACKUP_PATH"
    else
        log_info "No existing deployment to backup"
    fi
}

# Update code from repository
update_code() {
    log_info "Updating code from repository..."
    
    # Clone or pull latest code
    if [ ! -d "$PROJECT_DIR" ]; then
        log_info "Cloning repository..."
        git clone https://github.com/lunaslides/luna.git "$PROJECT_DIR"
    else
        log_info "Pulling latest changes..."
        cd "$PROJECT_DIR"
        git fetch origin
        git reset --hard origin/main
    fi
    
    log_success "Code updated successfully"
}

# Setup environment
setup_environment() {
    log_info "Setting up environment..."
    
    cd "$PROJECT_DIR"
    
    # Check for .env file
    if [ ! -f .env ]; then
        if [ -f env.example ]; then
            cp env.example .env
            log_warning ".env file created from env.example. Please configure it properly!"
            log_error "Edit .env file with your configuration before continuing"
        else
            log_error "No env.example file found!"
        fi
    fi
    
    # Ensure required directories exist
    mkdir -p logs
    mkdir -p temp/uploads
    mkdir -p temp/aspose
    mkdir -p temp/processed
    
    # Set proper permissions
    chmod -R 755 logs temp
    
    log_success "Environment setup complete"
}

# Ensure Docker is installed
ensure_docker() {
    log_info "Checking Docker installation..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed! Please install Docker first."
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed! Please install Docker Compose first."
    fi
    
    # Check if user is in docker group
    if ! groups | grep -q docker; then
        log_error "User $USER is not in docker group! Run: sudo usermod -aG docker $USER"
    fi
    
    log_success "Docker is properly installed"
}

# Configure firewall
configure_firewall() {
    log_info "Configuring firewall..."
    
    # Check if ufw is installed
    if command -v ufw &> /dev/null; then
        # Allow SSH
        sudo ufw allow 22/tcp
        
        # Allow HTTP and HTTPS
        sudo ufw allow 80/tcp
        sudo ufw allow 443/tcp
        
        # Allow monitoring ports (internal only)
        sudo ufw allow from 172.16.0.0/12 to any port 3100 # Loki
        sudo ufw allow from 172.16.0.0/12 to any port 9090 # Prometheus
        sudo ufw allow from 172.16.0.0/12 to any port 3000 # Grafana
        
        # Enable firewall
        sudo ufw --force enable
        
        log_success "Firewall configured"
    else
        log_warning "UFW not found, skipping firewall configuration"
    fi
}

# Setup Nginx configuration
setup_nginx() {
    log_info "Setting up Nginx configuration..."
    
    cd "$PROJECT_DIR"
    
    # Create SSL directories
    mkdir -p nginx/ssl
    mkdir -p certbot/conf
    mkdir -p certbot/www
    
    # Create dhparam if not exists
    if [ ! -f nginx/ssl/dhparam.pem ]; then
        log_info "Generating dhparam.pem (this may take a while)..."
        openssl dhparam -out nginx/ssl/dhparam.pem 2048
    fi
    
    log_success "Nginx configuration ready"
}

# Setup monitoring stack
setup_monitoring() {
    log_info "Setting up monitoring stack..."
    
    cd "$PROJECT_DIR"
    
    # Create monitoring directories
    mkdir -p monitoring/prometheus/data
    mkdir -p monitoring/grafana/data
    mkdir -p monitoring/loki/data
    
    # Set proper permissions for Grafana
    sudo chown -R 472:472 monitoring/grafana/data
    
    # Set proper permissions for Prometheus
    sudo chown -R 65534:65534 monitoring/prometheus/data
    
    # Set proper permissions for Loki
    sudo chown -R 10001:10001 monitoring/loki/data
    
    log_success "Monitoring stack configured"
}

# Setup SSL certificates
setup_ssl() {
    log_info "Checking SSL certificates..."
    
    if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
        log_success "SSL certificates already exist"
    else
        log_info "SSL certificates not found. Setting up Let's Encrypt..."
        
        # Stop services if running
        docker-compose down 2>/dev/null || true
        
        # Generate certificates
        docker-compose run --rm certbot certonly \
            --webroot \
            --webroot-path=/var/www/certbot \
            --email admin@$DOMAIN \
            --agree-tos \
            --no-eff-email \
            -d $DOMAIN \
            -d www.$DOMAIN
        
        if [ $? -eq 0 ]; then
            log_success "SSL certificates generated successfully"
        else
            log_error "Failed to generate SSL certificates"
        fi
    fi
}

# Build Docker images
build_images() {
    log_info "Building Docker images..."
    
    cd "$PROJECT_DIR"
    
    # Build all images
    docker-compose build --no-cache
    
    if [ $? -eq 0 ]; then
        log_success "Docker images built successfully"
    else
        log_error "Failed to build Docker images"
    fi
}

# Deploy services
deploy_services() {
    log_info "Deploying services..."
    
    cd "$PROJECT_DIR"
    
    # Stop existing services
    docker-compose down
    
    # Start services
    docker-compose up -d
    
    if [ $? -eq 0 ]; then
        log_success "Services deployed successfully"
    else
        log_error "Failed to deploy services"
    fi
}

# Health check
health_check() {
    log_info "Performing health check..."
    
    cd "$PROJECT_DIR"
    
    # Wait for services to start
    sleep 10
    
    # Check if containers are running
    docker-compose ps
    
    # Check API health
    if curl -f http://localhost:3000/api/v1/health > /dev/null 2>&1; then
        log_success "API is healthy"
    else
        log_warning "API health check failed"
    fi
    
    # Check Nginx
    docker-compose exec luna-nginx nginx -t || log_warning "Nginx config test failed"
    
    log_info "Deployment complete!"
}

# Main deployment function
main() {
    echo -e "${BLUE}=== LunaSlides.com Deployment Script ===${NC}"
    echo
    
    # Check prerequisites
    check_user
    ensure_docker
    
    # Create backup
    create_backup
    
    # Update and setup
    update_code
    setup_environment
    configure_firewall
    setup_nginx
    setup_monitoring
    
    # Deploy
    build_images
    setup_ssl
    deploy_services
    
    # Verify
    health_check
    
    echo
    echo -e "${GREEN}=== Deployment Successful! ===${NC}"
    echo
    echo "🚀 LunaSlides.com is now running!"
    echo
    echo "📝 Next steps:"
    echo "   - Check the site: https://$DOMAIN"
    echo "   - Monitor status: https://$DOMAIN/monitoring"
    echo "   - View logs: docker-compose logs -f"
    echo "   - API logs: docker-compose logs -f luna-server"
    echo
    echo "🔧 Maintenance commands:"
    echo "   - Update: git pull && docker-compose up -d --build"
    echo "   - Restart: docker-compose restart"
    echo "   - Stop: docker-compose down"
    echo
    echo "📊 Monitoring:"
    echo "   - Grafana: http://localhost:3000 (via SSH tunnel)"
    echo "   - Prometheus: http://localhost:9090 (via SSH tunnel)"
    echo "   - Loki: http://localhost:3100 (via SSH tunnel)"
    echo
    echo "🔐 SSL Certificate renewal:"
    echo "   - Certificates will auto-renew via cron job"
    echo "   - Manual renewal: docker-compose run --rm certbot renew"
    echo
    
    log_success "Deployment complete! 🎉"
}

# Run main function
main "$@"