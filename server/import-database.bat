@echo off
echo ====================================
echo Good Health Hospital Database Setup
echo ====================================
echo.

REM Try different common MySQL installation paths
set MYSQL_PATH1=C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe
set MYSQL_PATH2=C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe
set MYSQL_PATH3=C:\Program Files\MySQL\MySQL Server 5.7\bin\mysql.exe
set MYSQL_PATH4=C:\MySQL\bin\mysql.exe

set MYSQL_EXE=

if exist "%MYSQL_PATH1%" set MYSQL_EXE=%MYSQL_PATH1%
if exist "%MYSQL_PATH2%" set MYSQL_EXE=%MYSQL_PATH2%
if exist "%MYSQL_PATH3%" set MYSQL_EXE=%MYSQL_PATH3%
if exist "%MYSQL_PATH4%" set MYSQL_EXE=%MYSQL_PATH4%

if "%MYSQL_EXE%"=="" (
    echo ERROR: MySQL not found!
    echo.
    echo Please manually enter your MySQL bin folder path:
    echo Example: C:\Program Files\MySQL\MySQL Server 8.0\bin
    echo.
    set /p MYSQL_BIN="Enter MySQL bin path: "
    set MYSQL_EXE="%MYSQL_BIN%\mysql.exe"
)

echo Found MySQL at: %MYSQL_EXE%
echo.
echo Importing database schema...
echo.

"%MYSQL_EXE%" -u root -p < "%~dp0database\schema.sql"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ====================================
    echo SUCCESS! Database imported!
    echo ====================================
    echo.
    echo Database: good_health_hospital
    echo.
    echo Now you can start your server with:
    echo npm start
    echo.
) else (
    echo.
    echo ====================================
    echo ERROR: Import failed!
    echo ====================================
    echo.
    echo Please check:
    echo 1. MySQL is running
    echo 2. Password is correct
    echo 3. MySQL path is correct
    echo.
)

pause
