#!/bin/bash

# 🚀 Luna Enhanced Deployment Script with Comprehensive Logging
# This script provides detailed logging throughout the deployment process
# to help identify issues and track progress

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  INFO: $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ SUCCESS: $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  WARNING: $1${NC}"
}

log_error() {
    echo -e "${RED}❌ ERROR: $1${NC}"
}

log_step() {
    echo -e "${PURPLE}🔄 STEP: $1${NC}"
}

log_debug() {
    echo -e "${CYAN}🔍 DEBUG: $1${NC}"
}

# Function to log command execution
run_with_logging() {
    local cmd="$1"
    local description="$2"
    
    log_step "$description"
    log_debug "Executing: $cmd"
    
    if eval "$cmd"; then
        log_success "$description completed"
        return 0
    else
        log_error "$description failed"
        return 1
    fi
}

# Function to check Docker status
check_docker() {
    log_step "Checking Docker status"
    
    if ! docker --version >/dev/null 2>&1; then
        log_error "Docker is not installed or not running"
        return 1
    fi
    
    log_success "Docker is available: $(docker --version)"
    
    # Check if Docker daemon is running
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker daemon is not running"
        return 1
    fi
    
    log_success "Docker daemon is running"
    return 0
}

# Function to setup environment
setup_environment() {
    log_step "Setting up environment"
    
    # Load nvm if available
    if [ -s "$HOME/.nvm/nvm.sh" ]; then
        export NVM_DIR="$HOME/.nvm"
        \. "$NVM_DIR/nvm.sh"
        
        # Try to use Node 18 if available
        if nvm list 18 >/dev/null 2>&1; then
            nvm use 18 >/dev/null 2>&1
            log_success "Switched to Node.js 18: $(node -v)"
        fi
    fi
    
    # Set Java environment variables
    export JAVA_HOME=${JAVA_HOME:-/usr/lib/jvm/java-11-openjdk-amd64}
    export PATH="$JAVA_HOME/bin:${PATH}"
    
    log_success "Environment setup completed"
}

# Function to run pre-build verification
run_pre_build_check() {
    log_step "Running pre-build verification"
    
    if [ ! -f "pre-build-check.sh" ]; then
        log_error "Pre-build check script not found"
        return 1
    fi
    
    if ./pre-build-check.sh; then
        log_success "Pre-build verification passed"
        return 0
    else
        log_error "Pre-build verification failed"
        return 1
    fi
}

# Function to build Docker image with enhanced logging
build_docker_image() {
    log_step "Building Docker image"
    
    # Generate unique build args to force rebuild
    local timestamp=$(date +%Y%m%d-%H%M%S)
    local build_args="--build-arg CACHEBUST=$timestamp"
    
    log_debug "Build timestamp: $timestamp"
    log_debug "Build args: $build_args"
    
    # Build with detailed output
    if docker build -f Dockerfile.production $build_args --progress=plain -t luna-production:latest . 2>&1 | tee build.log; then
        log_success "Docker image built successfully"
        
        # Show image details
        IMAGE_SIZE=$(docker images luna-production:latest --format "{{.Size}}")
        log_info "Image size: $IMAGE_SIZE"
        
        return 0
    else
        log_error "Docker build failed"
        log_error "Check build.log for details"
        return 1
    fi
}

# Function to test Docker image
test_docker_image() {
    log_step "Testing Docker image"
    
    # Test if image can start
    log_debug "Testing image startup"
    
    if docker run --rm -d --name luna-test -p 8080:80 luna-production:latest >/dev/null 2>&1; then
        log_success "Docker image starts successfully"
        
        # Wait a moment for startup
        sleep 5
        
        # Test if container is still running
        if docker ps --filter "name=luna-test" --format "{{.Names}}" | grep -q luna-test; then
            log_success "Container is running"
            
            # Test basic connectivity
            if curl -s http://localhost:8080 >/dev/null 2>&1; then
                log_success "Basic connectivity test passed"
            else
                log_warning "Basic connectivity test failed"
            fi
        else
            log_error "Container stopped unexpectedly"
            docker logs luna-test 2>&1 | head -20
        fi
        
        # Clean up test container
        docker stop luna-test >/dev/null 2>&1 || true
        docker rm luna-test >/dev/null 2>&1 || true
        
        return 0
    else
        log_error "Docker image failed to start"
        return 1
    fi
}

# Function to check JAR file in built image
check_jar_in_image() {
    log_step "Checking JAR file in built image"
    
    # Check if JAR exists in image
    if docker run --rm luna-production:latest ls -la /app/lib/aspose-slides-25.6-nodejs.jar 2>/dev/null; then
        log_success "JAR file exists in Docker image"
        
        # Get JAR size
        JAR_SIZE=$(docker run --rm luna-production:latest du -h /app/lib/aspose-slides-25.6-nodejs.jar | cut -f1)
        log_info "JAR size in image: $JAR_SIZE"
        
        return 0
    else
        log_error "JAR file missing in Docker image"
        
        # List lib directory contents
        log_debug "Contents of /app/lib in image:"
        docker run --rm luna-production:latest ls -la /app/lib/ || true
        
        return 1
    fi
}

# Function to analyze build logs
analyze_build_logs() {
    log_step "Analyzing build logs"
    
    if [ -f "build.log" ]; then
        log_info "Build log analysis:"
        
        # Check for errors
        ERROR_COUNT=$(grep -c "ERROR" build.log || echo "0")
        WARNING_COUNT=$(grep -c "WARNING" build.log || echo "0")
        
        log_info "Errors in build: $ERROR_COUNT"
        log_info "Warnings in build: $WARNING_COUNT"
        
        # Show recent errors if any
        if [ "$ERROR_COUNT" -gt 0 ]; then
            log_error "Recent errors from build:"
            grep "ERROR" build.log | tail -5
        fi
        
        # Show build stages completion
        log_info "Build stages completed:"
        grep -E "^#[0-9]+ \[.*\] (FROM|RUN|COPY|WORKDIR)" build.log | tail -10 || true
        
        return 0
    else
        log_warning "Build log not found"
        return 1
    fi
}

# Function to deploy using docker-compose
deploy_with_compose() {
    log_step "Deploying with Docker Compose"
    
    if [ ! -f "docker-compose.yml" ]; then
        log_error "docker-compose.yml not found"
        return 1
    fi
    
    # Stop existing containers
    log_debug "Stopping existing containers"
    docker-compose down || true
    
    # Start new deployment
    log_debug "Starting new deployment"
    if docker-compose up -d --build 2>&1 | tee deploy.log; then
        log_success "Docker Compose deployment started"
        
        # Wait for containers to be ready
        sleep 10
        
        # Check container status
        RUNNING_CONTAINERS=$(docker-compose ps --services --filter "status=running" | wc -l)
        TOTAL_CONTAINERS=$(docker-compose ps --services | wc -l)
        
        log_info "Running containers: $RUNNING_CONTAINERS/$TOTAL_CONTAINERS"
        
        if [ "$RUNNING_CONTAINERS" -eq "$TOTAL_CONTAINERS" ]; then
            log_success "All containers are running"
            return 0
        else
            log_error "Some containers failed to start"
            docker-compose logs --tail=20
            return 1
        fi
    else
        log_error "Docker Compose deployment failed"
        return 1
    fi
}

# Function to run health checks
run_health_checks() {
    log_step "Running health checks"
    
    # Check if main service is responding
    local max_attempts=10
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        log_debug "Health check attempt $attempt/$max_attempts"
        
        if curl -s -f http://localhost:3000/api/v1/health >/dev/null 2>&1; then
            log_success "Health check passed"
            return 0
        fi
        
        sleep 6
        ((attempt++))
    done
    
    log_error "Health check failed after $max_attempts attempts"
    return 1
}

# Function to show deployment summary
show_deployment_summary() {
    log_step "Deployment Summary"
    
    echo "========================================"
    echo "🎯 Luna Deployment Summary"
    echo "========================================"
    
    # Show container status
    echo "📋 Container Status:"
    docker-compose ps || docker ps --filter "name=luna"
    
    # Show image details
    echo ""
    echo "🖼️  Image Details:"
    docker images luna-production:latest --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"
    
    # Show logs sample
    echo ""
    echo "📄 Recent Logs (last 10 lines):"
    docker-compose logs --tail=10 || docker logs $(docker ps -q --filter "name=luna") --tail=10
    
    echo ""
    echo "🔗 Service URLs:"
    echo "   - Main App: http://localhost:3000"
    echo "   - API Health: http://localhost:3000/api/v1/health"
    echo "   - API Docs: http://localhost:3000/api/v1/docs"
    
    echo ""
    echo "🔍 Troubleshooting:"
    echo "   - Check logs: docker-compose logs -f"
    echo "   - Check containers: docker-compose ps"
    echo "   - Restart: docker-compose restart"
    echo "   - Full rebuild: docker-compose down && docker-compose up --build"
}

# Main execution
main() {
    echo "🚀 Luna Enhanced Deployment with Logging"
    echo "========================================"
    echo "⏰ Started at: $(date)"
    echo ""
    
    # Setup environment
    setup_environment
    
    # Check Docker
    if ! check_docker; then
        log_error "Docker check failed"
        exit 1
    fi
    
    # Run pre-build verification
    if ! run_pre_build_check; then
        log_error "Pre-build check failed"
        exit 1
    fi
    
    # Build Docker image
    if ! build_docker_image; then
        log_error "Docker build failed"
        exit 1
    fi
    
    # Analyze build logs
    analyze_build_logs
    
    # Check JAR in image
    if ! check_jar_in_image; then
        log_error "JAR check failed - this is the likely cause of deployment failures"
        exit 1
    fi
    
    # Test Docker image
    if ! test_docker_image; then
        log_warning "Docker image test failed, but continuing..."
    fi
    
    # Deploy with docker-compose
    if ! deploy_with_compose; then
        log_error "Docker Compose deployment failed"
        exit 1
    fi
    
    # Run health checks
    if ! run_health_checks; then
        log_warning "Health checks failed, but deployment may still work"
    fi
    
    # Show summary
    show_deployment_summary
    
    echo ""
    echo "🎉 Deployment process completed!"
    echo "⏰ Finished at: $(date)"
}

# Execute main function
main "$@" 