# System Monitor — desktop app (Electron)

Wraps the backend (`../backend`) and the static dashboard (`../frontend`) into one installable
app for macOS, Windows and Linux.

```bash
cd system-monitor/desktop
npm install
npm start            # builds the frontend, then opens the app
npm run dist         # installers for the current OS -> release/
```

`npm run dist:mac`, `dist:win`, `dist:linux` build one OS. Cross-building isn't reliable
(especially macOS), so `.github/workflows/release.yml` builds each OS on its own runner.

What happens at runtime:
- The main process starts the monitoring service on `127.0.0.1` (random free port, local only)
  and loads the dashboard from it.
- Closing the window keeps the app in the tray / menu bar so alerts and history keep running.
  Use **Quit** in the tray menu to stop it.
- Data (settings, history, licence) lives in the OS app-data folder:
  macOS `~/Library/Application Support/System Monitor`, Windows `%APPDATA%\System Monitor`,
  Linux `~/.config/System Monitor`.

## Code signing (do this before selling)
Unsigned apps scare buyers:
- **macOS:** unsigned apps downloaded from the web are blocked by Gatekeeper ("can't be opened" or
  "is damaged"). You need an Apple Developer ID ($99/year), then set `CSC_LINK`, `CSC_KEY_PASSWORD`,
  `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD` and `APPLE_TEAM_ID` and add `"notarize": true` under `build.mac`.
- **Windows:** unsigned installers show a SmartScreen warning ("Windows protected your PC").
  An OV/EV code-signing certificate removes it. You can launch without one, but expect some buyers to hesitate.
- **Linux:** no signing needed.
