# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Luna is an AI-powered PowerPoint processing platform built with Node.js and React. The project converts PPTX files to Universal JSON schema using the **LOCAL Aspose.Slides library** and provides AI-powered analysis capabilities.

**Key Architecture:**
- **Monorepo structure** with client (React) and server (Node.js) in separate directories
- **TypeScript server** (`server/src/`) with modern architecture and full type safety
- **Docker-first deployment** using Node.js 18 for Aspose.Slides compatibility
- **Local Aspose.Slides library** (no cloud APIs) for real PowerPoint processing

## Development Commands

### Docker Commands (Recommended)
```bash
# Start all services with Docker
./docker-start.sh

# Rebuild Docker images from scratch
./docker-start.sh --rebuild

# View logs
docker-compose logs -f
docker-compose logs -f luna-server
docker-compose logs -f luna-client

# Stop services
docker-compose down

# Clean up completely
docker-compose down -v --rmi all
```

### Manual Development
```bash
# Install dependencies
npm install
cd server && npm install
cd ../client && npm install

# Server development (TypeScript)
cd server && npm run dev

# Server build
cd server && npm run build

# Client development
cd client && npm run dev

# Client build
cd client && npm run build
```

### Testing
```bash
# Server tests
cd server && npm test

# Test Aspose.Slides functionality
docker-compose exec luna-server node -e "require('./lib/aspose.slides.js')"
```

## Architecture and Key Components

### Backend Structure
- **Main Entry Points:**
  - `server/src/index.ts` - TypeScript Express server with full features
  - `server/dist/index.js` - Compiled TypeScript server (production)

- **Core Services:**
  - `server/src/services/conversion.service.ts` - PPTX to JSON conversion pipeline
  - `server/src/services/jobs.service.ts` - Job tracking and management
  - `server/src/adapters/firebase.adapter.ts` - Firebase integration
  - `server/src/adapters/openai.adapter.ts` - AI processing integration
  - `server/src/adapters/aspose.adapter.ts` - Aspose.Slides integration (needs implementation)

- **API Structure:**
  - All routes follow `/api/v1/` pattern
  - TypeScript routes in `server/src/routes/`
  - Swagger documentation available at `/api/v1/docs`

### Frontend Structure
- **Modern React app** with TypeScript and Vite
- **Component Architecture:**
  - `client/src/components/` - React components organized by feature
  - `client/src/hooks/` - Custom React hooks for API integration
  - `client/src/pages/` - Route-level components
  - `client/src/types/` - TypeScript type definitions

- **Key Features:**
  - Presentation upload and conversion
  - AI-powered chat interface
  - Session management with diff/revert capabilities
  - Thumbnail viewer and slide analysis

### Aspose.Slides Integration
- **Local Library:** `lib/aspose.slides.js` - Main library file
- **License:** `lib/Aspose.Slides.lic` - Required license file
- **Java Dependencies:** Requires Node.js 18 and Java 11+ for proper functionality
- **Type Definitions:** `lib/aspose.slides.d.ts` - TypeScript definitions

## Environment Configuration

### Required Environment Variables
```bash
# Firebase (Required for storage)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_STORAGE_BUCKET=your-project.appspot.com

# OpenAI (Optional - for AI features)
OPENAI_API_KEY=sk-your-openai-api-key-here
OPENAI_MODEL=gpt-4-turbo-preview

# Aspose.Slides Configuration
ASPOSE_LICENSE_PATH=/app/lib/Aspose.Slides.lic
JAVA_HOME=/usr/lib/jvm/java-11-openjdk
```

## Development Guidelines

### Server Architecture
- **TypeScript Server**: Modern architecture with type safety and comprehensive features
- **Port Configuration**: Server runs on port 3000, client on port 5173
- **API Versioning**: All endpoints use `/api/v1/` prefix

### File Processing
- **Real PowerPoint Processing**: No mock data - processes actual PPTX files with real content
- **File Size Limits**: Configurable via environment (Basic: 10MB, Premium: 500MB, Enterprise: 2GB)
- **Thumbnail Generation**: Automatic slide thumbnail creation using local Aspose.Slides

### Database and Storage
- **Firebase Integration**: Used for real-time data storage and file storage
- **Session Management**: Presentations are tracked with version control capabilities
- **Local Processing**: All PowerPoint processing happens locally using Aspose.Slides

## Common Development Tasks

### Adding New API Endpoints
1. **TypeScript Route**: Add to `server/src/routes/`
2. **Controller**: Create in `server/src/controllers/`
3. **Service Layer**: Business logic in `server/src/services/`
4. **Validation**: Use Zod schemas in `server/src/schemas/`
5. **Adapter**: External service integrations in `server/src/adapters/`

### Working with Aspose.Slides
- **Library Loading**: Always check if library loads: `require('./lib/aspose.slides.js')`
- **Node.js Version**: Must use Node.js 18 (not 20 or 24) for compatibility
- **Java Requirements**: Ensure Java 11+ is available in environment
- **Error Handling**: Aspose operations can be memory-intensive, handle errors gracefully

### Frontend Development
- **State Management**: Uses React Query for API state management
- **Routing**: Uses Wouter for lightweight routing
- **UI Components**: Built with Radix UI and Tailwind CSS
- **Type Safety**: Full TypeScript integration with proper type definitions

## Deployment

### Docker Deployment (Recommended)
- **Base Image**: `node:18-alpine` with Java 11 installed
- **Multi-stage Build**: Separate client and server builds
- **Volume Management**: Persistent storage for uploads, conversions, and logs
- **Health Checks**: Automated health monitoring for both services

### Manual Deployment
- **Node.js 18 Required**: Critical for Aspose.Slides compatibility
- **Java 11+ Required**: For Aspose.Slides Java bridge
- **Environment Setup**: Ensure all environment variables are configured
- **Build Process**: Build both client and server before deployment

## Troubleshooting

### Common Issues
- **Aspose.Slides Loading Failed**: Check Node.js version (must be 18) and Java installation
- **Memory Issues**: Aspose.Slides operations are memory-intensive, ensure adequate RAM
- **File Upload Failures**: Check file size limits and CORS configuration
- **Docker Issues**: Use `./docker-start.sh --rebuild` to force rebuild

### Debug Commands
```bash
# Check Docker container status
docker-compose ps

# Test Aspose.Slides in container
docker-compose exec luna-server node -e "console.log(Object.keys(require('./lib/aspose.slides.js')))"

# View detailed server logs
docker-compose logs -f luna-server

# Check health endpoints
curl http://localhost:3000/api/v1/health
```

## ✅ Production-Ready Backend Implementation

The TypeScript server is now **FEATURE-COMPLETE** and production-ready with enterprise-grade functionality:

### ✅ **1. Aspose.Slides Integration (COMPLETED)**
- **File:** `server/src/adapters/aspose.adapter.ts` ✅ **ENABLED & COMPLETE**
- **Features:** Complete Aspose adapter with comprehensive functionality:
  - ✅ `convertPPTXToJSON()` - Full PPTX to Universal Schema conversion
  - ✅ `convertJSONToPPTX()` - Universal Schema to PPTX generation
  - ✅ `generateThumbnails()` - Professional slide thumbnail creation
  - ✅ `extractAssets()` - Embedded media/asset extraction
  - ✅ `extractMetadata()` - Comprehensive document metadata extraction
  - ✅ `validateLicense()` - License validation and management
  - ✅ Advanced error handling and resource management

### ✅ **2. Session Management System (COMPLETED)**
- **Files:** `server/src/routes/sessions.routes.ts`, `server/src/controllers/sessions.controller.ts`, `server/src/services/session.service.ts`
- **Features:** Enterprise-grade chat session management:
  - ✅ Complete session CRUD operations with validation
  - ✅ Message management with metadata tracking
  - ✅ Session-presentation linking system
  - ✅ Archive/restore functionality with data preservation options
  - ✅ Session search and analytics
  - ✅ Export capabilities (JSON, CSV, PDF, HTML)
  - ✅ Batch session cleanup and maintenance
  - ✅ User permissions and access control

### ✅ **3. Batch Operations (COMPLETED)**
- **Files:** `server/src/routes/batch.routes.ts`, `server/src/controllers/batch.controller.ts`, `server/src/services/batch.service.ts`
- **Features:** Industrial-strength batch processing:
  - ✅ Batch presentation operations (delete, update, process)
  - ✅ Bulk thumbnail generation with multiple strategies
  - ✅ Session batch operations (archive, delete, export)
  - ✅ Real-time progress tracking and monitoring
  - ✅ Operation cancellation and retry mechanisms
  - ✅ Comprehensive reporting and analytics
  - ✅ Configurable concurrency and resource management

### ✅ **4. Upload Tier System (COMPLETED)**
- **Files:** `server/src/services/upload-tier.service.ts`, `server/src/types/upload-tier.types.ts`
- **Features:** Premium subscription management:
  - ✅ Multi-tier system (Basic: 10MB, Pro: 50MB, Premium: 500MB, Enterprise: 2GB)
  - ✅ Feature-based access control and validation
  - ✅ Usage tracking and analytics
  - ✅ Automatic tier upgrade recommendations
  - ✅ Billing integration ready
  - ✅ Promotional and override systems

### 🚧 **5. Enhanced Presentation Management (PENDING)**
- **Status:** Not yet implemented - medium priority
- **Files needed:** `server/src/routes/presentations.routes.ts`, `server/src/controllers/presentations.controller.ts`

### 🚧 **6. Schema Validation & Auto-Fix (PENDING)**
- **Status:** Not yet implemented - medium priority  
- **Files needed:** `server/src/services/schema-validator.service.ts`

### 🚧 **7. Thumbnail Manager Service (PENDING)**
- **Status:** Not yet implemented - medium priority
- **Files needed:** `server/src/services/thumbnail-manager.service.ts`

## Important Notes

- **No Mock Data Policy**: Luna processes real PowerPoint files with real content
- **Local Processing**: All PowerPoint processing happens locally, no cloud APIs
- **License Requirements**: Ensure proper Aspose.Slides licensing for production use
- **Memory Management**: PowerPoint processing can be memory-intensive, monitor resource usage
- **Version Compatibility**: Stick to Node.js 18 for Aspose.Slides compatibility
- **Architecture**: TypeScript server provides superior type safety and maintainability

# 🚀 LUNA PROJECT - CURSOR RULES
# PowerPoint Processing Platform with AI Capabilities

## 🎯 PROJECT OVERVIEW
You are working on Luna, a professional PowerPoint processing platform with AI capabilities. This project converts PPTX files to Universal JSON schema and provides advanced analysis through a React frontend and Node.js backend.

## 🚨 CRITICAL SURGICAL RULES - NEVER VIOLATE

### ❌ ULTRA CRITICAL - ENVIRONMENT & DEVELOPMENT:
1. **NEVER TOUCH .env FILE**: NEVER modify, overwrite, or recreate the .env file - it is sacred
2. **DOCKER ONLY DEVELOPMENT**: NEVER attempt to run anything locally, ONLY use Docker
3. **NO LOCAL NODE.JS**: NEVER install Node.js modules locally, ONLY in Docker containers
4. **NO LOCAL JAVA MODULE**: NEVER attempt to install java module on macOS - it will fail
5. **SURGICAL PRECISION**: Every change must be deliberate, tested, and step-by-step
6. **VERIFY BEFORE ACTION**: Always check current state before making any changes

### 🐳 DOCKER MANDATORY RULES:
1. **DOCKER IS THE ONLY ENVIRONMENT**: All development, testing, and debugging ONLY in Docker
2. **NODE.JS 18 REQUIRED**: Docker must use Node.js 18 for java module compatibility
3. **CLEAN REBUILDS**: Always rebuild Docker images when making system changes
4. **CONTAINER LOGS**: Always check Docker logs for debugging, not local execution

## 🚫 CRITICAL PROHIBITIONS - NEVER VIOLATE THESE RULES

### ❌ ABSOLUTELY FORBIDDEN - NO EXCEPTIONS:
1. **NO MOCK DATA EVER**: NEVER create mock data, test data, placeholder data, or demo data
2. **NO TESTS OR DEMOS**: NEVER create test files, demo files, or example files
3. **NO PLACEHOLDER CONTENT**: NEVER use placeholder text, dummy content, or fake data
4. **NO SIMULATED RESPONSES**: NEVER simulate API responses or fake service calls
5. **NO MOCKUPS**: NEVER create mockup presentations or sample presentations
6. **ALWAYS USE REAL DATA**: Every file, every response, every conversion must use real data
7. **ALWAYS USE REAL SERVICES**: Every API call must be to real services, never mocked

### 🔥 ULTRA CRITICAL - NO FALLBACKS POLICY:
1. **NO FALLBACK LOGIC EVER**: NEVER create "if X fails, use Y" logic between services
2. **NO LEGACY COMPATIBILITY**: If there are duplicate services, DELETE the legacy one completely
3. **FAIL FAST AND CLEAR**: If a service is not configured correctly, FAIL with explicit error
4. **NO CONDITIONAL SERVICE SELECTION**: Never choose between services based on configuration
5. **DETERMINISTIC ARCHITECTURE**: The system MUST work correctly or fail clearly - no middle ground
6. **DELETE LEGACY CODE**: When refactoring, DELETE old code completely, never leave it as fallback
7. **EXPLICIT ERROR MESSAGES**: If configuration is missing, explain EXACTLY what needs to be configured
8. **NO GRACEFUL DEGRADATION**: Never provide "reduced functionality" - either full functionality or clear failure

#### ❌ FORBIDDEN FALLBACK PATTERNS:
```javascript
// ❌ NEVER DO THIS - NO FALLBACKS
if (newService) {
  return await newService.process();
} else {
  return await legacyService.process(); // FORBIDDEN
}

// ❌ NEVER DO THIS - NO MOCK DATA
if (realData) {
  return realData;
} else {
  return mockData; // FORBIDDEN
}

// ❌ NEVER DO THIS - NO DEGRADED FUNCTIONALITY  
if (configured) {
  return fullFeatures();
} else {
  return limitedFeatures(); // FORBIDDEN
}
```

#### ✅ CORRECT PATTERNS:
```javascript
// ✅ DETERMINISTIC ARCHITECTURE
if (!requiredConfig) {
  throw new Error(`CRITICAL: Missing required config: ${missing.join(', ')}`);
}
return await service.process(); // Always use the ONLY service

// ✅ FAIL FAST AND CLEAR
const service = createService(requiredConfig); // Must succeed or throw
return await service.process();

// ✅ DELETE LEGACY COMPLETELY
// Old code is deleted, not commented out or used as fallback
```

### 🔧 ASPOSE.SLIDES MANDATORY REQUIREMENTS:
1. **USE LOCAL LIBRARY ONLY**: ALWAYS use the local Aspose.Slides library at `lib/aspose.slides.js`
2. **NEVER USE CLOUD API**: NEVER use Aspose.Slides Cloud API or any cloud service
3. **REAL CONVERSION ONLY**: Every PPTX conversion must use the actual local library
4. **PROCESS ALL SLIDES**: If a file has 230 slides, process ALL 230 slides, not 10 or any subset
5. **EXTRACT REAL CONTENT**: Extract actual text, shapes, images, and formatting from files
6. **NO SLIDE LIMITS**: Process files of any size with any number of slides

### 📋 PROJECT STRUCTURE
```
aspose-slides-25.6-nodejs/
├── client/                 # React Frontend (Vite + TypeScript)
│   ├── src/
│   │   ├── components/ui/  # shadcn/ui design system - DO NOT MODIFY
│   │   ├── components/     # Feature components
│   │   ├── hooks/          # React Query + API logic
│   │   ├── pages/          # Route components
│   │   ├── lib/            # Utilities
│   │   └── types/          # TypeScript definitions
├── server/                 # Node.js Backend (Express + TypeScript)
│   ├── src/
│   │   ├── adapters/       # External service integrations
│   │   ├── services/       # Business logic
│   │   ├── controllers/    # Request/response handling
│   │   ├── routes/         # API route definitions
│   │   └── middleware/     # Express middleware
└── lib/                    # Aspose.Slides library (LOCAL ONLY)
    ├── aspose.slides.js    # Main library file
    └── aspose.slides.d.ts  # TypeScript definitions
```