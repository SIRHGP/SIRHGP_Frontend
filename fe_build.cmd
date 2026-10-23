@echo off
cd /d "C:\Users\Developpeur\Documents\abdelrazak\perso\sirhgp\SIRHGP_Frontend"
echo ==== VITE BUILD ==== > fe_build.log
call npx vite build >> fe_build.log 2>&1
echo ==== EXIT=%ERRORLEVEL% ==== >> fe_build.log
echo DONE >> fe_build.log
