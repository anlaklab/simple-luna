#!/bin/bash

# 🔍 Luna Pre-Build Verification Script
# This script verifies all critical components before deployment
# to catch issues early and avoid deployment failures

set -e  # Exit on any error

echo "🚀 Luna Pre-Build Verification Starting..."
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Function to log errors
log_error() {
    echo -e "${RED}❌ ERROR: $1${NC}"
    ((ERRORS++))
}

# Function to log warnings
log_warning() {
    echo -e "${YELLOW}⚠️  WARNING: $1${NC}"
    ((WARNINGS++))
}

# Function to log success
log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Load nvm if available
if [ -s "$HOME/.nvm/nvm.sh" ]; then
    export NVM_DIR="$HOME/.nvm"
    \. "$NVM_DIR/nvm.sh"
    
    # Try to use Node 18 if available
    if nvm list 18 >/dev/null 2>&1; then
        nvm use 18 >/dev/null 2>&1
        echo "🔄 Switched to Node.js 18 via nvm"
    fi
fi

echo "🔍 Checking critical files and dependencies..."

# 1. Check Aspose JAR file
echo "📦 Checking Aspose JAR file..."
if [ -f "lib/aspose-slides-25.6-nodejs.jar" ]; then
    JAR_SIZE=$(du -h lib/aspose-slides-25.6-nodejs.jar | cut -f1)
    log_success "Aspose JAR exists: lib/aspose-slides-25.6-nodejs.jar (${JAR_SIZE})"
    
    # Check if JAR is not empty
    if [ -s "lib/aspose-slides-25.6-nodejs.jar" ]; then
        log_success "JAR file is not empty"
    else
        log_error "JAR file exists but is empty"
    fi
else
    log_error "Aspose JAR file missing: lib/aspose-slides-25.6-nodejs.jar"
fi

# 2. Check Aspose library files
echo "📚 Checking Aspose library files..."
if [ -f "lib/aspose.slides.js" ]; then
    log_success "Aspose library found: lib/aspose.slides.js"
else
    log_error "Aspose library missing: lib/aspose.slides.js"
fi

if [ -f "lib/aspose.slides.d.ts" ]; then
    log_success "Aspose TypeScript definitions found: lib/aspose.slides.d.ts"
else
    log_warning "Aspose TypeScript definitions missing: lib/aspose.slides.d.ts"
fi

# 3. Check Docker files
echo "🐳 Checking Docker configuration..."
if [ -f "Dockerfile.production" ]; then
    log_success "Production Dockerfile found"
else
    log_error "Production Dockerfile missing"
fi

if [ -f "docker-compose.yml" ]; then
    log_success "Docker Compose file found"
else
    log_error "Docker Compose file missing"
fi

if [ -f "start-production.sh" ]; then
    log_success "Production start script found"
    
    # Check if executable
    if [ -x "start-production.sh" ]; then
        log_success "Start script is executable"
    else
        log_warning "Start script is not executable"
    fi
else
    log_error "Production start script missing"
fi

# 4. Check environment configuration
echo "⚙️ Checking environment configuration..."
if [ -f ".env" ]; then
    log_success "Environment file found"
    
    # Check critical environment variables
    if grep -q "FIREBASE_PROJECT_ID" .env; then
        log_success "Firebase project ID configured"
    else
        log_warning "Firebase project ID not found in .env"
    fi
    
    if grep -q "OPENAI_API_KEY" .env; then
        log_success "OpenAI API key configured"
    else
        log_warning "OpenAI API key not found in .env"
    fi
else
    log_warning "Environment file not found (using system env variables)"
fi

# 5. Check package.json files
echo "📦 Checking package.json files..."
if [ -f "package.json" ]; then
    log_success "Root package.json found"
else
    log_error "Root package.json missing"
fi

if [ -f "server/package.json" ]; then
    log_success "Server package.json found"
else
    log_error "Server package.json missing"
fi

if [ -f "client/package.json" ]; then
    log_success "Client package.json found"
else
    log_error "Client package.json missing"
fi

# 6. Check TypeScript configuration
echo "🔧 Checking TypeScript configuration..."
if [ -f "server/tsconfig.json" ]; then
    log_success "Server TypeScript config found"
else
    log_error "Server TypeScript config missing"
fi

if [ -f "client/tsconfig.json" ]; then
    log_success "Client TypeScript config found"
else
    log_error "Client TypeScript config missing"
fi

# 7. Test local TypeScript compilation
echo "🔨 Testing TypeScript compilation..."
echo "   Server compilation test..."
if cd server && npm run build --silent 2>/dev/null; then
    log_success "Server TypeScript compilation successful"
else
    log_error "Server TypeScript compilation failed"
fi
cd ..

echo "   Client compilation test..."
if cd client && npm run build --silent 2>/dev/null; then
    log_success "Client TypeScript compilation successful"
else
    log_error "Client TypeScript compilation failed"
fi
cd ..

# 8. Test Docker build (dry run)
echo "🐳 Testing Docker build (dry run)..."
if docker build -f Dockerfile.production -t luna-test-build --target server-builder . --quiet 2>/dev/null; then
    log_success "Docker server build test successful"
    # Clean up test image
    docker rmi luna-test-build --force 2>/dev/null || true
else
    log_error "Docker server build test failed"
fi

# 9. Check Java environment
echo "☕ Checking Java environment..."
if which java >/dev/null 2>&1; then
    JAVA_VERSION=$(java -version 2>&1 | head -n1 | cut -d'"' -f2)
    log_success "Java found: $JAVA_VERSION"
else
    log_warning "Java not found locally (will be installed in Docker)"
fi

# 10. Check Node.js version
echo "🟢 Checking Node.js environment..."
if which node >/dev/null 2>&1; then
    NODE_VERSION=$(node -v)
    log_success "Node.js found: $NODE_VERSION"
    
    # Check if Node 18
    if [[ $NODE_VERSION == v18* ]]; then
        log_success "Node.js 18 detected (compatible)"
    else
        log_warning "Node.js version is not 18 (Docker will use Node 18)"
    fi
else
    log_warning "Node.js not found locally (Docker will handle this)"
fi

# 11. Check critical directories
echo "📁 Checking critical directories..."
for dir in "server/src" "client/src" "lib"; do
    if [ -d "$dir" ]; then
        log_success "Directory exists: $dir"
    else
        log_error "Directory missing: $dir"
    fi
done

# 12. Check nginx configuration
echo "🌐 Checking nginx configuration..."
if [ -f "nginx.production.conf" ]; then
    log_success "Nginx production config found"
else
    log_error "Nginx production config missing"
fi

# 13. Check JAR file in context of Docker copy
echo "🔍 Checking JAR file copying in Dockerfile..."
if grep -q "COPY lib/" Dockerfile.production; then
    log_success "JAR file copy instruction found in Dockerfile"
else
    log_error "JAR file copy instruction missing in Dockerfile"
fi

# 14. Check for remaining direct aspose imports
echo "🔍 Checking for direct aspose.slides.js imports..."
DIRECT_IMPORTS=$(find server/src -name "*.js" -o -name "*.ts" | xargs grep -l "require.*aspose\.slides\.js" 2>/dev/null || true)
if [ -n "$DIRECT_IMPORTS" ]; then
    log_error "Direct aspose.slides.js imports found in:"
    echo "$DIRECT_IMPORTS" | while read -r file; do
        echo "   - $file"
    done
    log_error "These should use AsposeLicenseManager singleton instead"
else
    log_success "No direct aspose.slides.js imports found"
fi

# Final summary
echo ""
echo "========================================"
echo "🎯 Pre-Build Verification Summary"
echo "========================================"

if [ $ERRORS -eq 0 ]; then
    if [ $WARNINGS -eq 0 ]; then
        echo -e "${GREEN}🎉 ALL CHECKS PASSED! Ready for deployment.${NC}"
        echo -e "${GREEN}   No errors or warnings found.${NC}"
    else
        echo -e "${YELLOW}⚠️  READY WITH WARNINGS (${WARNINGS} warnings)${NC}"
        echo -e "${YELLOW}   Deployment should work but check warnings above.${NC}"
    fi
else
    echo -e "${RED}❌ DEPLOYMENT NOT READY (${ERRORS} errors, ${WARNINGS} warnings)${NC}"
    echo -e "${RED}   Fix errors before attempting deployment.${NC}"
    exit 1
fi

echo ""
echo "🚀 To deploy after fixing issues:"
echo "   1. Fix any errors listed above"
echo "   2. Run this script again to verify"
echo "   3. Deploy using: docker-compose up --build"
echo ""
echo "🔍 For debugging JAR issues:"
echo "   - Check lib/aspose-slides-25.6-nodejs.jar exists and is not empty"
echo "   - Verify JAR is copied correctly in Dockerfile"
echo "   - Check Java classpath configuration"
echo "   - Ensure no direct aspose.slides.js imports (use AsposeLicenseManager)"
echo "" 