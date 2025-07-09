# 🐳 Luna Project - Docker Configuration
# Node.js 18 for Aspose.Slides Compatibility

# Use Node.js 18 Alpine for smaller image size
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies required for Aspose.Slides and Java
RUN apk add --no-cache \
    openjdk11-jre \
    openjdk11-jdk \
    python3 \
    make \
    g++ \
    git \
    curl \
    bash \
    fontconfig \
    ttf-dejavu \
    ttf-liberation \
    msttcorefonts-installer \
    && update-ms-fonts \
    && fc-cache -f

# Set Java environment variables with proper headless configuration
ENV JAVA_HOME=/usr/lib/jvm/java-11-openjdk
ENV PATH="$JAVA_HOME/bin:${PATH}"
ENV JAVA_TOOL_OPTIONS="-Djava.awt.headless=true -Dfile.encoding=UTF-8 -Djava.util.prefs.systemRoot=/tmp -Dprism.order=sw"
ENV AWT_TOOLKIT=java.awt.headless.HeadlessToolkit
ENV DISPLAY=""

# Create necessary directories
RUN mkdir -p /app/temp/uploads /app/temp/aspose /app/temp/conversions /app/logs

# Copy package files first for better Docker layer caching
COPY package*.json ./
COPY server/package*.json ./server/

# Install server dependencies first (without java issues)
WORKDIR /app/server
RUN npm ci --only=production

# Install Firebase for server (required dependency)
RUN npm install firebase firebase-admin

# Go back to root and install root dependencies without java
WORKDIR /app
RUN npm ci --only=production --ignore-scripts || npm install --only=production --ignore-scripts

# Copy Aspose.Slides library (most important part)
COPY lib/ ./lib/

# Copy server source code
COPY server/ ./server/

# CRITICAL: Ensure server/lib with license manager is copied
COPY server/lib/ ./server/lib/

# Copy client build (if exists) or source
COPY client/ ./client/

# Copy configuration files
COPY .env* ./
COPY index.js ./

# Try to build java package if possible, but don't fail if it doesn't work
RUN npm rebuild java 2>/dev/null || echo "⚠️ Java package build failed - using pre-built Aspose.Slides library instead"

# Set proper permissions
RUN chmod +x ./lib/aspose.slides.js
RUN chown -R node:node /app

# Create non-root user for security
USER node

# Expose ports
EXPOSE 3000 5173

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/api/v1/health || exit 1

# Default command - start the server
CMD ["node", "server/index.js"] 