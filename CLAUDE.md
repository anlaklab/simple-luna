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

### ❌ ULTRA CRITICAL - ENVIRONMENT & DEPLOYMENT:
1. **NEVER TOUCH .env FILE**: NEVER modify, overwrite, or recreate the .env file - it is sacred
2. **COOLIFY DEPLOYMENT ONLY**: NEVER attempt to run anything locally, ONLY deploy via Coolify from GitHub
3. **NO LOCAL DEVELOPMENT**: NEVER install Node.js modules locally, ONLY in Coolify containers
4. **NO LOCAL JAVA MODULE**: NEVER attempt to install java module locally - it will fail
5. **SURGICAL PRECISION**: Every change must be deliberate, tested, and step-by-step
6. **VERIFY BEFORE ACTION**: Always check current state before making any changes
7. **GITHUB PUSH ONLY**: All changes must be pushed to GitHub for Coolify deployment

### 🐳 COOLIFY MANDATORY RULES:
1. **COOLIFY IS THE ONLY ENVIRONMENT**: All development, testing, and debugging ONLY in Coolify
2. **NODE.JS 18 REQUIRED**: Coolify must use Node.js 18 for java module compatibility
3. **AUTOMATIC DEPLOYMENT**: Always push to GitHub for automatic Coolify deployment
4. **CONTAINER LOGS**: Always check Coolify logs for debugging, not local execution

## 🚫 CRITICAL PROHIBITIONS - NEVER VIOLATE THESE RULES

### ❌ ABSOLUTELY FORBIDDEN - NO EXCEPTIONS:
1. **NO MOCK DATA EVER**: NEVER create mock data, test data, placeholder data, or demo data
2. **NO TESTS OR DEMOS**: NEVER create test files, demo files, or example files
3. **NO PLACEHOLDER CONTENT**: NEVER use placeholder text, dummy content, or fake data
4. **NO SIMULATED RESPONSES**: NEVER simulate API responses or fake service calls
5. **NO MOCKUPS**: NEVER create mockup presentations or sample presentations
6. **ALWAYS USE REAL DATA**: Every file, every response, every conversion must use real data
7. **ALWAYS USE REAL SERVICES**: Every API call must be to real services, never mocked

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

## 🎨 DESIGN SYSTEM RULES

### VISUAL CONSISTENCY - MANDATORY
- ALWAYS use shadcn/ui components from `@/components/ui/*`
- ALWAYS use design system color tokens:
  - `bg-background`, `text-foreground`, `border-border`
  - `bg-muted`, `text-muted-foreground` 
  - `bg-card`, `text-card-foreground`
- NEVER use hardcoded colors like `text-gray-900`, `bg-blue-50`
- NEVER use custom gradients like `bg-gradient-to-br from-blue-50`

### LAYOUT HOMOGENEITY - MANDATORY LUNA DESIGN PATTERNS
- **Page Structure**: ALWAYS use this exact structure for all pages:
```tsx
<div className="min-h-screen bg-background">
  {/* Header - IDENTICAL pattern */}
  <header className="bg-white border-b border-border sticky top-0 z-50">
    <div className="px-4 py-4 md:px-6">
      <div className="flex items-center justify-between">
        {/* Header content */}
      </div>
    </div>
  </header>
  
  {/* Main Content - Consistent spacing */}
  <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
    {/* Page content */}
  </main>
</div>
```

- **Typography Scale**: ALWAYS use these exact sizes:
  - Page titles: `text-xl md:text-2xl font-bold text-foreground`
  - Section headers: `text-lg font-semibold`
  - Card titles: `text-base font-medium`
  - Body text: `text-sm text-muted-foreground`
  - Captions: `text-xs text-muted-foreground`

## 🏗️ ARCHITECTURE RULES

### SCREAMING ARCHITECTURE - RESPONSIBILITIES
- **Hooks (`hooks/`)**: ONLY state management and API calls
- **Components (`components/`)**: ONLY UI rendering and event handling  
- **Services (`services/`)**: ONLY business logic
- **Adapters (`adapters/`)**: ONLY external service integration
- **Pages (`pages/`)**: ONLY route components with minimal logic

### COMPONENT STRUCTURE - MANDATORY
```tsx
export interface ComponentProps {
  // Explicitly typed props
}

export function Component({ prop1, prop2 }: ComponentProps) {
  // 1. Hooks (useState, useQuery, etc.)
  // 2. Event handlers
  // 3. Computed values
  // 4. useEffect calls
  // 5. Early returns (loading, error states)
  // 6. Main render
}
```

## 🔥 DATA RULES

### FIREBASE/FIRESTORE MANDATORY
- ALWAYS use real data from Firebase/Firestore
- NEVER use mock data, hardcoded arrays, or static data
- ALWAYS use React Query for server state management
- ALWAYS use existing hooks: `use-api.ts`, `use-presentations.ts`

### API LAYER CENTRALIZED
- ALWAYS use `api.*` functions from `use-api.ts`
- ALL responses MUST follow `ApiResponse<T>` interface
- NEVER use direct fetch calls to endpoints
- ALWAYS handle loading and error states

## 🔧 ASPOSE.SLIDES IMPLEMENTATION RULES

### LOCAL LIBRARY USAGE - MANDATORY
```javascript
// ✅ CORRECT - Use local library
const aspose = require('../../../lib/aspose.slides.js');
const Presentation = aspose.Presentation;

// ❌ WRONG - Never use cloud API
const response = await fetch('https://api.aspose.cloud/...');
```

### REAL CONVERSION REQUIREMENTS
- ALWAYS process the actual uploaded file
- ALWAYS extract all slides (even if 230+ slides)
- ALWAYS extract real text content from shapes
- ALWAYS extract real formatting and styles
- ALWAYS extract real images and media
- NEVER limit the number of slides processed
- NEVER use random slide counts
- NEVER generate fake content

### CONVERSION WORKFLOW
```javascript
// ✅ CORRECT - Real conversion
const presentation = new Presentation(filePath);
const slideCount = presentation.getSlides().getCount();
const slides = [];

for (let i = 0; i < slideCount; i++) {
  const slide = presentation.getSlides().get_Item(i);
  // Extract real content from each slide
  slides.push(extractRealSlideContent(slide));
}

// ❌ WRONG - Never use mock data
const slideCount = Math.floor(Math.random() * 8) + 3;
const slides = Array.from({ length: slideCount }, (_, i) => ({
  // mock data
}));
```

## 🚀 USABILITY RULES

### UX SIMPLIFIED
- Maximum 3 clicks for any primary action
- ALWAYS show loading states with Skeleton components
- ALWAYS handle errors gracefully with toast notifications
- ALWAYS provide immediate feedback for user actions

### RESPONSIVE FIRST
- ALWAYS design mobile-first
- ALWAYS use `useIsMobile()` hook for conditional logic
- ALWAYS create same-screen adaptable layouts

## 📋 CODE QUALITY RULES

### TYPESCRIPT STRICT
- ALWAYS use explicit types for all props and functions
- ALWAYS use interfaces from Universal JSON schema
- NEVER use `any` or implicit types
- ALWAYS define proper TypeScript interfaces

### ERROR HANDLING MANDATORY
```tsx
// Frontend
try {
  const result = await api.someCall();
  // Handle success
} catch (error) {
  console.error('Operation failed:', error);
  toast({
    title: "Error",
    description: "Operation failed. Please try again.",
    variant: "destructive",
  });
}

// Backend
app.get('/endpoint', handleAsyncErrors(async (req, res) => {
  // Your logic here
}));
```

## 🎯 IMPLEMENTATION GUIDELINES

### WHEN PROCESSING PPTX FILES
1. ALWAYS use the local Aspose.Slides library
2. ALWAYS process ALL slides in the file
3. ALWAYS extract real content from each slide
4. NEVER use mock data or placeholder content
5. NEVER limit the number of slides processed
6. ALWAYS handle large files (200+ slides) properly

### WHEN CREATING NEW FEATURES
1. Follow screaming architecture principles
2. Add proper validation schemas
3. Implement comprehensive error handling
4. Add loading states and user feedback
5. Write TypeScript interfaces
6. Use Firebase for data persistence
7. NEVER create test data or mock responses

### WHEN DEBUGGING ISSUES
1. ALWAYS check if real data is being used
2. ALWAYS verify all slides are being processed
3. ALWAYS ensure local Aspose library is being used
4. NEVER create demo files or test cases
5. ALWAYS use real user files for testing

## 🔧 TECHNICAL CONSTRAINTS

### DEPLOYMENT & TESTING RULES
- **NO LOCAL TESTING**: Never attempt to run, test, or debug locally
- **GITHUB DEPLOYMENT ONLY**: Always push changes to GitHub and wait for deployment (max 2 minutes)
- **DEPLOYED TESTING ONLY**: Test only against deployed version at https://luna.anlaklab.com
- **NO DOCKER COMMANDS**: Never use docker-compose, docker run, or local containers
- **PUSH → WAIT → TEST**: The only testing workflow is: git push → wait 2 minutes → test deployed version

### BACKEND REQUIREMENTS
- ALWAYS use TypeScript
- ALWAYS use proper middleware for validation
- ALWAYS log errors with `logger.error()`
- ALWAYS return structured API responses
- ALWAYS use local Aspose.Slides library at `lib/aspose.slides.js`

### FRONTEND REQUIREMENTS  
- ALWAYS use Vite + React + TypeScript
- ALWAYS use Tailwind CSS with design system tokens
- ALWAYS use React Query for server state
- ALWAYS use shadcn/ui components

## 📚 KEY FILES TO REFERENCE

### Aspose.Slides Integration
- `lib/aspose.slides.js` - LOCAL library (ALWAYS use this)
- `lib/aspose.slides.d.ts` - TypeScript definitions
- NEVER use any cloud API or external Aspose services

### Design System Reference
- `client/src/pages/home.tsx` - CORRECT design system usage
- `client/src/components/ui/*` - Available UI components

### API Integration Reference  
- `client/src/hooks/use-api.ts` - Centralized API layer
- `client/src/hooks/use-presentations.ts` - Presentation data management

## 🚫 FORBIDDEN PATTERNS

### ❌ NEVER DO THIS:
```javascript
// Mock data generation
const slideCount = Math.floor(Math.random() * 8) + 3;
const mockSlides = Array.from({ length: slideCount }, ...);

// Cloud API usage
const response = await fetch('https://api.aspose.cloud/...');

// Test data creation
const testPresentation = { title: "Test", slides: [...] };

// Placeholder content
const placeholderText = "Lorem ipsum dolor sit amet...";
```

### ✅ ALWAYS DO THIS:
```javascript
// Real file processing
const presentation = new Presentation(filePath);
const actualSlideCount = presentation.getSlides().getCount();

// Real content extraction
const realText = shape.getTextFrame().getText();
const realFormatting = shape.getTextFrame().getParagraphs().get_Item(0).getPortions().get_Item(0).getPortionFormat();

// Real data storage
await firestore.collection('presentations').doc(id).set(realPresentationData);
```

## 🎨 QUICK REFERENCE

### Correct Library Usage
```javascript
// ✅ CORRECT
const aspose = require('../../../lib/aspose.slides.js');
const presentation = new aspose.Presentation(filePath);

// ❌ WRONG  
const asposeCloud = require('aspose-slides-cloud');
const api = new asposeCloud.SlidesApi();
```

### Correct Data Processing
```javascript
// ✅ CORRECT
const slideCount = presentation.getSlides().getCount();
for (let i = 0; i < slideCount; i++) {
  const slide = presentation.getSlides().get_Item(i);
  // Process real slide content
}

// ❌ WRONG
const slideCount = Math.random() * 10;
const mockSlides = generateMockSlides(slideCount);
```

## 🚀 DEPLOYMENT RULES

### COOLIFY DEPLOYMENT ONLY
- **NEVER RUN LOCALLY**: All development and testing must be done via Coolify deployment
- **GITHUB PUSH REQUIRED**: All changes must be pushed to GitHub for automatic deployment
- **NO LOCAL DOCKER**: Never use docker-compose locally, only for Coolify
- **ENVIRONMENT VARIABLES**: All configuration must be set in Coolify environment
- **PRODUCTION ONLY**: This is a production application, not a development environment

### DEPLOYMENT WORKFLOW
1. **Make changes** to code
2. **Commit and push** to GitHub
3. **Coolify automatically deploys** from GitHub
4. **Test in production** at luna.anlaklab.com
5. **Check Coolify logs** for any issues

Remember: This is a professional application that processes REAL PowerPoint files with REAL content. Every slide, every shape, every piece of text must be extracted from the actual file using the local Aspose.Slides library. NO EXCEPTIONS.

## 🔥 FINAL REMINDER

**NEVER, EVER, UNDER ANY CIRCUMSTANCES:**
- Create mock data
- Use test files
- Generate placeholder content
- Use cloud APIs instead of local library
- Limit slide processing
- Create demo presentations
- Run locally (use Coolify only)

**ALWAYS, WITHOUT EXCEPTION:**
- Use real files
- Process all slides
- Extract real content
- Use local Aspose.Slides library
- Handle large presentations properly
- Store real data in Firebase
- Deploy via Coolify from GitHub