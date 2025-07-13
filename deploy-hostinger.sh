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
    
    if [ -d "$PROJECT_DIR" ]; then
        # Backup existing project
        cp -r "$PROJECT_DIR/.env" "$BACKUP_PATH/" 2>/dev/null || true
        cp -r "$PROJECT_DIR/Aspose.Slides.Product.Family.lic" "$BACKUP_PATH/" 2>/dev/null || true
        
        # Backup Docker volumes
        docker run --rm -v luna_uploads:/data -v "$BACKUP_PATH":/backup alpine tar czf /backup/uploads.tar.gz -C /data . 2>/dev/null || true
        docker run --rm -v luna_logs:/data -v "$BACKUP_PATH":/backup alpine tar czf /backup/logs.tar.gz -C /data . 2>/dev/null || true
        
        log_success "Backup created at $BACKUP_PATH"
    fi
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
    fi
    
    # Check Java
    if ! command -v java &> /dev/null; then
        log_warning "Java is not installed. Installing OpenJDK 11..."
        sudo apt update
        sudo apt install -y openjdk-11-jdk
    fi
    
    # Check Git
    if ! command -v git &> /dev/null; then
        log_error "Git is not installed. Please install Git first."
    fi
    
    log_success "All prerequisites satisfied"
}

# Setup project directory
setup_project() {
    log_info "Setting up project directory..."
    
    # Clone or pull latest code
    if [ ! -d "$PROJECT_DIR" ]; then
        log_info "Cloning repository..."
        git clone https://github.com/your-repo/lunaslides.git "$PROJECT_DIR"
    else
        log_info "Updating repository..."
        cd "$PROJECT_DIR"
        git fetch origin
        git reset --hard origin/main
    fi
    
    cd "$PROJECT_DIR"
    
    # Create required directories
    mkdir -p temp/{uploads,aspose,conversions}
    mkdir -p logs
    mkdir -p ssl
    mkdir -p monitoring/grafana/provisioning/{dashboards,datasources}
    mkdir -p monitoring/grafana/dashboards
    
    log_success "Project directory setup complete"
}

# Configure environment
configure_environment() {
    log_info "Configuring environment..."
    
    cd "$PROJECT_DIR"
    
    # Check if .env exists
    if [ ! -f .env ]; then
        if [ -f env.example ]; then
            cp env.example .env
            log_warning ".env file created from env.example. Please edit it with your values!"
            echo ""
            echo "Please edit the following required values in .env:"
            echo "  - FIREBASE_PROJECT_ID"
            echo "  - FIREBASE_PRIVATE_KEY"
            echo "  - FIREBASE_CLIENT_EMAIL"
            echo "  - FIREBASE_STORAGE_BUCKET"
            echo "  - OPENAI_API_KEY"
            echo "  - JWT_SECRET"
            echo "  - GRAFANA_PASSWORD"
            echo ""
            read -p "Press Enter after editing .env file..."
        else
            log_error "No env.example file found!"
        fi
    else
        log_success ".env file already exists"
    fi
    
    # Check Aspose license
    if [ ! -f "Aspose.Slides.Product.Family.lic" ]; then
        log_error "Aspose.Slides license file not found! Please copy it to $PROJECT_DIR/"
    else
        log_success "Aspose.Slides license file found"
    fi
}

# Run TypeScript fixes
fix_typescript() {
    log_info "Fixing TypeScript errors..."
    
    cd "$PROJECT_DIR"
    
    if [ -f "fix-typescript-errors.sh" ]; then
        chmod +x fix-typescript-errors.sh
        ./fix-typescript-errors.sh
        log_success "TypeScript fixes applied"
    else
        log_warning "TypeScript fix script not found, skipping..."
    fi
}

# Setup monitoring
setup_monitoring() {
    log_info "Setting up monitoring configuration..."
    
    cd "$PROJECT_DIR"
    
    # Check if monitoring configs exist
    if [ ! -f "monitoring/prometheus.yml" ]; then
        log_warning "Monitoring configurations not found. Creating from script..."
        if [ -f "fix-typescript-errors.sh" ]; then
            # The script will create monitoring configs
            ./fix-typescript-errors.sh
        fi
    fi
    
    log_success "Monitoring configuration complete"
}

# Setup SSL certificates
setup_ssl() {
    log_info "Checking SSL certificates..."
    
    cd "$PROJECT_DIR"
    
    # Check if certificates already exist
    if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
        log_success "SSL certificates already exist"
    else
        log_info "SSL certificates not found. Setting up Let's Encrypt..."
        
        # Stop services if running
        docker-compose -f docker-compose.hostinger.yml down 2>/dev/null || true
        
        # Generate certificates
        docker-compose -f docker-compose.hostinger.yml run --rm certbot certonly \
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
    docker-compose -f docker-compose.hostinger.yml build --no-cache
    
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
    docker-compose -f docker-compose.hostinger.yml down
    
    # Start services
    docker-compose -f docker-compose.hostinger.yml up -d
    
    if [ $? -eq 0 ]; then
        log_success "Services deployed successfully"
    else
        log_error "Failed to deploy services"
    fi
    
    # Wait for services to be ready
    log_info "Waiting for services to be ready..."
    sleep 30
}

# Verify deployment
verify_deployment() {
    log_info "Verifying deployment..."
    
    # Check container status
    log_info "Checking container status..."
    docker-compose -f docker-compose.hostinger.yml ps
    
    # Check API health
    log_info "Checking API health..."
    curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/v1/health || log_warning "API health check failed"
    
    # Check frontend
    log_info "Checking frontend..."
    curl -s -o /dev/null -w "%{http_code}" http://localhost || log_warning "Frontend check failed"
    
    # Check Nginx
    log_info "Checking Nginx..."
    docker-compose -f docker-compose.hostinger.yml exec luna-nginx nginx -t || log_warning "Nginx config test failed"
    
    log_success "Deployment verification complete"
}

# Setup cron jobs
setup_cron() {
    log_info "Setting up cron jobs..."
    
    # SSL renewal
    (crontab -l 2>/dev/null | grep -v "renew-certs.sh"; echo "0 0 * * 0 $PROJECT_DIR/renew-certs.sh >> $HOME/cert-renewal.log 2>&1") | crontab -
    
    # Backup
    (crontab -l 2>/dev/null | grep -v "backup.sh"; echo "0 2 * * * $PROJECT_DIR/backup.sh >> $HOME/backup.log 2>&1") | crontab -
    
    # Cleanup
    (crontab -l 2>/dev/null | grep -v "cleanup-temp"; echo "0 3 * * * find $PROJECT_DIR/temp -type f -mtime +7 -delete >> $HOME/cleanup.log 2>&1") | crontab -
    
    log_success "Cron jobs configured"
}

# Print summary
print_summary() {
    echo ""
    echo "======================================"
    echo -e "${GREEN}🎉 Deployment Complete!${NC}"
    echo "======================================"
    echo ""
    echo "🌐 URLs:"
    echo "   - Frontend: https://$DOMAIN"
    echo "   - API: https://$DOMAIN/api/v1"
    echo "   - API Docs: https://$DOMAIN/api/docs"
    echo "   - Grafana: https://$DOMAIN:3001"
    echo "   - Prometheus: http://$(hostname -I | awk '{print $1}'):9090"
    echo ""
    echo "📊 Monitoring:"
    echo "   - Grafana user: admin"
    echo "   - Grafana password: (check .env file)"
    echo ""
    echo "📁 Logs:"
    echo "   - View logs: docker-compose -f docker-compose.hostinger.yml logs -f"
    echo "   - API logs: docker-compose -f docker-compose.hostinger.yml logs -f luna-server"
    echo ""
    echo "🔧 Maintenance:"
    echo "   - Update: git pull && docker-compose -f docker-compose.hostinger.yml up -d --build"
    echo "   - Restart: docker-compose -f docker-compose.hostinger.yml restart"
    echo "   - Stop: docker-compose -f docker-compose.hostinger.yml down"
    echo ""
    echo "⚠️  Next Steps:"
    echo "   1. Configure your domain DNS to point to this server"
    echo "   2. Import Grafana dashboards (IDs: 1860, 893, 11133)"
    echo "   3. Set up monitoring alerts in Grafana"
    echo "   4. Test file upload functionality"
    echo "   5. Configure firewall rules if needed"
    echo ""
}

# Main execution
main() {
    echo "🚀 LunaSlides.com Deployment Script"
    echo "===================================="
    echo ""
    
    # Run deployment steps
    check_user
    check_prerequisites
    create_backup
    setup_project
    configure_environment
    fix_typescript
    setup_monitoring
    setup_ssl
    build_images
    deploy_services
    verify_deployment
    setup_cron
    print_summary
}

# Run main function
main "$@"