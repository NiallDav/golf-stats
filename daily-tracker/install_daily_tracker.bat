@echo off
setlocal
set "APP_DIR=%LOCALAPPDATA%\DailyTrackerApp"
where git >nul 2>nul
if errorlevel 1 (
    echo Git for Windows is required. Install it from git-scm.com and run this again.
    pause
    exit /b 1
)
where py >nul 2>nul
if errorlevel 1 (
    where python >nul 2>nul
    if errorlevel 1 (
        echo Python 3 is required. Install it from python.org and run this again.
        pause
        exit /b 1
    )
)
if not exist "%APP_DIR%\.git" (
    git clone --branch daily-tracker-app --single-branch "https://github.com/NiallDav/golf-stats.git" "%APP_DIR%"
    if errorlevel 1 (
        echo Could not download the app. Check your internet connection.
        pause
        exit /b 1
    )
)
powershell -NoProfile -Command "$s=(New-Object -ComObject WScript.Shell).CreateShortcut([Environment]::GetFolderPath('Desktop')+'\Daily Tracker.lnk');$s.TargetPath=$env:APP_DIR+'\daily-tracker\run_daily_tracker.bat';$s.WorkingDirectory=$env:APP_DIR+'\daily-tracker';$s.Save()"
echo Daily Tracker is installed. Open it from your desktop next time.
call "%APP_DIR%\daily-tracker\run_daily_tracker.bat"
