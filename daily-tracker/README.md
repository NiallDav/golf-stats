# Daily Tracker

A local Windows desktop app for weights, creatine, food, and body weight. Its data stays in `%USERPROFILE%\Daily Tracker\data.json` and is not committed to GitHub.

## One-time setup

1. Install Python 3 if it is not already installed.
2. Extract the one-time setup ZIP, then run `install_daily_tracker.bat`.
3. Use the new **Daily Tracker** desktop shortcut from then on.

The installer copies the app to `%LOCALAPPDATA%\DailyTrackerApp`. Each launch downloads the latest app file from the `daily-tracker-app` branch, then opens it. If you are offline, it opens the existing copy. Close and reopen the app to see new versions. No Git or GitHub login is required.

No web hosting or online data account is needed. The code is in a separate branch of the public golf-stats repository; its GitHub Pages site and main branch are unaffected.
