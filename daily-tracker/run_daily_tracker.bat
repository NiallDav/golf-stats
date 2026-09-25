@echo off
setlocal
cd /d "%~dp0"
where git >nul 2>nul
if %errorlevel%==0 (
    git rev-parse --is-inside-work-tree >nul 2>nul
    if %errorlevel%==0 (
        echo Checking for app updates...
        git pull --ff-only
        if errorlevel 1 echo Update unavailable. Opening the installed version.
    )
)
where py >nul 2>nul
if %errorlevel%==0 (
    py -3 daily_tracker.py
) else (
    python daily_tracker.py
)
if errorlevel 1 (
    echo.
    echo Python could not start the app. Install Python from python.org and enable PATH.
    pause
)
