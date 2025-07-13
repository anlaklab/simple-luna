#!/bin/bash

# 🚀 Luna Platform Deployment Script with PLG Stack
# This script deploys the complete Luna Platform with Prometheus, Loki, and Grafana monitoring

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
STACK_NAME="luna-platform"
ENVIRONMENT="production"
DOMAIN="lunaslides.com"
PROJECT_DIR="/opt/luna-platform"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to wait for service to be healthy
wait_for_service() {
    local service_name="$1"
    local health_url="$2"
    local max_attempts=30
    local attempt=1

    print_status "Waiting for $service_name to be healthy..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -o /dev/null -w "%{http_code}" "$health_url" | grep -q "200\|302"; then
            print_success "$service_name is healthy"
            return 0
        fi
        
        echo -n "."
        sleep 5
        ((attempt++))
    done
    
    print_error "$service_name failed to become healthy after $((max_attempts * 5)) seconds"
    return 1
}

# Function to validate environment variables
validate_env() {
    print_status "Validating environment variables..."
    
    local required_vars=(
        "FIREBASE_PROJECT_ID"
        "FIREBASE_PRIVATE_KEY"
        "FIREBASE_CLIENT_EMAIL"
        "FIREBASE_STORAGE_BUCKET"
        "OPENAI_API_KEY"
    )
    
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
        print_error "Missing required environment variables:"
        for var in "${missing_vars[@]}"; do
            echo "  - $var"
        done
        exit 1
    fi
    
    print_success "All required environment variables are set"
}

# Function to create monitoring directories
create_monitoring_dirs() {
    print_status "Creating monitoring directories..."
    
    local dirs=(
        "/opt/luna-platform/monitoring/loki"
        "/opt/luna-platform/monitoring/promtail"
        "/opt/luna-platform/monitoring/prometheus"
        "/opt/luna-platform/monitoring/grafana/provisioning/datasources"
        "/opt/luna-platform/monitoring/grafana/provisioning/dashboards"
        "/opt/luna-platform/monitoring/grafana/dashboards"
    )
    
    for dir in "${dirs[@]}"; do
        if [ ! -d "$dir" ]; then
            mkdir -p "$dir"
            print_status "Created directory: $dir"
        fi
    done
    
    print_success "Monitoring directories created"
}

# Function to build and deploy services
deploy_services() {
    print_status "Building and deploying Luna Platform services..."
    
    # Navigate to project directory
    cd "$PROJECT_DIR"
    
    # Stop existing services
    print_status "Stopping existing services..."
    docker-compose down --remove-orphans
    
    # Build new images
    print_status "Building Docker images..."
    docker-compose build --no-cache
    
    # Start services
    print_status "Starting services..."
    docker-compose up -d
    
    print_success "Services deployed successfully"
}

# Function to check service health
check_services() {
    print_status "Checking service health..."
    
    local services=(
        "Luna Server:http://localhost:3000/api/v1/health"
        "Luna Client:http://localhost:5173"
        "Loki:http://localhost:3100/ready"
        "Prometheus:http://localhost:9090/-/ready"
        "Grafana:http://localhost:3001/api/health"
    )
    
    for service in "${services[@]}"; do
        local name="${service%%:*}"
        local url="${service#*:}"
        
        wait_for_service "$name" "$url"
    done
    
    print_success "All services are healthy"
}

# Function to setup SSL certificates
setup_ssl() {
    print_status "Setting up SSL certificates for $DOMAIN..."
    
    if command_exists certbot; then
        # Create nginx configuration for SSL
        cat > /tmp/nginx-ssl.conf << EOF
server {
    listen 80;
    server_name $DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN;
    
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # Luna Platform
    location / {
        proxy_pass http://localhost:5173;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # API endpoints
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Grafana
    location /monitoring/ {
        proxy_pass http://localhost:3001/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
        
        # Obtain SSL certificate
        certbot certonly --nginx -d "$DOMAIN" --non-interactive --agree-tos --email "admin@$DOMAIN"
        
        # Install nginx configuration
        sudo mv /tmp/nginx-ssl.conf /etc/nginx/sites-available/luna-platform
        sudo ln -sf /etc/nginx/sites-available/luna-platform /etc/nginx/sites-enabled/
        sudo nginx -t && sudo systemctl reload nginx
        
        print_success "SSL certificates configured for $DOMAIN"
    else
        print_warning "Certbot not installed, skipping SSL setup"
    fi
}

# Function to display deployment summary
display_summary() {
    print_success "🚀 Luna Platform Deployment Complete!"
    echo
    echo "📊 Service URLs:"
    echo "  🌐 Luna Platform: https://$DOMAIN"
    echo "  📈 Grafana: https://$DOMAIN/monitoring"
    echo "  🔍 Prometheus: http://localhost:9090"
    echo "  📝 Loki: http://localhost:3100"
    echo
    echo "📋 Service Status:"
    docker-compose ps
    echo
    echo "🔧 Management Commands:"
    echo "  View logs: docker-compose logs -f [service]"
    echo "  Restart service: docker-compose restart [service]"
    echo "  Stop all: docker-compose down"
    echo "  Update: $0"
    echo
    echo "🔐 Grafana Default Credentials:"
    echo "  Username: admin"
    echo "  Password: luna-admin-2024"
    echo
    print_success "Deployment completed successfully!"
}

# Main deployment function
main() {
    print_status "Starting Luna Platform deployment with PLG stack..."
    
    # Check if running as root
    if [[ $EUID -ne 0 ]]; then
        print_error "This script must be run as root"
        exit 1
    fi
    
    # Validate prerequisites
    if ! command_exists docker; then
        print_error "Docker is not installed"
        exit 1
    fi
    
    if ! command_exists docker-compose; then
        print_error "Docker Compose is not installed"
        exit 1
    fi
    
    # Load environment variables
    if [ -f "$PROJECT_DIR/.env" ]; then
        source "$PROJECT_DIR/.env"
        print_success "Environment variables loaded from .env"
    else
        print_error ".env file not found in $PROJECT_DIR"
        exit 1
    fi
    
    # Validate environment
    validate_env
    
    # Create monitoring directories
    create_monitoring_dirs
    
    # Deploy services
    deploy_services
    
    # Check service health
    check_services
    
    # Setup SSL (optional)
    if [ "$1" = "--ssl" ]; then
        setup_ssl
    fi
    
    # Display summary
    display_summary
}

# Handle script arguments
case "${1:-deploy}" in
    deploy)
        main "$2"
        ;;
    ssl)
        setup_ssl
        ;;
    status)
        cd "$PROJECT_DIR"
        docker-compose ps
        ;;
    logs)
        cd "$PROJECT_DIR"
        docker-compose logs -f "${2:-}"
        ;;
    restart)
        cd "$PROJECT_DIR"
        docker-compose restart "${2:-}"
        ;;
    stop)
        cd "$PROJECT_DIR"
        docker-compose down
        ;;
    update)
        cd "$PROJECT_DIR"
        git pull origin main
        main
        ;;
    *)
        echo "Usage: $0 {deploy|ssl|status|logs [service]|restart [service]|stop|update}"
        echo
        echo "Commands:"
        echo "  deploy [--ssl]  - Deploy Luna Platform with optional SSL"
        echo "  ssl            - Setup SSL certificates"
        echo "  status         - Show service status"
        echo "  logs [service] - Show logs for all services or specific service"
        echo "  restart [service] - Restart all services or specific service"
        echo "  stop           - Stop all services"
        echo "  update         - Pull latest code and redeploy"
        exit 1
        ;;
esac 