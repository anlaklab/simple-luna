#!/bin/bash

# Pre-deployment Checklist for LunaSlides.com

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "🔍 LunaSlides.com Pre-deployment Checklist"
echo "=========================================="
echo ""

ISSUES=0

# Function to check item
check_item() {
    local description=$1
    local check_command=$2
    local fix_hint=$3
    
    echo -n "Checking $description... "
    
    if eval "$check_command" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ OK${NC}"
        return 0
    else
        echo -e "${RED}✗ MISSING${NC}"
        echo -e "  ${YELLOW}→ Fix: $fix_hint${NC}"
        ISSUES=$((ISSUES + 1))
        return 1
    fi
}

# Function to check file content
check_config() {
    local file=$1
    local pattern=$2
    local description=$3
    
    echo -n "Checking $description... "
    
    if [ -f "$file" ] && grep -q "$pattern" "$file" 2>/dev/null; then
        echo -e "${GREEN}✓ Configured${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠ Not configured${NC}"
        ISSUES=$((ISSUES + 1))
        return 1
    fi
}

echo "1. Required Files:"
echo "------------------"
check_item "Aspose.Slides license" "test -f Aspose.Slides.Product.Family.lic" "Copy your license file to the project root"
check_item ".env configuration" "test -f .env" "Copy env.example to .env and configure"
check_item "Docker Compose file" "test -f docker-compose.hostinger.yml" "Ensure docker-compose.hostinger.yml exists"
check_item "Nginx configuration" "test -f nginx.hostinger.conf" "Ensure nginx.hostinger.conf exists"
echo ""

echo "2. Scripts & Permissions:"
echo "------------------------"
check_item "Deployment script" "test -x deploy-to-hostinger.sh" "Run: chmod +x deploy-to-hostinger.sh"
check_item "TypeScript fix script" "test -x fix-typescript-errors.sh" "Run: chmod +x fix-typescript-errors.sh"
check_item "Health check script" "test -x health-check.sh" "Run: chmod +x health-check.sh"
check_item "Backup script" "test -x backup.sh" "Run: chmod +x backup.sh"
echo ""

echo "3. Environment Configuration:"
echo "----------------------------"
if [ -f .env ]; then
    check_config ".env" "FIREBASE_PROJECT_ID=" "Firebase Project ID"
    check_config ".env" "FIREBASE_PRIVATE_KEY=" "Firebase Private Key"
    check_config ".env" "OPENAI_API_KEY=" "OpenAI API Key"
    check_config ".env" "JWT_SECRET=" "JWT Secret"
    check_config ".env" "CORS_ORIGIN=" "CORS Origin"
else
    echo -e "${RED}✗ .env file not found${NC}"
fi
echo ""

echo "4. Docker Images:"
echo "-----------------"
check_item "Server Dockerfile" "test -f server/Dockerfile.production" "Run fix-typescript-errors.sh to create"
check_item "Client Dockerfile" "test -f client/Dockerfile.production" "Run fix-typescript-errors.sh to create"
echo ""

echo "5. Monitoring Configuration:"
echo "---------------------------"
check_item "Prometheus config" "test -f monitoring/prometheus.yml" "Run fix-typescript-errors.sh to create"
check_item "Grafana provisioning" "test -d monitoring/grafana/provisioning" "Run fix-typescript-errors.sh to create"
echo ""

echo "6. TypeScript Definitions:"
echo "--------------------------"
check_item "Aspose type definitions" "test -f lib/aspose.slides.d.ts" "Run fix-typescript-errors.sh to create"
echo ""

echo "7. Test Configuration:"
echo "---------------------"
check_item "Server Jest config" "test -f server/jest.config.js" "Run fix-typescript-errors.sh to create"
check_item "Client Jest config" "test -f client/jest.config.js" "Run fix-typescript-errors.sh to create"
check_item "Playwright config" "test -f playwright.config.ts" "Run fix-typescript-errors.sh to create"
echo ""

# Summary
echo "=========================================="
if [ "$ISSUES" -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed! Ready for deployment.${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Review .env configuration one more time"
    echo "2. Ensure your domain DNS points to the VPS"
    echo "3. Run: ./deploy-to-hostinger.sh"
else
    echo -e "${RED}❌ Found $ISSUES issue(s) that need attention.${NC}"
    echo ""
    echo "Recommended actions:"
    echo "1. Run: ./fix-typescript-errors.sh"
    echo "2. Configure your .env file"
    echo "3. Ensure Aspose.Slides license is in place"
    echo "4. Run this check again"
fi

echo ""
echo "For detailed deployment instructions, see:"
echo "- PRODUCTION_DEPLOYMENT_GUIDE.md"
echo "- DEPLOYMENT_COMPLETE.md"

exit $ISSUES