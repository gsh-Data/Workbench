@echo off
cd /d "%~dp0"

echo [Workspace] Starting Backend API...
start "Workspace_Backend" /MIN cmd /c "cd backend && node server.js"

echo [Workspace] Waiting for backend to start...
timeout /t 2 /nobreak > nul

echo [Workspace] Starting Frontend Dev Server...
start "Workspace_Frontend" /MIN cmd /c "cd frontend && npm run dev"

echo [Workspace] Waiting for frontend to start...
timeout /t 3 /nobreak > nul

echo [Workspace] Opening App Window...
start msedge --app=http://localhost:5173

exit
