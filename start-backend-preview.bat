@echo off
set "PATH=C:\Users\Meler\AppData\Local\Programs\Python\Python312;C:\Users\Meler\AppData\Local\Programs\Python\Python312\Scripts;%PATH%"
cd /d "C:\Projects\bytom-football\backend"
"C:\Users\Meler\AppData\Local\Programs\Python\Python312\python.exe" -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
