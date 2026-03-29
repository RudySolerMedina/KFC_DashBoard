@echo off
REM KFC Dashboard - Start Script for Windows
REM Este script levanta el dashboard en producción con pm2

echo.
echo ========================================
echo 🚀 Starting KFC Dashboard
echo ========================================
echo.

REM 1. Build Frontend first (es más rápido)
echo 🎨 Building frontend...
cd frontend
if not exist "node_modules" (
    echo Installing frontend dependencies...
    call npm install
)
call npm run build
if %errorlevel% neq 0 (
    echo ❌ Frontend build failed!
    exit /b 1
)
echo ✅ Frontend built successfully
cd ..

REM 2. Install Python dependencies
echo.
echo 📦 Setting up backend...
cd backend
if not exist "requirements.txt" (
    echo ❌ requirements.txt not found!
    exit /b 1
)
echo Installing Python dependencies...
python -m pip install -q -r requirements.txt
if %errorlevel% neq 0 (
    echo ❌ Backend dependencies failed!
    exit /b 1
)
echo ✅ Backend dependencies installed
cd ..

REM 3. Start with pm2
echo.
echo 🚀 Starting processes with pm2...
echo.

REM Check if pm2 is available
where pm2 >nul 2>nul
if %errorlevel% neq 0 (
    echo ⚠️  pm2 not found globally, installing locally...
    call npm install pm2 --save
)

REM Start backend
echo Starting backend on port 8080...
call npx pm2 start "python -m uvicorn main:app --host 0.0.0.0 --port 8080" --name "kfc-backend" --interpreter python --cwd backend

REM Start frontend (serve dist folder on port 3000)
echo Starting frontend on port 3000...
call npx pm2 serve frontend\dist 3000 --name "kfc-frontend" --spa

echo.
echo ========================================
echo ✅ Services started!
echo ========================================
echo.
echo 📊 Access:
echo    Frontend:  http://localhost:3000
echo    Backend:   http://localhost:8080/api/metrics
echo.
echo 🔍 View logs:
echo    npx pm2 logs
echo.
echo ⏹️  Stop all:
echo    npx pm2 stop all
echo.
echo 🔄 Restart all:
echo    npx pm2 restart all
echo.
echo 📋 Status:
echo    npx pm2 status
echo.
