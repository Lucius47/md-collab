@echo off
title Local Dev Launcher

echo [1/5] Checking Docker Engine...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo Docker is not running. Starting Docker Desktop...
    start "" "C:\Users\desktop\AppData\Local\Programs\DockerDesktop\Docker Desktop.exe"
    echo Waiting for Docker Engine to ready up...
    :wait_for_docker
    timeout /t 3 /nobreak >nul
    docker info >nul 2>&1
    if %errorlevel% neq 0 goto wait_for_docker
    echo Docker Engine is ready!
) else (
    echo Docker Engine is already running.
)

echo [2/5] Starting Docker containers in backend folder...
pushd backend
docker compose up -d
popd

echo [3/5] Launching Backend...
start "Backend (Port 4000)" cmd /k "cd backend && npm run dev"

echo [4/5] Launching Frontend...
start "Frontend (Port 5173)" cmd /k "cd frontend && npm run dev"

echo [5/5] Opening app in default browser...
timeout /t 4 /nobreak >nul
start http://localhost:5173

echo.
echo Development environment is running!