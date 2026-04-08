@echo off
REM KFC Dashboard - Start Script for Windows (Node.js stack)

setlocal

echo.
echo ========================================
echo Starting KFC Dashboard (Node)
echo ========================================
echo.

REM 1) Frontend deps
cd frontend
if not exist "node_modules" (
    echo Installing frontend dependencies...
    call npm install
)
cd ..

REM 2) Backend deps
cd backend
if not exist "node_modules" (
    echo Installing backend dependencies...
    call npm install
)
cd ..

REM 3) Start both (frontend + backend)
call npm run dev
