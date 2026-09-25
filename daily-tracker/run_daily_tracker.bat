@echo off
setlocal
cd /d "%~dp0"
echo Checking for app updates...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ProgressPreference='SilentlyContinue';$url='https://raw.githubusercontent.com/NiallDav/golf-stats/daily-tracker-app/daily-tracker/daily_tracker.py';$temp='daily_tracker.download';try {Invoke-WebRequest -Uri $url -OutFile $temp -TimeoutSec 12 -ErrorAction Stop;if ((Get-Item $temp).Length -lt 1000) {throw 'Incomplete download'};Move-Item -Force $temp 'daily_tracker.py'} catch {Remove-Item $temp -ErrorAction SilentlyContinue;Write-Host 'Offline or update unavailable. Opening the installed version.'}"
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
