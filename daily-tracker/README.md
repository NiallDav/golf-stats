# Daily Tracker

A local Windows desktop app for weights, creatine, food, and body weight. Its data stays in `%USERPROFILE%\Daily Tracker\data.json` and is not committed to GitHub.

## One-time setup

1. Install Python 3 and Git for Windows if they are not already installed.
2. Run `install_daily_tracker.bat` from the one-time setup download.
3. Use the new **Daily Tracker** desktop shortcut from then on.

The installer clones the `daily-tracker-app` branch into `%LOCALAPPDATA%\DailyTrackerApp`. Each launch checks for updates with `git pull --ff-only`, then opens the app. If you are offline, it opens the existing copy. Close and reopen the app to see new versions.

No web hosting or online data account is needed. The code is in a separate branch of the public golf-stats repository; its GitHub Pages site and main branch are unaffected.
