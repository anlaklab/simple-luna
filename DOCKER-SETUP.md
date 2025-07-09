# 🐳 Luna Project - Docker Setup Guide

## 🎯 Overview

Luna uses Docker to provide a consistent Node.js 18 environment that's compatible with the Aspose.Slides local library. This eliminates the Node.js version compatibility issues we encountered with Node.js 24.

## 🚀 Quick Start

### 1. Prerequisites

- **Docker Desktop** installed and running
- **Git** for cloning the repository

### 2. Setup

```bash
# Clone the repository
git clone <repository-url>
cd aspose-slides-25.6-nodejs

# Test Docker configuration
./docker-test.sh

# Start Luna with Docker
./docker-start.sh
```

### 3. Access Luna

- 🌐 **Frontend**: http://localhost:5173
- 🔧 **Backend**: http://localhost:3000
- 📋 **API Health**: http://localhost:3000/api/v1/health

## 📋 Configuration Files

### Dockerfile
- **Base**: `node:18-alpine` (compatible with Aspose.Slides)
- **Java**: OpenJDK 11 for Aspose.Slides library
- **Security**: Non-root user execution
- **Health**: Built-in health checks

### docker-compose.yml
- **Services**: Luna server + React client
- **Volumes**: Persistent storage for uploads and logs
- **Networks**: Isolated Docker network
- **Environment**: All required variables

### Scripts
- `./docker-start.sh` - Complete setup and startup
- `./docker-test.sh` - Validate configuration without Docker
- Standard Docker Compose commands

## 🔧 Environment Variables

### Required (.env file)

```bash
# Firebase (Required for data storage)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_STORAGE_BUCKET=your-project.appspot.com

# OpenAI (Optional - for AI features)
OPENAI_API_KEY=sk-your-openai-api-key-here
```

### Automatic (Docker handles these)

```bash
# Aspose.Slides Configuration
ASPOSE_LICENSE_PATH=${ASPOSE_LICENSE_PATH:-./Aspose.Slides.Product.Family.lic}
JAVA_HOME=/usr/lib/jvm/java-11-openjdk
JAVA_OPTS=-Xmx2g -Xms512m -Djava.awt.headless=true

# File Processing
MAX_FILE_SIZE=500MB
UPLOAD_TEMP_DIR=/app/temp/uploads
ASPOSE_TEMP_DIR=/app/temp/aspose
```

## 🐳 Docker Commands

### Development

```bash
# Start all services
./docker-start.sh

# Start with rebuild
./docker-start.sh --rebuild

# View logs
docker-compose logs -f
docker-compose logs -f luna-server
docker-compose logs -f luna-client

# Stop services
docker-compose down

# Restart specific service
docker-compose restart luna-server
```

### Debugging

```bash
# Access server container
docker-compose exec luna-server sh

# Test Aspose.Slides library
docker-compose exec luna-server node -e "
const aspose = require('./lib/aspose.slides.js');
console.log('✅ Aspose loaded:', Object.keys(aspose).length, 'classes');
"

# Check Java version
docker-compose exec luna-server java -version

# View container resources
docker-compose exec luna-server ps aux
docker-compose exec luna-server df -h
```

### Cleanup

```bash
# Stop and remove containers
docker-compose down

# Remove volumes (⚠️ deletes uploaded files)
docker-compose down -v

# Remove images
docker-compose down --rmi all

# Complete cleanup
docker-compose down -v --rmi all
docker system prune -f
```

## 🔥 Real PPTX Processing

### Test Upload

```bash
# Test with real PPTX file
curl -X POST http://localhost:3000/api/v1/convert/upload \
  -F "file=@your-presentation.pptx" \
  -F "generateThumbnails=true" \
  -F "validateSchema=true"
```

### Expected Behavior

- ✅ **All slides processed** (even 230+ slides)
- ✅ **Real text extraction** from shapes
- ✅ **Real formatting preservation**
- ✅ **Thumbnail generation** for all slides
- ✅ **Firebase storage** of converted data

## 🚫 Troubleshooting

### Common Issues

**Docker not starting:**
```bash
# Check Docker status
docker info

# Start Docker Desktop
open -a Docker
```

**Build failures:**
```bash
# Clean build
docker-compose build --no-cache

# Check Dockerfile syntax
docker build -t test .
```

**Aspose.Slides errors:**
```bash
# Verify library exists
docker-compose exec luna-server ls -la /app/lib/

# Test Java installation
docker-compose exec luna-server java -version

# Check Node.js version
docker-compose exec luna-server node -v
```

**File upload issues:**
```bash
# Check container logs
docker-compose logs luna-server

# Verify volume mounts
docker-compose exec luna-server ls -la /app/temp/

# Test endpoint directly
curl -X GET http://localhost:3000/api/v1/health
```

### Performance Tuning

**Memory allocation:**
```yaml
# In docker-compose.yml
environment:
  - JAVA_OPTS=-Xmx4g -Xms1g  # Increase for large files
```

**File size limits:**
```yaml
environment:
  - MAX_FILE_SIZE=1GB  # Increase limit
```

## 📊 Architecture Benefits

### Node.js 18 Compatibility
- ✅ **Aspose.Slides works** (vs Node.js 24 incompatibility)
- ✅ **Java package compiles** without errors
- ✅ **Stable environment** across all systems

### Isolated Environment
- ✅ **No local Node.js conflicts**
- ✅ **Consistent Java version**
- ✅ **Reproducible builds**
- ✅ **Easy deployment**

### Development Experience
- ✅ **Hot reload support** (when volumes mounted)
- ✅ **Easy debugging** with container access
- ✅ **Logs aggregation** with docker-compose
- ✅ **Health monitoring** built-in

## 🔗 Production Deployment

### Docker Hub

```bash
# Build production image
docker build -t luna-production .

# Tag for registry
docker tag luna-production your-registry/luna:latest

# Push to registry
docker push your-registry/luna:latest
```

### Environment Variables

```bash
# Production .env
NODE_ENV=production
MAX_FILE_SIZE=2GB
JAVA_OPTS=-Xmx8g -Xms2g
```

## 📋 Maintenance

### Updates

```bash
# Update base image
docker-compose pull
docker-compose build --no-cache

# Update dependencies
docker-compose exec luna-server npm update
```

### Monitoring

```bash
# Container stats
docker stats

# Logs rotation
docker-compose logs --tail=100 luna-server

# Health checks
curl http://localhost:3000/api/v1/health
```

---

**Luna with Docker: Node.js 18 + Aspose.Slides + Real PowerPoint Processing** 