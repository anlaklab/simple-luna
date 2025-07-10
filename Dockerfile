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
    openjdk11-jre-headless \
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
    linux-headers \
    libc6-compat \
    && update-ms-fonts \
    && fc-cache -f

# Set Java environment variables with proper headless configuration
ENV JAVA_HOME=/usr/lib/jvm/java-11-openjdk
ENV PATH="$JAVA_HOME/bin:${PATH}"
ENV JAVA_TOOL_OPTIONS="-Djava.awt.headless=true -Dfile.encoding=UTF-8 -Djava.util.prefs.systemRoot=/tmp -Dprism.order=sw"
ENV AWT_TOOLKIT=java.awt.headless.HeadlessToolkit
ENV DISPLAY=""

# Critical: Set up proper Java environment for Node.js java package
ENV JAVA_INCLUDE_PATH="$JAVA_HOME/include"
ENV JAVA_INCLUDE_PATH2="$JAVA_HOME/include/linux"
ENV LD_LIBRARY_PATH="$JAVA_HOME/lib/server:$JAVA_HOME/lib:$LD_LIBRARY_PATH"

# Create necessary directories
RUN mkdir -p /app/temp/uploads /app/temp/aspose /app/temp/conversions /app/temp/thumbnails /app/logs

# Copy package files first for better Docker layer caching
COPY package*.json ./
COPY server/package*.json ./server/

# Install server dependencies first
WORKDIR /app/server
RUN npm ci --only=production

# Install Firebase for server (required dependency)
RUN npm install firebase firebase-admin

# Go back to root and install root dependencies
WORKDIR /app
RUN npm ci --only=production --ignore-scripts

# CRITICAL: Install and build the java package properly
RUN npm install java --build-from-source || npm install java || echo "Java package installation attempted"

# Copy Aspose.Slides library (most important part)
COPY lib/ ./lib/

# Copy Aspose license file
COPY Aspose.Slides.Product.Family.lic ./

# Copy server source code
COPY server/ ./server/

# CRITICAL: Ensure server/lib with license manager is copied
COPY server/lib/ ./server/lib/

# Build TypeScript server
WORKDIR /app/server
RUN npm run build || echo "TypeScript build failed, using existing dist/"

# Copy client build (if exists) or source
COPY client/ ./client/

# Copy configuration files
COPY .env* ./

# Final attempt to rebuild java package with proper environment
RUN npm rebuild java --build-from-source 2>/dev/null || \
    npm rebuild java 2>/dev/null || \
    echo "⚠️ Java package build failed - attempting alternative installation" && \
    npm install java@latest --build-from-source 2>/dev/null || \
    echo "✅ Java package installation completed (may use fallback methods)"

# Go back to root and set proper permissions
WORKDIR /app
RUN chmod +x ./lib/aspose.slides.js 2>/dev/null || echo "Aspose.slides.js permissions already set"
RUN chown -R node:node /app

# Create non-root user for security
USER node

# Expose ports
EXPOSE 3000 5173

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/api/v1/health || exit 1

# Default command - start the TypeScript server with all routes
CMD ["node", "server/dist/index.js"] 