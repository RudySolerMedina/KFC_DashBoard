#!/bin/bash
# KFC Dashboard - Start Script
# Este script levanta el dashboard en producción con pm2

set -e

echo "🚀 Starting KFC Dashboard..."

# 1. Backend
echo "📦 Starting backend..."
cd backend
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi
source venv/bin/activate
pip install --quiet -r requirements.txt
pm2 start "python -m uvicorn main:app --host 0.0.0.0 --port 8080" --name "kfc-backend" --interpreter python

# 2. Frontend (build first)
echo "🎨 Building frontend..."
cd ../frontend
npm install --silent
npm run build --silent
pm2 serve dist 3000 --name "kfc-frontend" --spa

echo "✅ Services started!"
echo ""
echo "📊 Check services:"
echo "  Frontend:  http://localhost:3000"
echo "  Backend:   http://localhost:8080/api/metrics"
echo ""
echo "🔍 View logs:"
echo "  pm2 logs"
echo ""
echo "⏹️  Stop all:"
echo "  pm2 stop all"
