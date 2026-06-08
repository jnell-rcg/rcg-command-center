@echo off
title RCG Ops Tower
color 0A
echo.
echo  =======================================
echo   RCG Ops Tower — Starting up...
echo  =======================================
echo.
echo  Step 1/2: Checking dependencies...
cd /d "C:\Projects\rcg-command-center"
call npm install --silent
if %errorlevel% neq 0 (
  echo  ERROR: npm install failed. Check your internet connection.
  pause
  exit /b 1
)
echo  Dependencies OK.
echo.
echo  Step 2/2: Starting server on port 3001...
echo  Opening http://localhost:3001 in a few seconds...
echo.
start "" "http://localhost:3001"
npm run dev -- -p 3001
