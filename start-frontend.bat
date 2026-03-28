@echo off
cd /d "%~dp0frontend"
echo Installing Node dependencies...
npm install
echo Starting React dev server on http://localhost:5173
npm run dev
