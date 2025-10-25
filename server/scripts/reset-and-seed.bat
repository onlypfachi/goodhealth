@echo off
echo ========================================
echo  HOSPITAL DATABASE RESET AND SEED
echo ========================================
echo.

echo [1/4] Stopping server on port 5000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000 ^| findstr LISTENING') do (
    taskkill /F /PID %%a 2>nul
    echo   - Killed process %%a
)
timeout /t 2 /nobreak >nul

echo.
echo [2/4] Resetting database...
cd /d "%~dp0\.."
call npm run reset

echo.
echo [3/4] Seeding test data...
node seed-test-data.js

echo.
echo [4/4] Starting server...
start "Hospital Server" cmd /c "npm run dev"

echo.
echo ========================================
echo  COMPLETE!
echo ========================================
pause
