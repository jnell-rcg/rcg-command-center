@echo off
title RCG Ops Tower - Deploy to Vercel
echo.
echo  ██████╗  ██████╗ ██████╗     ██████╗ ██████╗ ███████╗
echo  ██╔══██╗██╔════╝██╔════╝    ██╔═══██╗██╔══██╗██╔════╝
echo  ██████╔╝██║     ██║  ███╗   ██║   ██║██████╔╝███████╗
echo  ██╔══██╗██║     ██║   ██║   ██║   ██║██╔═══╝ ╚════██║
echo  ██║  ██║╚██████╗╚██████╔╝   ╚██████╔╝██║     ███████║
echo  ╚═╝  ╚═╝ ╚═════╝ ╚═════╝     ╚═════╝ ╚═╝     ╚══════╝
echo.
echo  Deploying Ops Tower to Vercel...
echo  A browser window will open asking you to log in with GitHub.
echo  Just click Authorize and come back to this window.
echo.
cd /d "C:\Users\jridg\OneDrive\Desktop\Claude\rcg-command-center"
npx vercel --yes 2>&1
echo.
echo  Done! Your permanent URL is shown above.
echo  Bookmark it - it will work from anywhere, even your phone.
echo.
pause
