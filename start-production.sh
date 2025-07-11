#!/bin/bash

# Start production services for Luna Platform

set -e

echo "🚀 Starting Luna Production Server..."

# Start nginx in background
echo "🌐 Starting Nginx..."
nginx -g "daemon off;" &

# Wait a moment for nginx to start
sleep 2

# Start Node.js server
echo "⚙️ Starting Node.js API Server..."
cd /app
exec node server/dist/index.js 