@echo off
title FLASHKART - Billing System Launcher
color 0A

echo.
echo  =========================================
echo   FLASHKART - Fruits and Vegetables POS
echo  =========================================
echo.

echo [1/2] Starting Backend API Server (port 5000)...
start "FLASHKART Backend" cmd /k "cd /d "%~dp0backend" && "%~dp0node-v22.12.0-win-x64\node.exe" src/index.js"

timeout /t 3 /nobreak >nul

echo [2/2] Starting Frontend Dev Server (port 3000)...
start "FLASHKART Frontend" cmd /k "cd /d "%~dp0frontend" && "%~dp0node-v22.12.0-win-x64\node.exe" "%~dp0node-v22.12.0-win-x64\node_modules\npm\bin\npm-cli.js" run dev"

timeout /t 4 /nobreak >nul

echo.
echo  Opening FLASHKART in your browser...
start http://localhost:3000

echo.
echo  FLASHKART is running!
echo  - App:     http://localhost:3000
echo  - API:     http://localhost:5000
echo  - Login:   admin / admin123
echo.
echo  Close this window after both servers have started.
pause
