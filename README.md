# 🌙 Luna - AI-Powered PowerPoint Processing Platform

Versión 0.01

Luna is a professional PowerPoint processing platform with AI capabilities that converts PPTX files to Universal JSON schema and provides advanced analysis through a React frontend and Node.js backend.

## ✨ Features

- 🤖 **AI-Powered Generation**: Create presentations using OpenAI GPT-4
- 🔄 **PPTX Conversion**: Convert PowerPoint files to Universal JSON schema using **LOCAL Aspose.Slides library**
- 🖼️ **Thumbnail Generation**: Automatic slide thumbnail creation
- 🔥 **Firebase Integration**: Real-time data storage and synchronization
- 📊 **Session Management**: Version control with diff/revert capabilities
- 🎨 **Modern UI**: React frontend with shadcn/ui design system
- 🔧 **Clean Architecture**: Modular, scalable backend design
- 🐳 **Docker Support**: Node.js 18 environment for Aspose.Slides compatibility

## 🚫 NO MOCK DATA POLICY

**Luna processes REAL PowerPoint files with REAL content:**
- ✅ **ALL slides processed** (even 230+ slides)
- ✅ **Real text extraction** from shapes and text frames
- ✅ **Real formatting preservation** (fonts, colors, styles)
- ✅ **Local Aspose.Slides library** (NO cloud APIs)
- ❌ **NO mock data, test files, or placeholder content**

## 🚀 Quick Start with Docker (Recommended)

### Prerequisites

- Docker and Docker Compose
- Git

### 1. Clone and Setup

```bash
git clone <repository-url>
cd aspose-slides-25.6-nodejs

# Copy environment configuration
cp .env.example .env
# Edit .env with your Firebase and OpenAI credentials
```

### 2. Start with Docker

```bash
# Start Luna with Docker (Node.js 18 + Aspose.Slides)
./docker-start.sh

# Or rebuild from scratch
./docker-start.sh --rebuild
```

### 3. Access Luna

- 🌐 **Frontend**: http://localhost:5173
- 🔧 **Backend**: http://localhost:3000
- 📋 **API Docs**: http://localhost:3000/api/docs

### 4. Test Real PPTX Processing

1. Upload a real PPTX file (any size, any number of slides)
2. Watch as Luna processes **ALL slides** with real content
3. Use the chat interface for AI-powered modifications

## 🔧 Manual Setup (Alternative)

### Prerequisites

- Node.js 18.x (required for Aspose.Slides compatibility)
- Java 11+ (for Aspose.Slides local library)
- Git

### Installation

```bash
# Use Node.js 18
nvm use 18

# Install dependencies
npm install
cd server && npm install
cd ../client && npm install

# Build client
npm run build

# Start development
npm run dev
```

## 🐳 Docker Commands

```bash
# Start services
./docker-start.sh

# View logs
docker-compose logs -f
docker-compose logs -f luna-server
docker-compose logs -f luna-client

# Stop services
docker-compose down

# Restart services
docker-compose restart

# Clean up (remove volumes and images)
docker-compose down -v --rmi all
```

## 📋 Environment Configuration

### Required Environment Variables

```bash
# Firebase (Required)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_STORAGE_BUCKET=your-project.appspot.com

# OpenAI (Optional - for AI features)
OPENAI_API_KEY=sk-your-openai-api-key-here
OPENAI_MODEL=gpt-4-turbo-preview

# Aspose.Slides (Local Library - Automatic)
ASPOSE_LICENSE_PATH=/app/lib/Aspose.Slides.lic
JAVA_HOME=/usr/lib/jvm/java-11-openjdk
```

## 🎨 Architecture

### Phase 3: Modular Architecture (CrewAI/LangChain Style)

Luna implements a sophisticated modular architecture with base + extensions pattern:

```
server/src/modules/
├── shared/                    # Base interfaces and common functionality
│   ├── interfaces/            # BaseService, BaseProcessor, FeatureFlags
│   ├── base/                  # Abstract processors and base classes
│   ├── extensions/            # Modular extensions (validation, caching, metrics)
│   ├── factories/             # Central module factory (DI container)
│   └── adapters/              # Shared adapters (Firebase, OpenAI, Aspose)
├── conversion/                # PPTX processing and format conversion
│   ├── endpoints/             # Granular endpoint organization
│   │   ├── pptx2json/         # PPTX → JSON conversion
│   │   ├── json2pptx/         # JSON → PPTX reconstruction  
│   │   ├── thumbnails/        # Thumbnail generation
│   │   └── enhanced-pptx2json/ # Enhanced conversion with extensions
│   ├── factories/             # Conversion-specific factory
│   ├── services/              # Comprehensive ConversionService
│   └── types/                 # Conversion-specific types
├── presentations/             # Individual slide operations
│   ├── subservices/           # Modular sub-services
│   │   ├── slide.service.ts   # Single slide operations
│   │   ├── template.service.ts # Templates & master slides
│   │   └── notes.service.ts   # Notes extraction/management
│   └── factory.ts             # Presentations factory
├── ai/                        # AI capabilities and chat
│   ├── endpoints/             # AI-specific endpoints
│   ├── factories/             # AI factory with processors
│   └── services/              # AI service orchestration
├── extraction/                # Data extraction services
├── analysis/                  # Analytics and insights
├── sessions/                  # Session management
└── admin/                     # Administrative functions
```

### Backend (Node.js 18 + Express)
```
server/
├── src/modules/       # Feature-oriented modular architecture
├── adapters/          # External service integrations (Aspose, Firebase)
├── config/            # Configuration files
└── index.ts          # Server entry point with module initialization
```

### Frontend (React + Vite + TypeScript)
```
client/
├── src/
│   ├── components/     # React components
│   ├── hooks/          # React Query + API logic
│   ├── pages/          # Route components
│   ├── lib/            # Utilities
│   └── types/          # TypeScript definitions
└── vite.config.ts     # Vite configuration
```

### Aspose.Slides Integration
```
lib/
├── aspose.slides.js    # LOCAL library (Node.js 18 compatible)
├── aspose.slides.d.ts  # TypeScript definitions
├── Aspose.Slides.lic   # License file
└── aspose-slides-25.6-nodejs.jar  # Java library
```

## 🔀 Endpoint Mapping & Services

### Phase 3: Comprehensive Service Coverage

| Route | Controller | Service | Processors | Features | Notes |
|-------|------------|---------|------------|----------|-------|
| `POST /api/v1/convert/pptx2json` | ConversionController | ConversionService | PPTX2JSONProcessor | All slides, real extraction | Uses local Aspose.Slides |
| `POST /api/v1/convert/json2pptx` | ConversionController | ConversionService | JSON2PPTXProcessor | Bidirectional fidelity | Reconstruction with mappers |
| `POST /api/v1/convert/enhanced` | ConversionController | ConversionService | EnhancedPPTX2JSONProcessor | Extensions (validation, caching) | Base + extensions pattern |
| `POST /api/v1/convert/thumbnails` | ConversionController | ConversionService | ThumbnailsProcessor | High-quality thumbnails | Multiple formats supported |
| `POST /api/v1/convert/buffer` | ConversionController | ConversionService | ConversionService.convertToBuffer | PDF, HTML, PNG, JPG | Quality/compression settings |
| `POST /api/v1/presentations/slide` | PresentationController | SlideService | SlideService.extractSingleSlide | Individual slide ops | Toggleable features |
| `POST /api/v1/presentations/template` | PresentationController | TemplateService | TemplateService.extractTemplates | Masters, layouts, schemes | Built-in vs custom |
| `POST /api/v1/presentations/notes` | PresentationController | NotesService | NotesService.extractNotes | Speaker notes, comments | Hierarchical integration |
| `POST /api/v1/assets/extract` | ConversionController | ConversionService | ConversionService.extractAssets | Images, videos, audio | Asset type filtering |
| `POST /api/v1/metadata/extract` | ConversionController | ConversionService | ConversionService.extractMetadata | System + custom properties | Document statistics |
| `POST /api/v1/effects/extract` | ConversionController | ConversionService | ConversionService.extractEffects | Shadow, glow, reflection | Per-shape effect analysis |
| `POST /api/v1/animations/extract` | ConversionController | ConversionService | ConversionService.extractAnimations | Timelines, sequences | Animation effect details |
| `POST /api/v1/comments/extract` | ConversionController | ConversionService | ConversionService.extractComments | Author, position, timestamp | Slide-level comments |
| `POST /api/v1/ai/chat` | AIController | AIService | ChatProcessor | OpenAI integration | Context-aware responses |
| `POST /api/v1/ai/analyze` | AIController | AIService | AnalyzeProcessor | Content analysis | AI-powered insights |
| `POST /api/v1/sessions` | SessionController | SessionService | - | Version control | Diff/revert capabilities |

### Feature Flags & Toggleable Options

Each service supports comprehensive feature flags:

```typescript
interface FeatureFlags {
  extractAssets?: boolean;        // Asset extraction toggle
  includeMetadata?: boolean;      // Metadata inclusion
  includeEffects?: boolean;       // Effects processing
  includeAnimations?: boolean;    // Animation extraction  
  includeComments?: boolean;      // Comments processing
  includeNotes?: boolean;         // Notes extraction
  generateThumbnails?: boolean;   // Thumbnail generation
  enableAI?: boolean;            // AI enhancement
  cacheResults?: boolean;        // Result caching
  validateInput?: boolean;       // Input validation
  mode?: 'local' | 'cloud';     // Processing mode
}
```

### Service Dependencies & Factory Pattern

```typescript
// Central Module Factory (DI Container)
const moduleFactory = ModuleFactory.getInstance();

// Specialized Factories
const conversionFactory = ConversionFactory.getInstance();
const presentationsFactory = PresentationsFactory.getInstance();
const aiFactory = AIFactory.getInstance();

// Service Creation with Dependencies
const conversionService = conversionFactory.createComprehensiveConversionService({
  features: { extractAssets: true, includeEffects: true },
  useSharedAdapters: true
});

const slideService = presentationsFactory.createSlideService({
  features: { processShapes: true, includeNotes: true }
});
```

### Base + Extensions Pattern

Luna implements a sophisticated extension system:

```typescript
// Base Processor
class AbstractPPTXProcessor<TInput, TOutput> {
  protected extensions: Extension[] = [];
  
  async process(input: TInput): Promise<TOutput> {
    // Apply pre-processing extensions
    for (const ext of this.extensions) {
      await ext.preProcess(input);
    }
    
    // Core processing logic
    const result = await this.convert(input);
    
    // Apply post-processing extensions
    for (const ext of this.extensions) {
      await ext.postProcess(result);
    }
    
    return result;
  }
}

// Extensions
const validationExt = new ValidationExtension();
const cachingExt = new CachingExtension();
const metricsExt = new MetricsExtension();

// Enhanced Processor with Extensions
class EnhancedPPTX2JSONProcessor extends AbstractPPTXProcessor {
  constructor() {
    super();
    this.extensions = [validationExt, cachingExt, metricsExt];
  }
}
```

## 🔥 Real PowerPoint Processing

### Supported Operations

- **Upload**: Real PPTX/PPT files (any size)
- **Conversion**: PPTX → Universal JSON (all slides)
- **Extraction**: Text, shapes, formatting, images
- **Generation**: AI-powered content creation
- **Thumbnails**: Real slide previews
- **Export**: JSON → PPTX with full fidelity

### File Size Limits

- **Basic**: 10MB
- **Pro**: 50MB  
- **Premium**: 500MB
- **Enterprise**: 2GB

## 📊 API Documentation

### Core Endpoints

```bash
# Health check
GET /api/v1/health

# Upload and convert PPTX
POST /api/v1/convert/upload
Content-Type: multipart/form-data
Body: file (PPTX), generateThumbnails=true

# AI chat for modifications
POST /api/v1/ai/chat
Body: { message, presentationId, sessionId }

# Session management
GET /api/v1/sessions/:id
POST /api/v1/sessions
```

## 🔧 Development

### Local Development with Docker

```bash
# Start development environment
./docker-start.sh

# Enable hot reload (uncomment in docker-compose.yml)
# volumes:
#   - ./server:/app/server
#   - ./client:/app/client
```

### Testing Aspose.Slides

```bash
# Test library loading
docker-compose exec luna-server node -e "
const aspose = require('./lib/aspose.slides.js');
console.log('Aspose classes:', Object.keys(aspose).length);
"

# Test real PPTX processing
curl -X POST http://localhost:3000/api/v1/convert/upload \
  -F "file=@your-presentation.pptx" \
  -F "generateThumbnails=true"
```

## 🚫 Troubleshooting

### Common Issues

**Aspose.Slides not loading:**
- Ensure using Node.js 18 (not 24)
- Check Java 11+ is installed
- Verify Docker environment

**File upload fails:**
- Check file size limits
- Ensure PPTX format
- Verify server health

**No thumbnails generated:**
- Check Firebase configuration
- Verify file conversion success
- Check server logs

### Debug Commands

```bash
# Check container status
docker-compose ps

# View detailed logs
docker-compose logs -f luna-server

# Access container shell
docker-compose exec luna-server sh

# Test Aspose.Slides
docker-compose exec luna-server node -e "require('./lib/aspose.slides.js')"
```

## 📄 License

This project uses Aspose.Slides for Node.js via Java. Ensure you have appropriate licensing for production use.

## 🔗 Links

- [Aspose.Slides Documentation](https://docs.aspose.com/slides/nodejs-java/)
- [Firebase Setup](https://firebase.google.com/docs/admin/setup)
- [OpenAI API](https://platform.openai.com/docs)

---

**Luna processes REAL PowerPoint files with REAL content. No mock data, no limitations, no compromises.**

## 🚀 Phase 5: Dynamic Component Loading (IMPLEMENTED)

**Status**: ✅ **COMPLETED** - Runtime scalability achieved with zero-config extension management

### Overview

Phase 5 introduces **Dynamic Component Loading** - the ultimate scalability feature that allows extensions and components to be loaded at runtime without code changes. Simply add a new extension file to the extensions directory, and it's automatically discovered and loaded.

### 🎯 Key Features Implemented

#### 1. **Automatic Extension Discovery**
```typescript
// Extensions are auto-discovered from:
server/src/modules/shared/extensions/
├── chart-extension.ts      ✅ Auto-loaded if enabled
├── table-extension.ts      ✅ Auto-loaded if enabled  
├── video-extension.ts      ✅ Auto-loaded if enabled
└── your-new-extension.ts   ✅ Just add & restart!
```

#### 2. **Security-First Loading**
- **Path Validation**: Extensions must be in authorized directories
- **Content Scanning**: Code is validated for dangerous patterns
- **Interface Validation**: Extensions must implement required interface
- **Execution Limits**: Timeouts and memory limits enforced
- **Graceful Failures**: Individual extension failures don't crash the system

#### 3. **Zero-Config Scalability**
```bash
# Add new extension - that's it!
echo "Creating new extension..."
cp chart-extension.ts smartart-extension.ts
# Edit to implement SmartArt processing
# Restart server → automatically loaded
```

#### 4. **Runtime Management API**
Complete administrative interface for managing extensions:

```http
GET    /api/dynamic-extensions           # List all loaded extensions
GET    /api/dynamic-extensions/stats    # System statistics  
GET    /api/dynamic-extensions/health   # Health check
POST   /api/dynamic-extensions/test-all # Test all extensions
POST   /api/dynamic-extensions/reload   # Hot reload extensions
POST   /api/dynamic-extensions/:type/enable   # Enable extension
POST   /api/dynamic-extensions/:type/disable  # Disable extension
POST   /api/dynamic-extensions/:type/test     # Test specific extension
```

### 🔧 Implementation Architecture

#### Dynamic Loading Flow
```mermaid
graph TD
    A[Server Startup] --> B[Security Manager Init]
    B --> C[Scan Extensions Dir]
    C --> D[Validate File Paths]
    D --> E[Check Content Security]
    E --> F[Load & Instantiate]
    F --> G[Interface Validation]
    G --> H[Safety Testing]
    H --> I[Register in Dynamic Registry]
    I --> J[Available for Use]
    
    K[ConversionService] --> L{Extension Available?}
    L -->|Yes| M[Use Dynamic Extension]
    L -->|No| N[Use Base Extractor]
```

#### Security Layers
1. **File System Security**: Path traversal protection, authorized directories only
2. **Content Security**: Scans for dangerous patterns (`eval`, `process`, etc.)
3. **Runtime Security**: Memory limits, execution timeouts
4. **Interface Security**: Strict interface validation
5. **Execution Security**: Isolated extension execution with fallbacks

#### Extension Interface
```typescript
export interface ExtensionInterface {
  readonly name: string;
  readonly version: string;
  readonly supportedTypes: string[];
  extract(shape: any, options?: any): Promise<any>;
  initialize?(): Promise<void>;
  dispose?(): Promise<void>;
}

export default class YourExtension implements ExtensionInterface {
  // Implementation auto-discovered and loaded
}
```

### 📊 Enhanced Processing Pipeline

#### Before Phase 5 (Static Loading)
```typescript
// Had to manually register each extension
const processor = new PPTXProcessor();
processor.addExtension(new ChartExtension());
processor.addExtension(new TableExtension()); 
// ❌ Adding new extension = code change + rebuild
```

#### After Phase 5 (Dynamic Loading)
```typescript
// Extensions auto-loaded from registry
const processor = this.conversionFactory.createPPTX2JSONProcessor({
  useSharedAdapters: true,
  dynamicRegistry: getDynamicRegistry() // 🎯 Auto-includes all loaded extensions
});
// ✅ Adding new extension = just add file
```

### 🛡️ Security Configuration

#### Production Security Settings
```typescript
const PRODUCTION_SECURITY_CONFIG = {
  allowedExtensionTypes: ['chart', 'table', 'video', 'audio', 'image'],
  maxExtensionsPerType: 3,
  maxTotalExtensions: 20,
  allowedDirectories: ['/app/src/modules/shared/extensions'],
  requireSignature: true,        // Verify extension signatures
  sandboxExecution: true,        // Run in isolated sandbox
  strictTypeChecking: true,
  maxExecutionTime: 30000,       // 30 second timeout
  memoryLimit: 100 * 1024 * 1024 // 100MB limit
};
```

### 🔥 Usage Examples

#### 1. **Creating a New Extension**
```typescript
// server/src/modules/shared/extensions/audio-extension.ts
export default class AudioExtension implements ExtensionInterface {
  readonly name = 'audio';
  readonly version = '1.0.0';
  readonly supportedTypes = ['AudioFrame', 'Audio'];

  async extract(shape: any, options?: any): Promise<any> {
    // Your audio processing logic
    return {
      type: 'audio',
      duration: shape.getDuration(),
      format: shape.getFormat(),
      // ... more audio data
    };
  }
}
// 🎯 That's it! Restart server and it's auto-loaded
```

#### 2. **Runtime Extension Management**
```bash
# Check what extensions are loaded
curl http://localhost:3000/api/dynamic-extensions

# Test all extensions
curl -X POST http://localhost:3000/api/dynamic-extensions/test-all

# Enable a new extension type
curl -X POST http://localhost:3000/api/dynamic-extensions/audio/enable

# Hot reload all extensions
curl -X POST http://localhost:3000/api/dynamic-extensions/reload \
  -H "Content-Type: application/json" \
  -d '{"enabledExtensions": ["chart", "table", "video", "audio"]}'
```

#### 3. **Using Dynamic Extensions in Processing**
```typescript
// In ConversionService - extensions are automatically used
const result = await this.processPresentation(filePath, {
  includeAssets: true,
  includeMetadata: true,
  // 🎯 All enabled dynamic extensions automatically applied
});

// Extensions delegate processing based on shape type
if (shapeType === 'chart') {
  // ChartExtension.extract() called automatically
} else if (shapeType === 'table') {
  // TableExtension.extract() called automatically  
} else if (shapeType === 'audio') {
  // AudioExtension.extract() called automatically (if enabled)
}
```

### 📈 Performance & Monitoring

#### Extension Statistics
```javascript
// Real-time extension monitoring
const stats = getDynamicLoadingStats();
console.log(stats);
/*
{
  registry: {
    initialized: true,
    totalExtensions: 4,
    types: ['chart', 'table', 'video', 'audio'],
    metadata: [...]
  },
  security: {
    failures: {},
    allowedTypes: [...],
    maxExtensions: 20
  }
}
*/
```

#### Health Monitoring
```http
GET /api/dynamic-extensions/health
{
  "success": true,
  "data": {
    "status": "healthy",
    "registry": {
      "initialized": true,
      "extensionCount": 4,
      "loadedTypes": ["chart", "table", "video", "audio"]
    },
    "validation": {
      "valid": true,
      "issues": []
    }
  }
}
```

### 🎯 Development Workflow

#### Adding New Extensions
1. **Create Extension File**: Add `your-extension.ts` to `extensions/` directory
2. **Implement Interface**: Follow `ExtensionInterface` pattern
3. **Test Locally**: Use test endpoints to verify functionality
4. **Enable in Config**: Add to `enabledExtensions` array
5. **Deploy**: Extension auto-loads on server restart

#### Hot Reload in Development
```bash
# Watch for extension changes
nodemon --watch "server/src/modules/shared/extensions/**/*.ts" \
        --exec "curl -X POST http://localhost:3000/api/dynamic-extensions/reload"
```

### 🏆 Benefits Achieved

#### ✅ **Zero-Config Scalability**
- New extensions require **zero code changes**
- Just add file → auto-discovered and loaded
- No factory updates, no manual registration

#### ✅ **Enterprise Security**  
- Multi-layer security validation
- Path traversal protection
- Content scanning for dangerous patterns
- Execution limits and timeouts

#### ✅ **Runtime Management**
- Enable/disable extensions without restart
- Hot reload capabilities  
- Comprehensive monitoring and health checks
- Detailed error reporting and diagnostics

#### ✅ **Production Ready**
- Graceful degradation on extension failures
- Comprehensive error handling and logging
- Performance monitoring and limits
- Security-first design with configurable policies

### 🔄 Integration with Existing System

#### Seamless Integration
- **Existing Code**: Continues to work without changes
- **Fallback Support**: Base extractors used when extensions unavailable  
- **Backward Compatible**: Static extensions still supported
- **Performance**: Minimal overhead, lazy loading on demand

#### Factory Integration
```typescript
// ConversionFactory automatically uses dynamic registry
const processor = conversionFactory.createPPTX2JSONProcessor({
  features: { extractAssets: true },
  useSharedAdapters: true,
  dynamicRegistry: getDynamicRegistry() // 🎯 Auto-includes all extensions
});
```

---

## 🏁 **Phase 5: COMPLETE** - Ultimate Scalability Achieved

Phase 5 successfully implements the **final piece** of the modular architecture puzzle. The Luna platform now supports:

- **🔄 Runtime Component Discovery**: Extensions auto-discovered and loaded
- **🛡️ Enterprise Security**: Multi-layer validation and protection  
- **⚡ Zero-Config Scaling**: Add new extension = just add file
- **📊 Runtime Management**: Complete administrative API for extension lifecycle
- **🎯 Production Ready**: Comprehensive error handling, monitoring, and security

The system now achieves **true scalability** where adding new component types requires zero code changes - just create the extension file and restart. This completes the transformation from a monolithic adapter to a fully modular, dynamically extensible processing platform.

**Next Steps**: The architecture is now complete and ready for production deployment with unlimited extensibility.
