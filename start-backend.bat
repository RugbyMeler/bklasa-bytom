@echo off
cd /d "%~dp0backend"
echo Installing Python dependencies...
pip install -r requirements.txt
echo Starting FastAPI backend on http://localhost:8000
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
