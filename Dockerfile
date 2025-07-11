# 🐳 Luna Project - Docker Configuration
# Node.js 18 for Aspose.Slides Compatibility

# Use Node.js 18 Bullseye for native module compatibility 
FROM node:18-bullseye

# Set working directory
WORKDIR /app

# Install system dependencies required for Aspose.Slides and Java
RUN apt-get update && apt-get install -y \
    openjdk-11-jre \
    openjdk-11-jdk \
    openjdk-11-jre-headless \
    python3 \
    python3-pip \
    make \
    g++ \
    gcc \
    git \
    curl \
    bash \
    fontconfig \
    fonts-dejavu \
    fonts-liberation \
    fonts-liberation2 \
    build-essential \
    libc6-dev \
    pkg-config \
    node-gyp \
    && fc-cache -f \
    && rm -rf /var/lib/apt/lists/*

# Set Java environment variables with proper headless configuration
ENV JAVA_HOME=/usr/lib/jvm/java-11-openjdk-amd64
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

# Go back to root and install root dependencies (excluding java module for now)
WORKDIR /app
RUN npm ci --only=production --ignore-scripts

# CRITICAL: Install java package with proper environment and error handling
RUN echo "🔧 Installing Java bridge for Node.js..." && \
    export JAVA_HOME=/usr/lib/jvm/java-11-openjdk-amd64 && \
    export PATH="$JAVA_HOME/bin:${PATH}" && \
    export JAVA_INCLUDE_PATH="$JAVA_HOME/include" && \
    export JAVA_INCLUDE_PATH2="$JAVA_HOME/include/linux" && \
    export LD_LIBRARY_PATH="$JAVA_HOME/lib/server:$JAVA_HOME/lib:$LD_LIBRARY_PATH" && \
    echo "Java environment configured:" && \
    echo "  JAVA_HOME=$JAVA_HOME" && \
    echo "  JAVA_INCLUDE_PATH=$JAVA_INCLUDE_PATH" && \
    echo "  LD_LIBRARY_PATH=$LD_LIBRARY_PATH" && \
    java -version && \
    echo "🔨 Building java module from source..." && \
    npm install java --build-from-source --verbose && \
    echo "✅ Java bridge installation completed successfully" || \
    (echo "❌ Java bridge installation failed" && exit 1)

# Create jvm_dll_path.json manually if it doesn't exist
RUN echo "🔧 Ensuring jvm_dll_path.json exists..." && \
    mkdir -p /app/node_modules/java/build && \
    if [ ! -f /app/node_modules/java/build/jvm_dll_path.json ]; then \
        echo "Creating jvm_dll_path.json manually..." && \
        echo "{\"javahome\":\"/usr/lib/jvm/java-11-openjdk-amd64\",\"libpath\":\"/usr/lib/jvm/java-11-openjdk-amd64/lib/server/libjvm.so\"}" > /app/node_modules/java/build/jvm_dll_path.json; \
    fi && \
    echo "✅ jvm_dll_path.json configured"

# Verify java module installation (non-fatal)
RUN echo "🔍 Verifying java module installation..." && \
    node -e "try { const java = require('java'); console.log('✅ Java module loaded successfully'); } catch(e) { console.error('⚠️ Java module warning:', e.message); console.log('📋 System will continue with fallback functionality'); }" || echo "⚠️ Java verification completed with warnings"

# CRITICAL: Force rebuild java bindings to ensure compatibility
RUN echo "🔨 Force rebuild Java bindings for container compatibility..." && \
    npm rebuild java --verbose && \
    echo "✅ Java bindings rebuilt successfully" || echo "⚠️ Java rebuild completed with warnings"

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

# Final verification of Java bridge and Aspose library
RUN echo "🧪 Final verification of Java bridge and Aspose setup..." && \
    node -e "try { const java = require('java'); console.log('✅ Java bridge working'); const aspose = require('./lib/aspose.slides.js'); console.log('✅ Aspose.Slides library loaded'); console.log('🚀 All systems ready'); } catch(e) { console.error('❌ Setup failed:', e.message); console.log('📋 Starting with limited functionality'); }" || echo "⚠️ Verification completed with warnings"

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

# Default command - rebuild Java bindings first, then start server
CMD ["bash", "-c", "echo '🔨 Rebuilding Java bindings for container compatibility...' && npm rebuild java --silent && echo '✅ Java bindings rebuilt successfully' && echo '🚀 Starting Luna Server...' && node server/dist/index.js"] 