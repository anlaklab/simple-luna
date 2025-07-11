#!/bin/bash

# =============================================================================
# Luna Server - Deployment Script
# 
# Automated deployment for development, staging, and production environments
# =============================================================================

set -e  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# =============================================================================
# Helper Functions
# =============================================================================

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" >&2
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}"
}

check_requirements() {
    log "Checking requirements..."
    
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    success "All requirements satisfied"
}

check_environment() {
    local env=$1
    log "Checking environment configuration for: $env"
    
    case $env in
        development)
            COMPOSE_FILE="docker-compose.dev.yml"
            ENV_FILE=".env.development"
            ;;
        staging)
            COMPOSE_FILE="docker-compose.staging.yml"
            ENV_FILE=".env.staging"
            ;;
        production)
            COMPOSE_FILE="docker-compose.yml"
            ENV_FILE=".env.production"
            ;;
        *)
            error "Invalid environment: $env. Use development, staging, or production."
            exit 1
            ;;
    esac
    
    # Check if compose file exists
    if [ ! -f "$PROJECT_DIR/$COMPOSE_FILE" ]; then
        error "Compose file not found: $COMPOSE_FILE"
        exit 1
    fi
    
    # Check if env file exists, create from example if not
    if [ ! -f "$PROJECT_DIR/$ENV_FILE" ]; then
        if [ -f "$PROJECT_DIR/.env.example" ]; then
            warn "Environment file not found. Creating from example..."
            cp "$PROJECT_DIR/.env.example" "$PROJECT_DIR/$ENV_FILE"
            warn "Please edit $ENV_FILE with your configuration before proceeding."
        else
            error "Environment file not found: $ENV_FILE"
            exit 1
        fi
    fi
    
    success "Environment configuration verified"
}

setup_directories() {
    log "Setting up required directories..."
    
    cd "$PROJECT_DIR"
    
    # Create volume directories
    mkdir -p volumes/{uploads,aspose,downloads,logs,redis}
    mkdir -p temp/{uploads,aspose,downloads}
    mkdir -p logs
    mkdir -p ssl
    
    # Set permissions
    chmod 755 volumes volumes/* temp temp/* logs
    
    success "Directories created and configured"
}

build_images() {
    local env=$1
    log "Building Docker images for $env environment..."
    
    cd "$PROJECT_DIR"
    
    if [ "$env" = "development" ]; then
        docker-compose -f "$COMPOSE_FILE" build --no-cache
    else
        docker-compose -f "$COMPOSE_FILE" build --no-cache luna-server
    fi
    
    success "Docker images built successfully"
}

deploy() {
    local env=$1
    local action=${2:-up}
    
    log "Deploying Luna Server to $env environment..."
    
    cd "$PROJECT_DIR"
    
    # Load environment variables
    export $(grep -v '^#' "$ENV_FILE" | xargs)
    
    case $action in
        up)
            docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d
            ;;
        down)
            docker-compose -f "$COMPOSE_FILE" down
            ;;
        restart)
            docker-compose -f "$COMPOSE_FILE" restart
            ;;
        logs)
            docker-compose -f "$COMPOSE_FILE" logs -f
            ;;
        status)
            docker-compose -f "$COMPOSE_FILE" ps
            ;;
        *)
            error "Invalid action: $action"
            exit 1
            ;;
    esac
    
    if [ "$action" = "up" ]; then
        sleep 5
        check_health "$env"
    fi
    
    success "Deployment $action completed for $env environment"
}

check_health() {
    local env=$1
    log "Checking service health..."
    
    local port=${PORT:-3000}
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f "http://localhost:$port/api/v1/health" > /dev/null 2>&1; then
            success "Luna Server is healthy and responding"
            return 0
        fi
        
        echo -n "."
        sleep 2
        ((attempt++))
    done
    
    error "Health check failed after $max_attempts attempts"
    return 1
}

generate_ssl() {
    log "Generating self-signed SSL certificates..."
    
    cd "$PROJECT_DIR"
    mkdir -p ssl
    
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout ssl/server.key \
        -out ssl/server.crt \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=luna-server"
    
    success "SSL certificates generated"
}

backup() {
    local env=$1
    log "Creating backup for $env environment..."
    
    cd "$PROJECT_DIR"
    
    local backup_dir="backups/$(date +'%Y%m%d_%H%M%S')_$env"
    mkdir -p "$backup_dir"
    
    # Backup volumes
    cp -r volumes "$backup_dir/"
    
    # Backup environment files
    cp "$ENV_FILE" "$backup_dir/"
    
    # Backup logs
    cp -r logs "$backup_dir/"
    
    # Create backup archive
    tar -czf "$backup_dir.tar.gz" -C backups "$(basename "$backup_dir")"
    rm -rf "$backup_dir"
    
    success "Backup created: $backup_dir.tar.gz"
}

show_logs() {
    local env=$1
    local service=${2:-luna-server}
    
    cd "$PROJECT_DIR"
    docker-compose -f "$COMPOSE_FILE" logs -f "$service"
}

cleanup() {
    log "Cleaning up Docker resources..."
    
    cd "$PROJECT_DIR"
    
    # Stop and remove containers
    docker-compose -f "$COMPOSE_FILE" down -v --remove-orphans
    
    # Remove unused images
    docker system prune -f
    
    success "Cleanup completed"
}

# =============================================================================
# Main Script
# =============================================================================

show_usage() {
    cat << EOF
Luna Server Deployment Script

Usage: $0 <environment> <action> [options]

Environments:
    development     - Development environment with hot reloading
    staging         - Staging environment for testing
    production      - Production environment

Actions:
    deploy          - Deploy the application (default)
    build           - Build Docker images only
    up              - Start services
    down            - Stop services
    restart         - Restart services
    logs            - Show logs
    status          - Show service status
    health          - Check application health
    backup          - Create backup
    ssl             - Generate SSL certificates
    cleanup         - Clean up Docker resources

Examples:
    $0 development deploy
    $0 production up
    $0 staging logs
    $0 production backup

EOF
}

main() {
    local env=$1
    local action=${2:-deploy}
    
    if [ -z "$env" ]; then
        show_usage
        exit 1
    fi
    
    log "Starting Luna Server deployment process..."
    log "Environment: $env"
    log "Action: $action"
    
    check_requirements
    check_environment "$env"
    
    case $action in
        deploy)
            setup_directories
            build_images "$env"
            deploy "$env" "up"
            ;;
        build)
            build_images "$env"
            ;;
        up|down|restart|status)
            deploy "$env" "$action"
            ;;
        logs)
            show_logs "$env"
            ;;
        health)
            check_health "$env"
            ;;
        backup)
            backup "$env"
            ;;
        ssl)
            generate_ssl
            ;;
        cleanup)
            cleanup
            ;;
        *)
            error "Unknown action: $action"
            show_usage
            exit 1
            ;;
    esac
    
    success "All operations completed successfully!"
}

# Run main function with all arguments
main "$@" 