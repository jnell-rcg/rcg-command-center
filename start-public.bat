@echo off
title RCG Finance Agent — Public

echo.
echo  ========================================
echo   RCG Finance Agent — Starting up...
echo  ========================================
echo.

:: Start Next.js in a separate window
start "RCG Next.js Server" cmd /k "cd /d C:\Projects\rcg-command-center && npm run dev -- -p 3001"

:: Give Next.js a few seconds to boot
timeout /t 5 /nobreak >nul

echo  Next.js server started on localhost:3001
echo.
echo  Starting Cloudflare tunnel...
echo  Your public URL will appear below in a moment.
echo  Share the /finance URL with Rick and Brandon.
echo.
echo  Example: https://xxxx-xxxx.trycloudflare.com/finance
echo.
echo  Keep this window open while they need access.
echo  Press Ctrl+C to shut everything down.
echo.

npx cloudflared tunnel --url http://localhost:3001
