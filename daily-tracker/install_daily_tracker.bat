@echo off
setlocal
set "APP_DIR=%LOCALAPPDATA%\DailyTrackerApp"
where py >nul 2>nul
if errorlevel 1 (
    where python >nul 2>nul
    if errorlevel 1 (
        echo Python 3 is required. Install it from python.org and run this again.
        pause
        exit /b 1
    )
)
if not exist "%~dp0daily_tracker.py" (
    echo Please extract all files from the ZIP before running this installer.
    pause
    exit /b 1
)
if not exist "%~dp0run_daily_tracker.bat" (
    echo Please extract all files from the ZIP before running this installer.
    pause
    exit /b 1
)
if not exist "%APP_DIR%" mkdir "%APP_DIR%"
copy /Y "%~dp0daily_tracker.py" "%APP_DIR%\daily_tracker.py" >nul
copy /Y "%~dp0run_daily_tracker.bat" "%APP_DIR%\run_daily_tracker.bat" >nul
if not exist "%APP_DIR%\daily_tracker.py" (
    echo Please extract all files from the ZIP before running this installer.
    pause
    exit /b 1
)
powershell -NoProfile -Command "$s=(New-Object -ComObject WScript.Shell).CreateShortcut([Environment]::GetFolderPath('Desktop')+'\Daily Tracker.lnk');$s.TargetPath=$env:APP_DIR+'\run_daily_tracker.bat';$s.WorkingDirectory=$env:APP_DIR;$s.Save()"
echo Daily Tracker is installed. Open it from your desktop next time.
call "%APP_DIR%\run_daily_tracker.bat"
