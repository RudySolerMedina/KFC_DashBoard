#!/bin/bash
# KFC Dashboard - Start Script (Node.js stack)

set -e

echo "Starting KFC Dashboard (Node)"

# 1) Frontend deps
cd frontend
if [ ! -d "node_modules" ]; then
  npm install
fi
cd ..

# 2) Backend deps
cd backend
if [ ! -d "node_modules" ]; then
  npm install
fi
cd ..

# 3) Start both (frontend + backend)
npm run dev
