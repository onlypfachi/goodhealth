@echo off
echo ========================================
echo  SAFE SERVER RESTART
echo ========================================
echo.

echo Stopping server on port 5000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000 ^| findstr LISTENING') do (
    taskkill /F /PID %%a 2>nul
    echo   - Killed process %%a
)

timeout /t 1 /nobreak >nul

echo.
echo Starting server...
cd /d "%~dp0\.."
call npm run dev
