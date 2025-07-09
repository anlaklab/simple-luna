# 🌙 Luna - AI-Powered PowerPoint Processing Platform

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

## 🏗️ Architecture

### Backend (Node.js 18 + Express)
```
server/
├── app/
│   ├── controllers/     # Request/response handling
│   ├── routes/         # API route definitions
│   ├── middleware/     # Express middleware
│   └── services/       # Business logic
├── config/             # Configuration files
└── index.js           # Server entry point
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
