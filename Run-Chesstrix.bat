@echo off
setlocal
title Chesstrix Build and Run

cd /d "%~dp0"

echo.
echo ========================================
echo   CHESSTRIX - Build and Run
echo ========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Please install Node.js first.
  echo.
  pause
  exit /b 1
)

where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo npm was not found. Please reinstall Node.js with npm enabled.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Installing dependencies...
  call npm.cmd install
  if errorlevel 1 (
    echo.
    echo Dependency installation failed.
    pause
    exit /b 1
  )
)

echo Building Chesstrix...
call npm.cmd run build
if errorlevel 1 (
  echo.
  echo Build failed. Check the error above.
  pause
  exit /b 1
)

echo.
echo Starting Chesstrix...
node scripts\run-electron.js .
if errorlevel 1 (
  echo.
  echo Chesstrix closed with an error.
  pause
  exit /b 1
)

endlocal
