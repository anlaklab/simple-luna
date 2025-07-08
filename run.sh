#!/bin/bash

echo "🚀 Luna Project - Complete Setup"
echo "================================"

# Configure Node.js
echo "🔧 Setting up Node.js..."
if command -v node &> /dev/null; then
    echo "✅ Using Node.js $(node --version)"
else
    echo "❌ Node.js not found. Please install Node.js first."
    exit 1
fi

# Kill all existing processes
echo "🛑 Stopping all existing processes..."
pkill -f "simple-server" 2>/dev/null
pkill -f "index.js" 2>/dev/null
pkill -f "tsx" 2>/dev/null
pkill -f "vite" 2>/dev/null
pkill -f "node.*3000" 2>/dev/null
pkill -f "node.*5173" 2>/dev/null
sleep 3

# Clear ports
echo "🧹 Clearing ports..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || echo "Port 3000 was free"
lsof -ti:5173 | xargs kill -9 2>/dev/null || echo "Port 5173 was free"
lsof -ti:5174 | xargs kill -9 2>/dev/null || echo "Port 5174 was free"
sleep 2

# Start Luna Complete Server (Full API with conversion endpoints)
echo "🔧 Starting Luna Complete Server..."
cd server
node index.js &
SERVER_PID=$!

# Wait for server
echo "⏳ Waiting for server startup..."
for i in {1..15}; do
    sleep 1
    echo -n "."
    if curl -s http://localhost:3000/api/v1/health >/dev/null 2>&1; then
        echo ""
        echo "✅ Server started successfully!"
        break
    fi
    if [ $i -eq 15 ]; then
        echo ""
        echo "❌ Server failed to start"
        kill $SERVER_PID 2>/dev/null
        exit 1
    fi
done

# Start React Frontend
echo "🎨 Starting React Frontend..."
cd "../client"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing client dependencies..."
    npm install
fi

# Start the React client
npm run dev &
CLIENT_PID=$!

echo ""
echo "🎉 Luna Project - Ready!"
echo "======================="
echo "🔧 Backend Server:  http://localhost:3000"
echo "🔥 Firebase:        Connected (Real data)"
echo "🤖 AI Generation:   http://localhost:3000/api/v1/ai/generate-presentation"
echo "📊 Health Check:    http://localhost:3000/api/v1/health"
echo "🔄 File Upload:     http://localhost:3000/api/v1/convert/upload"
echo "🖼️ Thumbnails:      http://localhost:3000/api/v1/presentations/{id}/generate-thumbnails"
echo "🎨 Frontend:        http://localhost:5173 or http://localhost:5174"
echo ""
echo "✨ Available Features:"
echo "   • Chat with Luna AI for presentation generation"
echo "   • Upload PPTX files with automatic conversion"
echo "   • Real Firebase data integration"
echo "   • Automatic thumbnail generation"
echo "   • Universal JSON schema validation"
echo "   • Session-based versioning system"
echo "   • Modern React frontend with shadcn/ui"
echo ""
echo "🌐 Try accessing via:"
echo "   • http://localhost:5173 (or 5174 if 5173 is busy)"
echo "   • http://127.0.0.1:5173"
echo "   • Local network IP on port 5173/5174"
echo ""
echo "📋 API Endpoints:"
echo "   • GET  /api/v1/health - Server health check"
echo "   • POST /api/v1/ai/generate-presentation - Generate with AI"
echo "   • POST /api/v1/convert/upload - Upload & convert PPTX"
echo "   • GET  /api/v1/presentations - List presentations"
echo "   • POST /api/v1/presentations/{id}/generate-thumbnails - Generate thumbnails"
echo "   • GET  /api/v1/docs - Interactive API documentation"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for interrupt
trap 'echo ""; echo "🛑 Stopping services..."; kill $SERVER_PID $CLIENT_PID 2>/dev/null; exit 0' INT
wait 