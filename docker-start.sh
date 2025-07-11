#!/bin/bash

# 🐳 Luna Project - Docker Startup Script
# Node.js 18 + Aspose.Slides Local Library + Dynamic Extensions

set -e

echo "🌙 Luna Project - Docker Setup with Dynamic Extensions"
echo "======================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
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

print_extension() {
    echo -e "${PURPLE}[EXTENSION]${NC} $1"
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
sleep 15

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

echo ""
print_extension "Testing Dynamic Extension System..."

# Test Dynamic Extensions functionality
if curl -f http://localhost:3000/api/dynamic-extensions/health > /dev/null 2>&1; then
    print_success "Dynamic Extensions system is healthy"
    
    # Get extension statistics
    print_extension "Checking loaded extensions..."
    EXTENSIONS_RESPONSE=$(curl -s http://localhost:3000/api/dynamic-extensions 2>/dev/null)
    
    if [ $? -eq 0 ] && [ ! -z "$EXTENSIONS_RESPONSE" ]; then
        EXTENSION_COUNT=$(echo "$EXTENSIONS_RESPONSE" | grep -o '"totalExtensions":[0-9]*' | cut -d':' -f2)
        if [ ! -z "$EXTENSION_COUNT" ] && [ "$EXTENSION_COUNT" -gt 0 ]; then
            print_success "Found $EXTENSION_COUNT dynamic extensions loaded"
            
            # Show loaded extension types
            EXTENSION_TYPES=$(echo "$EXTENSIONS_RESPONSE" | grep -o '"loadedTypes":\[[^]]*\]' | sed 's/"loadedTypes":\[//g' | sed 's/\]//g' | tr -d '"')
            if [ ! -z "$EXTENSION_TYPES" ]; then
                print_extension "Loaded extensions: $EXTENSION_TYPES"
            fi
        else
            print_warning "No dynamic extensions loaded"
        fi
    else
        print_warning "Could not retrieve extension information"
    fi
else
    print_error "Dynamic Extensions system is not responding"
fi

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

# Show useful commands
echo ""
print_status "Useful commands:"
echo "  📋 View logs:           docker-compose logs -f"
echo "  📋 View server logs:    docker-compose logs -f luna-server"
echo "  📋 View client logs:    docker-compose logs -f luna-client"
echo "  🛑 Stop services:       docker-compose down"
echo "  🔄 Restart services:    docker-compose restart"
echo "  🧹 Clean up:            docker-compose down -v --rmi all"

echo ""
print_extension "Dynamic Extension Management Commands:"
echo "  🔍 List extensions:     curl http://localhost:3000/api/dynamic-extensions"
echo "  📊 Extension stats:     curl http://localhost:3000/api/dynamic-extensions/stats"
echo "  🏥 Health check:        curl http://localhost:3000/api/dynamic-extensions/health"
echo "  🧪 Test all:            curl -X POST http://localhost:3000/api/dynamic-extensions/test-all"
echo "  🔄 Reload extensions:   curl -X POST http://localhost:3000/api/dynamic-extensions/reload"
echo "  ✅ Enable extension:    curl -X POST http://localhost:3000/api/dynamic-extensions/{type}/enable"
echo "  ❌ Disable extension:   curl -X POST http://localhost:3000/api/dynamic-extensions/{type}/disable"

echo ""
print_success "Luna Project with Dynamic Extensions is running!"
print_status "🌐 Frontend: http://localhost:5173"
print_status "🔧 Backend:  http://localhost:3000"
print_status "📋 API Docs: http://localhost:3000/api/docs"
print_extension "🚀 Dynamic Extensions: http://localhost:3000/api/dynamic-extensions"

echo ""
print_status "🎉 Setup complete! Luna is ready for REAL PowerPoint processing with Dynamic Extensions." 