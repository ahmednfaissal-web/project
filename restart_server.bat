@echo off
echo Stopping any running Python servers...
taskkill /F /IM python.exe 2>nul
timeout /t 2 /nobreak >nul

echo Clearing Python cache...
if exist __pycache__ rmdir /s /q __pycache__
if exist server.pyc del /f /q server.pyc

echo Starting server...
python server.py
