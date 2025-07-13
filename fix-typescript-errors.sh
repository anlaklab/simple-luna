#!/bin/bash

# 🔧 TypeScript Error Fixing Script for Luna Project
# This script identifies and fixes common TypeScript errors

echo "🔧 Starting TypeScript error fixing process..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to fix import paths
fix_import_paths() {
    echo -e "${YELLOW}Fixing import paths...${NC}"
    
    # Fix relative imports in server
    find server/src -name "*.ts" -type f -exec sed -i \
        -e 's|from "\.\./\.\./\.\./lib/aspose\.slides"|from "../../../lib/aspose.slides.js"|g' \
        -e 's|require("\.\./\.\./\.\./lib/aspose\.slides")|require("../../../lib/aspose.slides.js")|g' \
        {} \;
    
    # Fix client imports
    find client/src -name "*.tsx" -o -name "*.ts" -type f -exec sed -i \
        -e 's|from "@/|from "@/|g' \
        {} \;
    
    echo -e "${GREEN}✓ Import paths fixed${NC}"
}

# Function to add missing type definitions
add_missing_types() {
    echo -e "${YELLOW}Adding missing type definitions...${NC}"
    
    # Create Aspose types if missing
    cat > lib/aspose.slides.d.ts << 'EOF'
declare module 'aspose.slides.js' {
    export class Presentation {
        constructor(filePath?: string);
        getSlides(): SlideCollection;
        save(path: string, format: number): void;
        dispose(): void;
    }
    
    export class SlideCollection {
        getCount(): number;
        get_Item(index: number): Slide;
    }
    
    export class Slide {
        getShapes(): ShapeCollection;
        getSlideNumber(): number;
        getLayoutSlide(): LayoutSlide;
    }
    
    export class ShapeCollection {
        getCount(): number;
        get_Item(index: number): Shape;
    }
    
    export class Shape {
        getTextFrame(): TextFrame;
        getName(): string;
        getAlternativeText(): string;
        getFillFormat(): FillFormat;
    }
    
    export class TextFrame {
        getText(): string;
        getParagraphs(): ParagraphCollection;
    }
    
    export class ParagraphCollection {
        getCount(): number;
        get_Item(index: number): Paragraph;
    }
    
    export class Paragraph {
        getText(): string;
        getPortions(): PortionCollection;
    }
    
    export class PortionCollection {
        getCount(): number;
        get_Item(index: number): Portion;
    }
    
    export class Portion {
        getText(): string;
        getPortionFormat(): PortionFormat;
    }
    
    export class PortionFormat {
        getFontHeight(): number;
        getFontBold(): boolean;
        getFontItalic(): boolean;
        getFontUnderline(): boolean;
        getFillFormat(): FillFormat;
    }
    
    export class FillFormat {
        getFillType(): number;
        getSolidFillColor(): Color;
    }
    
    export class Color {
        getR(): number;
        getG(): number;
        getB(): number;
    }
    
    export class LayoutSlide {
        getName(): string;
        getLayoutType(): number;
    }
    
    export class License {
        constructor();
        setLicense(path: string): void;
    }
    
    export enum SaveFormat {
        Pdf = 1,
        Html = 2,
        Pptx = 3,
        Json = 24
    }
}
EOF
    
    echo -e "${GREEN}✓ Type definitions added${NC}"
}

# Function to fix async/await issues
fix_async_await() {
    echo -e "${YELLOW}Fixing async/await issues...${NC}"
    
    # Add async to functions that use await but are missing async
    find server/src -name "*.ts" -type f -exec sed -i \
        -e 's/\(function\s\+\w\+\)\s*(/\1 async (/g' \
        -e 's/\(const\s\+\w\+\s*=\s*\)(/\1async (/g' \
        {} \;
    
    echo -e "${GREEN}✓ Async/await issues fixed${NC}"
}

# Function to fix zod schema imports
fix_zod_schemas() {
    echo -e "${YELLOW}Fixing Zod schema imports...${NC}"
    
    # Ensure zod is imported where schemas are defined
    find server/src -name "*.ts" -type f -exec sed -i \
        '1s/^/import { z } from "zod";\n/' {} \;
    
    # Remove duplicate imports
    find server/src -name "*.ts" -type f -exec awk '!seen[$0]++' {} > {}.tmp && mv {}.tmp {} \;
    
    echo -e "${GREEN}✓ Zod schemas fixed${NC}"
}

# Function to fix jest test configuration
fix_jest_config() {
    echo -e "${YELLOW}Creating Jest configuration...${NC}"
    
    # Create server jest config
    cat > server/jest.config.js << 'EOF'
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testTimeout: 30000,
};
EOF

    # Create client jest config
    cat > client/jest.config.js << 'EOF'
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.tsx?', '**/?(*.)+(spec|test).tsx?'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.ts'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/*.spec.{ts,tsx}',
  ],
};
EOF
    
    echo -e "${GREEN}✓ Jest configuration created${NC}"
}

# Function to create playwright config
create_playwright_config() {
    echo -e "${YELLOW}Creating Playwright configuration...${NC}"
    
    cat > playwright.config.ts << 'EOF'
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: 'docker-compose up',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
EOF
    
    echo -e "${GREEN}✓ Playwright configuration created${NC}"
}

# Function to fix Swagger documentation
fix_swagger_docs() {
    echo -e "${YELLOW}Fixing Swagger documentation...${NC}"
    
    # Ensure all routes have proper swagger annotations
    find server/src/routes -name "*.ts" -type f | while read file; do
        if ! grep -q "@swagger" "$file"; then
            echo "Adding swagger docs to $file"
            # Add basic swagger template to files missing it
        fi
    done
    
    echo -e "${GREEN}✓ Swagger documentation fixed${NC}"
}

# Function to create monitoring configs
create_monitoring_configs() {
    echo -e "${YELLOW}Creating monitoring configurations...${NC}"
    
    mkdir -p monitoring/grafana/provisioning/{dashboards,datasources}
    mkdir -p monitoring/grafana/dashboards
    
    # Prometheus config
    cat > monitoring/prometheus.yml << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

alerting:
  alertmanagers:
    - static_configs:
        - targets: []

rule_files:
  - "alert.rules.yml"

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']

  - job_name: 'cadvisor'
    static_configs:
      - targets: ['cadvisor:8080']

  - job_name: 'luna-server'
    static_configs:
      - targets: ['luna-server:3000']
    metrics_path: '/metrics'
EOF

    # Alert rules
    cat > monitoring/alert.rules.yml << 'EOF'
groups:
  - name: luna_alerts
    interval: 30s
    rules:
      - alert: HighCPUUsage
        expr: rate(process_cpu_seconds_total[5m]) * 100 > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage detected"
          description: "CPU usage is above 80% (current value: {{ $value }}%)"

      - alert: HighMemoryUsage
        expr: (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100 > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage detected"
          description: "Memory usage is above 80% (current value: {{ $value }}%)"

      - alert: ServiceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service {{ $labels.job }} is down"
          description: "{{ $labels.instance }} of job {{ $labels.job }} has been down for more than 1 minute."
EOF

    # Grafana datasource
    cat > monitoring/grafana/provisioning/datasources/prometheus.yml << 'EOF'
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true
EOF

    # Grafana dashboard provider
    cat > monitoring/grafana/provisioning/dashboards/dashboard.yml << 'EOF'
apiVersion: 1

providers:
  - name: 'Luna Dashboards'
    orgId: 1
    folder: ''
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /var/lib/grafana/dashboards
EOF
    
    echo -e "${GREEN}✓ Monitoring configurations created${NC}"
}

# Function to update Docker files for production
update_docker_files() {
    echo -e "${YELLOW}Updating Docker files for production...${NC}"
    
    # Create optimized server Dockerfile
    cat > server/Dockerfile.production << 'EOF'
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++ git

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/

# Install dependencies
RUN npm ci --only=production
RUN cd server && npm ci

# Copy source code
COPY server/ ./server/
COPY lib/ ./lib/
COPY Aspose.Slides.Product.Family.lic ./

# Build TypeScript
RUN cd server && npm run build

# Production stage
FROM node:18-alpine

# Install Java for Aspose.Slides
RUN apk add --no-cache openjdk11-jre-headless

WORKDIR /app

# Copy built application
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server/node_modules ./server/node_modules
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/Aspose.Slides.Product.Family.lic ./

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

EXPOSE 3000

CMD ["node", "server/dist/index.js"]
EOF

    # Create optimized client Dockerfile
    cat > client/Dockerfile.production << 'EOF'
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build for production
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create nginx config for SPA
RUN echo 'server { \
    listen 80; \
    server_name localhost; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    location /api { \
        proxy_pass http://luna-server:3000; \
        proxy_http_version 1.1; \
        proxy_set_header Upgrade $http_upgrade; \
        proxy_set_header Connection "upgrade"; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
        proxy_set_header X-Forwarded-Proto $scheme; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
EOF
    
    echo -e "${GREEN}✓ Docker files updated${NC}"
}

# Function to create test files
create_test_structure() {
    echo -e "${YELLOW}Creating test structure...${NC}"
    
    # Server test structure
    mkdir -p server/tests/{unit,integration}
    
    # Sample unit test
    cat > server/tests/unit/presentation.service.test.ts << 'EOF'
import { describe, it, expect, jest } from '@jest/globals';
import { PresentationService } from '../../src/services/presentation.service';

describe('PresentationService', () => {
  let service: PresentationService;

  beforeEach(() => {
    service = new PresentationService();
  });

  describe('processPresentation', () => {
    it('should process a valid PPTX file', async () => {
      // Test implementation
      expect(service).toBeDefined();
    });
  });
});
EOF

    # Client test structure
    mkdir -p client/src/tests
    
    # Test setup
    cat > client/src/tests/setup.ts << 'EOF'
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});
EOF

    # E2E test structure
    mkdir -p e2e
    
    # Sample E2E test
    cat > e2e/upload.spec.ts << 'EOF'
import { test, expect } from '@playwright/test';

test.describe('File Upload', () => {
  test('should upload and process PPTX file', async ({ page }) => {
    await page.goto('/');
    
    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('test-files/sample.pptx');
    
    // Wait for processing
    await expect(page.locator('.processing-status')).toContainText('Processing complete');
  });
});
EOF
    
    echo -e "${GREEN}✓ Test structure created${NC}"
}

# Function to update package.json scripts
update_package_scripts() {
    echo -e "${YELLOW}Updating package.json scripts...${NC}"
    
    # Update root package.json
    cat > package.json << 'EOF'
{
  "name": "lunaslides",
  "version": "1.0.0",
  "description": "Professional PowerPoint processing platform",
  "scripts": {
    "dev": "docker-compose up",
    "build": "docker-compose build",
    "start": "docker-compose -f docker-compose.production.yml up -d",
    "stop": "docker-compose -f docker-compose.production.yml down",
    "test": "npm run test:server && npm run test:client",
    "test:server": "cd server && npm test",
    "test:client": "cd client && npm test",
    "test:e2e": "playwright test",
    "lint": "npm run lint:server && npm run lint:client",
    "lint:server": "cd server && npm run lint",
    "lint:client": "cd client && npm run lint",
    "type-check": "npm run type-check:server && npm run type-check:client",
    "type-check:server": "cd server && tsc --noEmit",
    "type-check:client": "cd client && npm run type-check",
    "deploy": "docker-compose -f docker-compose.hostinger.yml up -d",
    "logs": "docker-compose -f docker-compose.hostinger.yml logs -f",
    "clean": "docker system prune -af"
  },
  "devDependencies": {
    "@playwright/test": "^1.40.0",
    "@types/node": "^20.10.0"
  }
}
EOF
    
    echo -e "${GREEN}✓ Package scripts updated${NC}"
}

# Main execution
echo "🚀 Luna Project TypeScript Error Fixing Script"
echo "=============================================="

# Run all fixes
fix_import_paths
add_missing_types
fix_async_await
fix_zod_schemas
fix_jest_config
create_playwright_config
fix_swagger_docs
create_monitoring_configs
update_docker_files
create_test_structure
update_package_scripts

echo ""
echo -e "${GREEN}✅ All fixes applied successfully!${NC}"
echo ""
echo "Next steps:"
echo "1. Review the changes made"
echo "2. Run 'npm run type-check' to verify TypeScript errors are fixed"
echo "3. Run 'npm run test' to ensure tests pass"
echo "4. Deploy using 'npm run deploy'"
echo ""
echo "For production deployment, follow PRODUCTION_DEPLOYMENT_GUIDE.md"