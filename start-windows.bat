@echo off
title Kruti Electronics TV Repair System
echo ========================================================
echo   Starting Kruti Electronics TV Repair Management System
echo ========================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed on your system!
    echo Please download and install Node.js from https://nodejs.org
    echo Then run this file again.
    pause
    exit /b 1
)

if not exist node_modules (
    echo [INFO] Installing required dependencies... Please wait.
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] npm install failed. Please check your internet connection.
        pause
        exit /b 1
    )
)

echo.
echo [INFO] Starting Kruti Electronics Server at http://localhost:3000 ...
echo [INFO] Press Ctrl+C in this window anytime to stop the server.
echo.
call npm run dev
pause
