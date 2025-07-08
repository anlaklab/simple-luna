# =============================================================================
# Luna Server - Production Dockerfile
# 
# Multi-stage build for optimized production deployment
# =============================================================================

# =============================================================================
# Stage 1: Build Stage
# =============================================================================
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    libc6-compat \
    vips-dev

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies (including dev dependencies for build)
RUN npm ci --only=production --ignore-scripts && \
    npm cache clean --force

# Copy source code
COPY src/ ./src/
COPY lib/ ./lib/

# Build the application
RUN npm run build

# =============================================================================
# Stage 2: Production Stage
# =============================================================================
FROM node:18-alpine AS production

# Install runtime dependencies
RUN apk add --no-cache \
    dumb-init \
    fontconfig \
    ttf-dejavu \
    cairo \
    pango \
    glib \
    vips

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S luna -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production --ignore-scripts && \
    npm cache clean --force

# Copy built application from builder stage
COPY --from=builder --chown=luna:nodejs /app/dist ./dist
COPY --from=builder --chown=luna:nodejs /app/lib ./lib

# Create required directories with proper permissions
RUN mkdir -p temp/uploads temp/aspose temp/downloads logs && \
    chown -R luna:nodejs temp logs

# Copy environment template
COPY .env.example .env.example

# Health check script
COPY <<EOF /app/healthcheck.js
const http = require('http');

const options = {
  hostname: 'localhost',
  port: process.env.PORT || 3000,
  path: '/api/v1/health',
  method: 'GET',
  timeout: 5000,
};

const req = http.request(options, (res) => {
  if (res.statusCode === 200) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});

req.on('error', () => {
  process.exit(1);
});

req.on('timeout', () => {
  req.destroy();
  process.exit(1);
});

req.end();
EOF

# Set proper permissions
RUN chown luna:nodejs /app/healthcheck.js && \
    chmod +x /app/healthcheck.js

# Switch to non-root user
USER luna

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node /app/healthcheck.js

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/index.js"]

# =============================================================================
# Metadata
# =============================================================================
LABEL maintainer="Luna Team <team@lunaserver.com>"
LABEL version="1.0.0"
LABEL description="Luna Server - Professional PowerPoint processing API"
LABEL org.opencontainers.image.source="https://github.com/luna-team/luna-server"
LABEL org.opencontainers.image.documentation="https://github.com/luna-team/luna-server#readme"
LABEL org.opencontainers.image.licenses="MIT" 