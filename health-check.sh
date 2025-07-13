#!/bin/bash

# Health Check Script for LunaSlides.com

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

DOMAIN="lunaslides.com"
ERRORS=0

echo "🏥 LunaSlides.com Health Check"
echo "=============================="
echo ""

# Function to check service
check_service() {
    local service_name=$1
    local check_command=$2
    local expected_output=$3
    
    echo -n "Checking $service_name... "
    
    if eval "$check_command" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ OK${NC}"
        return 0
    else
        echo -e "${RED}✗ FAILED${NC}"
        ERRORS=$((ERRORS + 1))
        return 1
    fi
}

# Function to check HTTP endpoint
check_http() {
    local endpoint=$1
    local expected_code=$2
    local description=$3
    
    echo -n "Checking $description... "
    
    response_code=$(curl -s -o /dev/null -w "%{http_code}" "$endpoint")
    
    if [ "$response_code" == "$expected_code" ]; then
        echo -e "${GREEN}✓ OK (HTTP $response_code)${NC}"
        return 0
    else
        echo -e "${RED}✗ FAILED (HTTP $response_code, expected $expected_code)${NC}"
        ERRORS=$((ERRORS + 1))
        return 1
    fi
}

# 1. Check Docker services
echo "1. Docker Services:"
echo "-------------------"
services=("luna-server" "luna-client" "luna-nginx" "redis" "prometheus" "grafana")
for service in "${services[@]}"; do
    check_service "$service container" "docker ps | grep -q $service"
done
echo ""

# 2. Check API endpoints
echo "2. API Endpoints:"
echo "-----------------"
check_http "http://localhost:3000/api/v1/health" "200" "API Health"
check_http "http://localhost:3000/api/docs" "200" "Swagger Documentation"
check_http "http://localhost:3000/metrics" "200" "Prometheus Metrics"
echo ""

# 3. Check Frontend
echo "3. Frontend:"
echo "------------"
check_http "http://localhost" "200" "Frontend (HTTP)"
check_http "https://$DOMAIN" "200" "Frontend (HTTPS)"
echo ""

# 4. Check SSL Certificate
echo "4. SSL Certificate:"
echo "-------------------"
echo -n "Checking SSL certificate... "
if openssl s_client -connect $DOMAIN:443 -servername $DOMAIN < /dev/null 2>/dev/null | openssl x509 -noout -checkend 86400; then
    echo -e "${GREEN}✓ Valid (expires in more than 24 hours)${NC}"
else
    echo -e "${YELLOW}⚠ Certificate expires soon or is invalid${NC}"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# 5. Check Java Bridge
echo "5. Java Bridge for Aspose:"
echo "--------------------------"
echo -n "Checking Java in server container... "
if docker exec luna-server java -version > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Java installed${NC}"
else
    echo -e "${RED}✗ Java not found${NC}"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# 6. Check Aspose License
echo "6. Aspose License:"
echo "------------------"
echo -n "Checking license file... "
if docker exec luna-server test -f /app/Aspose.Slides.Product.Family.lic; then
    echo -e "${GREEN}✓ License file present${NC}"
else
    echo -e "${RED}✗ License file missing${NC}"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# 7. Check Monitoring
echo "7. Monitoring Services:"
echo "----------------------"
check_http "http://localhost:9090/-/healthy" "200" "Prometheus"
check_http "http://localhost:3001/api/health" "200" "Grafana"
echo ""

# 8. Check Disk Space
echo "8. System Resources:"
echo "-------------------"
echo -n "Checking disk space... "
disk_usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$disk_usage" -lt 80 ]; then
    echo -e "${GREEN}✓ OK ($disk_usage% used)${NC}"
else
    echo -e "${YELLOW}⚠ Warning: Disk usage at $disk_usage%${NC}"
    ERRORS=$((ERRORS + 1))
fi

echo -n "Checking memory... "
memory_usage=$(free | grep Mem | awk '{print int($3/$2 * 100)}')
if [ "$memory_usage" -lt 80 ]; then
    echo -e "${GREEN}✓ OK ($memory_usage% used)${NC}"
else
    echo -e "${YELLOW}⚠ Warning: Memory usage at $memory_usage%${NC}"
fi
echo ""

# 9. Check Recent Logs for Errors
echo "9. Recent Errors in Logs:"
echo "------------------------"
echo -n "Checking for recent errors... "
error_count=$(docker-compose -f docker-compose.hostinger.yml logs --tail=100 2>/dev/null | grep -i error | wc -l)
if [ "$error_count" -eq 0 ]; then
    echo -e "${GREEN}✓ No recent errors${NC}"
else
    echo -e "${YELLOW}⚠ Found $error_count error(s) in recent logs${NC}"
fi
echo ""

# 10. Test File Upload (optional)
echo "10. Functional Tests:"
echo "--------------------"
echo -n "File upload test... "
echo -e "${YELLOW}⚠ Skipped (requires authentication)${NC}"
echo ""

# Summary
echo "=============================="
if [ "$ERRORS" -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed!${NC}"
    echo "LunaSlides.com is healthy and running properly."
else
    echo -e "${RED}❌ $ERRORS check(s) failed!${NC}"
    echo "Please review the failed checks above."
fi
echo ""

# Performance metrics
echo "📊 Quick Performance Check:"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" | grep -E "(CONTAINER|luna-)"

exit $ERRORS