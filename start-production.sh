#!/bin/bash

# Start production services for Luna Platform

set -e

echo "🚀 Starting Luna Production Server..."

# Ensure we're in the right directory
cd /app

# Test nginx configuration first
echo "🔧 Testing Nginx configuration..."
nginx -t

# Start nginx in background
echo "🌐 Starting Nginx..."
nginx -g "daemon off;" &

# Wait a moment for nginx to start
sleep 3

# Start Node.js server in server directory
echo "⚙️ Starting Node.js API Server..."
cd /app/server
exec node dist/index.js 