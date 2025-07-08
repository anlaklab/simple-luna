# 🌙 Luna Server

**Professional Node.js + TypeScript backend for PowerPoint processing with Aspose.Slides, Firebase, and OpenAI integration**

![Node.js](https://img.shields.io/badge/Node.js-18.0%2B-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)

Luna Server is a robust, production-ready API backend that provides comprehensive PowerPoint presentation processing capabilities. It implements **Clean Architecture** principles with a modular, scalable design.

## 🚀 **Features**

### 📄 **Core Conversion APIs**
- **PPTX ↔ JSON**: Bidirectional conversion using Universal PowerPoint Schema
- **Format Conversion**: Convert presentations to PDF, HTML, PNG, JPG, SVG
- **Thumbnail Generation**: Generate slide previews in multiple formats
- **Asset Extraction**: Extract embedded images, videos, audios, documents

### 🤖 **AI-Powered Services**
- **Translation**: Native Aspose.Slides AI + OpenAI GPT-4 fallback
- **Content Analysis**: Semantic analysis, sentiment, readability, suggestions
- **Accessibility**: WCAG compliance checking and recommendations

### 📊 **Metadata & Analytics**
- **Document Properties**: Extract comprehensive presentation metadata
- **Statistics**: Analyze shapes, animations, multimedia content
- **Security Info**: Encryption, digital signatures, VBA projects

### ☁️ **Cloud Integration**
- **Firebase Storage**: Secure file storage with signed URLs
- **Firestore**: Document persistence and caching
- **OpenAI**: Advanced AI analysis and content generation

## 🏗️ **Architecture**

Luna Server follows **Clean Architecture** with clear separation of concerns:

```
/server/src/
├── 📁 adapters/          # External service integrations
│   ├── aspose.adapter.ts     # Aspose.Slides wrapper
│   ├── firebase.adapter.ts   # Firebase Admin SDK
│   └── openai.adapter.ts     # OpenAI GPT integration
├── 📁 controllers/       # HTTP request handlers
│   ├── conversion.controller.ts
│   ├── translation.controller.ts
│   ├── analysis.controller.ts
│   └── assets.controller.ts
├── 📁 services/          # Business logic layer
│   ├── conversion.service.ts
│   ├── translation.service.ts
│   ├── analysis.service.ts
│   └── assets.service.ts
├── 📁 schemas/           # Zod validation schemas
│   ├── universal-presentation.schema.ts
│   ├── api-request.schema.ts
│   └── api-response.schema.ts
├── 📁 middlewares/       # Express middleware
│   ├── validation.middleware.ts
│   ├── error.middleware.ts
│   └── rate-limit.middleware.ts
├── 📁 routes/            # Express route definitions
├── 📁 utils/             # Utility functions
│   ├── logger.ts
│   └── helpers.ts
├── 📁 config/            # Configuration management
└── index.ts              # Express server entry point
```

## 📋 **API Endpoints**

### 🔄 **Conversion Endpoints**

#### `POST /api/v1/pptx2json`
Convert PPTX file to Universal Schema JSON
```bash
curl -X POST http://localhost:3000/api/v1/pptx2json \
  -F "file=@presentation.pptx" \
  -F "options={\"includeAssets\":true,\"includeAnimations\":true}"
```

#### `POST /api/v1/json2pptx`
Convert Universal Schema JSON to PPTX file
```bash
curl -X POST http://localhost:3000/api/v1/json2pptx \
  -H "Content-Type: application/json" \
  -d @presentation-schema.json
```

#### `POST /api/v1/convertformat`
Convert presentations to different formats
```bash
curl -X POST http://localhost:3000/api/v1/convertformat \
  -F "file=@presentation.pptx" \
  -F "options={\"outputFormat\":\"pdf\",\"quality\":\"high\"}"
```

#### `POST /api/v1/thumbnails`
Generate slide thumbnails
```bash
curl -X POST http://localhost:3000/api/v1/thumbnails \
  -F "file=@presentation.pptx" \
  -F "options={\"size\":{\"width\":400,\"height\":300},\"format\":\"png\"}"
```

### 🌐 **Translation & AI Endpoints**

#### `POST /api/v1/aitranslate`
AI-powered presentation translation
```bash
curl -X POST http://localhost:3000/api/v1/aitranslate \
  -F "file=@presentation.pptx" \
  -F "options={\"targetLanguage\":\"es\",\"useAsposeAI\":true}"
```

#### `POST /api/v1/analyze`
AI-powered content analysis
```bash
curl -X POST http://localhost:3000/api/v1/analyze \
  -F "file=@presentation.pptx" \
  -F "options={\"analysisTypes\":[\"summary\",\"suggestions\",\"accessibility\"]}"
```

### 📂 **Asset & Metadata Endpoints**

#### `POST /api/v1/extract-assets`
Extract embedded files and media
```bash
curl -X POST http://localhost:3000/api/v1/extract-assets \
  -F "file=@presentation.pptx" \
  -F "options={\"assetTypes\":[\"images\",\"videos\"],\"extractToStorage\":true}"
```

#### `POST /api/v1/extract-metadata`
Extract comprehensive metadata
```bash
curl -X POST http://localhost:3000/api/v1/extract-metadata \
  -F "file=@presentation.pptx" \
  -F "options={\"analysisDepth\":\"comprehensive\"}"
```

### 📊 **System Endpoints**

#### `GET /api/v1/health`
Service health check
```bash
curl http://localhost:3000/api/v1/health
```

#### `GET /api/v1/swagger`
Interactive API documentation
```bash
open http://localhost:3000/api/v1/swagger
```

## ⚙️ **Setup & Installation**

### **Prerequisites**
- **Node.js 18.0+** (required for Aspose.Slides compatibility)
- **Java Runtime Environment** (for Aspose.Slides)
- **Firebase Project** (optional, for cloud storage)
- **OpenAI API Key** (optional, for AI features)

### **1. Environment Setup**

Copy the environment template:
```bash
cp environment.example .env
```

Configure your `.env` file:
```env
# Server Configuration
NODE_ENV=development
PORT=3000

# Firebase Configuration (optional)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_STORAGE_BUCKET=your-project.appspot.com

# OpenAI Configuration (optional)
OPENAI_API_KEY=sk-your-openai-api-key-here
OPENAI_MODEL=gpt-4-turbo-preview

# File Processing
MAX_FILE_SIZE=50MB
UPLOAD_TEMP_DIR=./temp/uploads

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=./logs/luna-server.log
```

### **2. Installation**

```bash
# Switch to Node.js 18 (required for Aspose.Slides)
nvm use 18

# Install dependencies
npm install

# Build TypeScript
npm run build

# Start development server
npm run dev

# Start production server
npm start
```

### **3. Docker Deployment**

```bash
# Build Docker image
npm run docker:build

# Run container
npm run docker:run

# Or use docker-compose
docker-compose up -d
```

## 🧪 **Testing**

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run linting
npm run lint

# Fix linting issues
npm run lint:fix
```

## 📚 **Universal PowerPoint Schema**

Luna Server uses a comprehensive Universal PowerPoint Schema that provides **100% compatibility** with Aspose.Slides functionality:

```typescript
interface UniversalPresentation {
  documentProperties?: DocumentProperties;
  security?: PresentationSecurity;
  slides: UniversalSlide[];
  slideSize: {
    width: number;
    height: number;
    type?: number;
    orientation?: number;
  };
  defaultTextStyle?: FontFormat;
  masterSlides?: UniversalSlide[];
  layoutSlides?: UniversalSlide[];
  version: string;
  generator: string;
  metadata?: PresentationMetadata;
}
```

### **Supported Elements**
- ✅ **All Shape Types**: AutoShape, Chart, Table, GroupShape, PictureFrame, VideoFrame, AudioFrame, SmartArt, OleObjectFrame, Connector
- ✅ **Text Formatting**: Font properties, paragraph formatting, text portions
- ✅ **Fill & Line Formats**: Solid colors, gradients, patterns, pictures
- ✅ **Effects**: Shadows, glows, reflections, 3D effects
- ✅ **Animations**: All animation types with timing and triggers
- ✅ **Slide Transitions**: All transition effects with timing
- ✅ **Charts**: All chart types with data and formatting
- ✅ **Tables**: Complete table structure with cell formatting
- ✅ **Multimedia**: Images, videos, audio with metadata

## 🔧 **Configuration**

### **Performance Settings**
```env
# Java VM options for Aspose.Slides
JAVA_OPTS=-Xmx2g -Xms512m

# Request limits
REQUEST_TIMEOUT=300000
BODY_PARSER_LIMIT=50mb

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### **Feature Flags**
```env
FEATURE_AI_TRANSLATION=true
FEATURE_OPENAI_ANALYSIS=true
FEATURE_ASSET_EXTRACTION=true
FEATURE_THUMBNAILS=true
FEATURE_FORMAT_CONVERSION=true
```

## 📊 **Monitoring & Logging**

Luna Server includes comprehensive logging and monitoring:

### **Structured Logging**
- HTTP requests with timing
- Business events with context
- Error tracking with stack traces
- Performance metrics with thresholds
- Security events with severity levels

### **Health Checks**
- Service availability monitoring
- Database connectivity
- External API status
- Resource usage metrics

### **Performance Metrics**
- Request processing times
- Memory and CPU usage
- Conversion success rates
- Error rates by endpoint

## 🔒 **Security Features**

- **File Validation**: MIME type and size checking
- **Request Sanitization**: Input validation with Zod
- **Rate Limiting**: Per-endpoint request throttling
- **Secure Headers**: Helmet.js security middleware
- **Error Handling**: No sensitive data in error responses
- **Temporary File Cleanup**: Automatic cleanup of uploaded files

## 🌍 **Production Deployment**

### **Firebase Hosting + Cloud Run**
```bash
# Build for production
npm run build

# Deploy to Firebase
firebase deploy --only hosting,functions
```

### **Docker + Kubernetes**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: luna-server
spec:
  replicas: 3
  selector:
    matchLabels:
      app: luna-server
  template:
    metadata:
      labels:
        app: luna-server
    spec:
      containers:
      - name: luna-server
        image: luna-server:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
```

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 **Support**

- **Documentation**: [API Documentation](http://localhost:3000/swagger)
- **Issues**: [GitHub Issues](https://github.com/luna-team/luna-server/issues)
- **Discussions**: [GitHub Discussions](https://github.com/luna-team/luna-server/discussions)

---

**Built with ❤️ by the Luna Team**

*Empowering developers with professional PowerPoint processing capabilities* 