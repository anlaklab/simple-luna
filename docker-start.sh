#!/bin/bash

# 🐳 Luna Project - Docker Startup Script
# Node.js 18 + Aspose.Slides Local Library

set -e

echo "🌙 Luna Project - Docker Setup"
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker first."
    exit 1
fi

print_success "Docker is running"

# Check if .env file exists
if [ ! -f .env ]; then
    print_warning ".env file not found. Creating from .env.example..."
    if [ -f .env.example ]; then
        cp .env.example .env
        print_warning "Please configure your .env file with proper credentials"
    else
        print_error ".env.example not found. Please create .env file manually."
        exit 1
    fi
fi

# Stop any existing containers
print_status "Stopping existing Luna containers..."
docker-compose down --remove-orphans

# Remove old images if requested
if [ "$1" = "--rebuild" ]; then
    print_status "Rebuilding Docker images..."
    docker-compose build --no-cache
else
    print_status "Building Docker images..."
    docker-compose build
fi

# Start the services
print_status "Starting Luna services..."
docker-compose up -d

# Wait for services to be healthy
print_status "Waiting for services to be ready..."
sleep 10

# Check service health
print_status "Checking service health..."

# Check server health
if curl -f http://localhost:3000/api/v1/health > /dev/null 2>&1; then
    print_success "Luna Server is healthy (http://localhost:3000)"
else
    print_warning "Luna Server health check failed"
fi

# Check client
if curl -f http://localhost:5173 > /dev/null 2>&1; then
    print_success "Luna Client is running (http://localhost:5173)"
else
    print_warning "Luna Client is not responding"
fi

# Show running containers
print_status "Running containers:"
docker-compose ps

# Show logs command
echo ""
print_status "Useful commands:"
echo "  📋 View logs:           docker-compose logs -f"
echo "  📋 View server logs:    docker-compose logs -f luna-server"
echo "  📋 View client logs:    docker-compose logs -f luna-client"
echo "  🛑 Stop services:       docker-compose down"
echo "  🔄 Restart services:    docker-compose restart"
echo "  🧹 Clean up:            docker-compose down -v --rmi all"

echo ""
print_success "Luna Project is running!"
print_status "🌐 Frontend: http://localhost:5173"
print_status "🔧 Backend:  http://localhost:3000"
print_status "📋 API Docs: http://localhost:3000/api/docs"

# Test Aspose.Slides functionality
echo ""
print_status "Testing Aspose.Slides functionality..."
if docker-compose exec luna-server node -e "
try { 
  const aspose = require('./lib/aspose.slides.js'); 
  console.log('✅ Aspose.Slides loaded successfully'); 
  console.log('📊 Available classes:', Object.keys(aspose).length);
} catch(e) { 
  console.error('❌ Aspose.Slides error:', e.message); 
  process.exit(1);
}
" 2>/dev/null; then
    print_success "Aspose.Slides library is working correctly"
else
    print_error "Aspose.Slides library failed to load"
    print_status "Check logs with: docker-compose logs luna-server"
fi

echo ""
print_status "🎉 Setup complete! Luna is ready for REAL PowerPoint processing." 