@echo off
echo ========================================
echo  STARTING ADMIN DASHBOARD
echo ========================================
echo.

echo [1/2] Starting Backend Server...
start "Hospital Backend" cmd /c "cd /d \"%~dp0server\" && npm run dev"
timeout /t 3 /nobreak >nul

echo [2/2] Starting Admin Dashboard...
start "Admin Dashboard" cmd /c "cd /d \"%~dp0admin dashboard\" && npm run dev"

echo.
echo ========================================
echo  BOTH SERVICES STARTING...
echo ========================================
echo.
echo Backend: http://localhost:5000
echo Admin Dashboard: Check the terminal window
echo.
echo Login Credentials:
echo   Email: admin@gmail.com
echo   Password: admin123
echo   Staff ID: EMP0001
echo.
pause
