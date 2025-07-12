#!/bin/bash

# 🔄 Luna Services Restart Script
# Restart all Luna services in proper order

set -e

echo "🔄 Restarting Luna Services"
echo "==========================="
echo "⏰ Started at: $(date)"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Function to wait for service health
wait_for_health() {
    local container_name=$1
    local max_attempts=30
    local attempt=1
    
    echo -e "${YELLOW}⏳ Waiting for $container_name to be healthy...${NC}"
    
    while [ $attempt -le $max_attempts ]; do
        local health=$(docker inspect --format='{{.State.Health.Status}}' "$container_name" 2>/dev/null || echo "no-health-check")
        
        if [ "$health" = "healthy" ] || [ "$health" = "no-health-check" ]; then
            echo -e "${GREEN}✅ $container_name is healthy${NC}"
            return 0
        fi
        
        echo "   Attempt $attempt/$max_attempts: $health"
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo "⚠️  Warning: $container_name may not be fully healthy"
    return 1
}

# Function to test endpoint
test_endpoint() {
    local url=$1
    local name=$2
    local max_attempts=15
    local attempt=1
    
    echo -e "${YELLOW}⏳ Testing $name endpoint...${NC}"
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -f -m 5 "$url" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ $name is responding${NC}"
            return 0
        fi
        
        echo "   Attempt $attempt/$max_attempts"
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo "⚠️  Warning: $name endpoint not responding"
    return 1
}

# Stop all services
echo -e "${BLUE}🛑 Stopping all services...${NC}"
docker-compose -f docker-compose.production.yml down

echo ""
echo -e "${BLUE}🧹 Cleaning up...${NC}"
# Remove any orphaned containers
docker-compose -f docker-compose.production.yml down --remove-orphans

# Optional: Clean up unused images (uncomment if needed)
# docker image prune -f

echo ""
echo -e "${BLUE}🚀 Starting services in order...${NC}"

# Start services in dependency order
echo "1️⃣  Starting monitoring..."
docker-compose -f docker-compose.production.yml up -d luna-monitor

echo "2️⃣  Starting backend server..."
docker-compose -f docker-compose.production.yml up -d luna-server
wait_for_health "luna-server"
test_endpoint "http://localhost:3000/api/v1/health" "Backend API"

echo "3️⃣  Starting frontend client..."
docker-compose -f docker-compose.production.yml up -d luna-client
wait_for_health "luna-client" 
test_endpoint "http://localhost:5173" "Frontend"

echo "4️⃣  Starting nginx proxy..."
docker-compose -f docker-compose.production.yml up -d luna-nginx
wait_for_health "luna-nginx"
test_endpoint "http://localhost:80/nginx-health" "Nginx Proxy"

echo ""
echo -e "${BLUE}🔍 Final health check...${NC}"
test_endpoint "http://localhost:80" "Main Site"
test_endpoint "http://localhost:80/api/v1/health" "API through Proxy"
test_endpoint "http://localhost:80/api/v1/docs" "API Documentation"

echo ""
echo -e "${GREEN}✅ All services restarted successfully!${NC}"
echo "⏰ Completed at: $(date)"
echo ""
echo "🌐 Access points:"
echo "   Main site: http://localhost:80"
echo "   API docs:  http://localhost:80/api/v1/docs"
echo "   Health:    http://localhost:80/api/v1/health"
echo ""
echo "🔍 Monitor with: ./scripts/monitor-containers.sh"
echo "📋 View logs with: docker-compose -f docker-compose.production.yml logs -f [service]" 