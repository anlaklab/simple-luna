#!/bin/bash

# 🔍 Luna Container Monitoring Script
# Monitor health and status of all Luna services

set -e

echo "🌙 Luna Container Monitoring Dashboard"
echo "======================================"
echo "⏰ Timestamp: $(date)"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check container status
check_container() {
    local container_name=$1
    local service_name=$2
    
    echo -e "${BLUE}📦 $service_name${NC}"
    echo "   Container: $container_name"
    
    if docker ps --format "table {{.Names}}\t{{.Status}}" | grep -q "$container_name"; then
        local status=$(docker ps --format "{{.Status}}" --filter "name=$container_name")
        echo -e "   Status: ${GREEN}✅ Running${NC} ($status)"
        
        # Check health if available
        local health=$(docker inspect --format='{{.State.Health.Status}}' "$container_name" 2>/dev/null || echo "no-health-check")
        if [ "$health" != "no-health-check" ]; then
            if [ "$health" = "healthy" ]; then
                echo -e "   Health: ${GREEN}✅ Healthy${NC}"
            elif [ "$health" = "unhealthy" ]; then
                echo -e "   Health: ${RED}❌ Unhealthy${NC}"
            else
                echo -e "   Health: ${YELLOW}⏳ $health${NC}"
            fi
        fi
        
        # Show resource usage
        local stats=$(docker stats --no-stream --format "table {{.CPUPerc}}\t{{.MemUsage}}" "$container_name" 2>/dev/null | tail -n 1)
        if [ -n "$stats" ]; then
            echo "   Resources: $stats"
        fi
        
    else
        echo -e "   Status: ${RED}❌ Not Running${NC}"
    fi
    echo ""
}

# Function to test endpoints
test_endpoint() {
    local url=$1
    local name=$2
    
    echo -e "${BLUE}🌐 Testing $name${NC}"
    
    if curl -s -f -m 10 "$url" > /dev/null 2>&1; then
        echo -e "   $url: ${GREEN}✅ OK${NC}"
    else
        echo -e "   $url: ${RED}❌ Failed${NC}"
    fi
}

# Check all containers
echo "🔍 Container Status:"
echo "==================="
check_container "luna-client" "Frontend (React)"
check_container "luna-server" "Backend (Node.js)"
check_container "luna-nginx" "Proxy (Nginx)"
check_container "luna-monitor" "Monitoring"

# Test endpoints
echo "🌐 Endpoint Health:"
echo "=================="
test_endpoint "http://localhost:80" "Main Site"
test_endpoint "http://localhost:80/api/v1/health" "API Health"
test_endpoint "http://localhost:80/api/v1/docs" "API Docs"
test_endpoint "http://localhost:5173" "Direct Frontend"
test_endpoint "http://localhost:3000/api/v1/health" "Direct Backend"
test_endpoint "http://localhost:9100/metrics" "Monitoring"
echo ""

# Show recent logs for each service
echo "📋 Recent Logs (last 10 lines):"
echo "==============================="

for container in luna-nginx luna-client luna-server; do
    if docker ps --format "{{.Names}}" | grep -q "$container"; then
        echo -e "${BLUE}📄 $container:${NC}"
        docker logs --tail 10 "$container" 2>/dev/null | sed 's/^/   /' || echo "   No logs available"
        echo ""
    fi
done

# Show Docker Compose status
echo "🐳 Docker Compose Status:"
echo "========================="
if [ -f "docker-compose.production.yml" ]; then
    docker-compose -f docker-compose.production.yml ps
else
    echo "docker-compose.production.yml not found"
fi
echo ""

echo "🔄 To refresh this monitoring, run: ./scripts/monitor-containers.sh"
echo "📊 For real-time monitoring, run: watch -n 5 ./scripts/monitor-containers.sh"
echo "🛠️  To restart services, run: ./scripts/restart-services.sh" 