# 🌙 Luna - AI-Powered PowerPoint Processing Platform

Luna is a professional PowerPoint processing platform with AI capabilities that converts PPTX files to Universal JSON schema and provides advanced analysis through a React frontend and Node.js backend.

## ✨ Features

- 🤖 **AI-Powered Generation**: Create presentations using OpenAI GPT-4
- 🔄 **PPTX Conversion**: Convert PowerPoint files to Universal JSON schema
- 🖼️ **Thumbnail Generation**: Automatic slide thumbnail creation
- 🔥 **Firebase Integration**: Real-time data storage and synchronization
- 📊 **Session Management**: Version control with diff/revert capabilities
- 🎨 **Modern UI**: React frontend with shadcn/ui design system
- 🔧 **Clean Architecture**: Modular, scalable backend design

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Firebase project (optional but recommended)
- OpenAI API key (optional, for AI features)

### Installation

1. **Clone the repository:**
```bash
git clone git@github.com:anlaklab/simple-luna.git
cd simple-luna
```

2. **Set up environment variables:**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Start the application:**
```bash
./run.sh
```

This will start:
- Backend server: `http://localhost:3000`
- Frontend client: `http://localhost:5173`

## 🏗️ Project Structure

```
luna/
├── client/                 # React Frontend (Vite + TypeScript)
│   ├── src/
│   │   ├── components/ui/  # shadcn/ui design system
│   │   ├── components/     # Feature components
│   │   ├── hooks/          # React Query + API logic
│   │   ├── pages/          # Route components
│   │   └── lib/            # Utilities
├── server/                 # Node.js Backend (Express + TypeScript)
│   ├── app/
│   │   ├── controllers/    # Request/response handling
│   │   ├── routes/         # API route definitions
│   │   ├── services/       # Business logic
│   │   └── middleware/     # Express middleware
│   └── config/             # Configuration files
└── lib/                    # Aspose.Slides library
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email

# OpenAI Configuration (optional)
OPENAI_API_KEY=your-openai-api-key

# Aspose.Slides Cloud (optional)
ASPOSE_CLIENT_ID=your-aspose-client-id
ASPOSE_CLIENT_SECRET=your-aspose-client-secret

# Server Configuration
PORT=3000
NODE_ENV=development
```

## 📋 API Endpoints

### Core Endpoints

- `GET /api/v1/health` - Server health check
- `POST /api/v1/ai/generate-presentation` - Generate presentation with AI
- `POST /api/v1/convert/upload` - Upload & convert PPTX files
- `GET /api/v1/presentations` - List all presentations
- `POST /api/v1/presentations/{id}/generate-thumbnails` - Generate thumbnails
- `GET /api/v1/docs` - Interactive API documentation

### File Upload

```bash
curl -X POST http://localhost:3000/api/v1/convert/upload \
  -F "file=@presentation.pptx" \
  -F "generateThumbnails=true" \
  -F "validateSchema=true"
```

### AI Generation

```bash
curl -X POST http://localhost:3000/api/v1/ai/generate-presentation \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Create a presentation about renewable energy",
    "slides": 8,
    "style": "professional"
  }'
```

## 🎯 Usage

### Upload and Convert PPTX

1. Open the web interface at `http://localhost:5173`
2. Click "Upload PPTX" in the bottom left
3. Select your PowerPoint file
4. The system will automatically:
   - Convert to Universal JSON
   - Generate thumbnails
   - Save to Firebase
   - Enable chat modifications

### AI-Powered Generation

1. Use the chat interface to describe your presentation needs
2. Luna will generate a structured presentation using GPT-4
3. Preview the generated slides and thumbnails
4. Make modifications through the chat interface

### Session Management

- All presentations are linked to chat sessions
- Version control with v1, v2, v3 tracking
- Diff and revert capabilities
- Branch creation from any version

## 🔥 Features in Detail

### Universal JSON Schema

Luna converts PowerPoint files to a standardized JSON format that includes:

- Slide content and structure
- Text formatting and styles
- Images and media assets
- Animations and transitions
- Master slides and layouts
- Theme and color schemes

### AI Integration

- **Real OpenAI GPT-4**: No mock data, actual AI generation
- **Multiple styles**: Professional, creative, minimal, corporate
- **Content enhancement**: Improve, expand, simplify existing content
- **Token usage tracking**: Monitor API usage and costs

### Firebase Integration

- **Real-time sync**: All data stored in Firestore
- **Session persistence**: Resume work across sessions
- **User management**: Multi-user support with permissions
- **Backup and recovery**: Automatic data backup

## 🛠️ Development

### Running in Development Mode

```bash
# Start backend only
cd server
npm run dev

# Start frontend only
cd client
npm run dev

# Start both (recommended)
./run.sh
```

### Building for Production

```bash
# Build backend
cd server
npm run build

# Build frontend
cd client
npm run build
```

### Testing

```bash
# Run backend tests
cd server
npm test

# Run frontend tests
cd client
npm test
```

## 📊 Architecture

Luna follows Clean Architecture principles:

- **Controllers**: Handle HTTP requests/responses
- **Services**: Business logic and data processing
- **Adapters**: External service integrations
- **Repositories**: Data access layer
- **Entities**: Core business objects

### Design System

- **shadcn/ui**: Consistent component library
- **Tailwind CSS**: Utility-first styling
- **Responsive design**: Mobile-first approach
- **Accessibility**: WCAG 2.1 compliant

## 🔒 Security

- **CORS**: Properly configured for cross-origin requests
- **Input validation**: Zod schema validation
- **File upload**: Secure file handling with size limits
- **Environment variables**: Sensitive data protection

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Aspose.Slides](https://products.aspose.com/slides/) for PowerPoint processing
- [OpenAI](https://openai.com/) for AI capabilities
- [Firebase](https://firebase.google.com/) for backend services
- [shadcn/ui](https://ui.shadcn.com/) for the design system

## 📞 Support

For support, email support@luna-project.com or join our Discord community.

---

Made with ❤️ by the Luna Team
