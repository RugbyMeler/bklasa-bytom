@echo off
set "PATH=C:\Program Files\nodejs;C:\Users\Meler\AppData\Roaming\npm;%PATH%"
cd /d "C:\Projects\bytom-football\frontend"
"C:\Program Files\nodejs\npm.cmd" run dev -- --port 5173 --strictPort
