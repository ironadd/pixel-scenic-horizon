@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ==================================================
echo   正在展开「山海晴岚 · 像素风景线」...
echo ==================================================
start "" "http://localhost:5180"
npx vite --port 5180 --host
pause
