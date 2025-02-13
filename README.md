# Composer Web Extension

A powerful Cursor extension that captures live browser content and logs directly into Composer. Perfect for debugging, documentation, and sharing web content with context.

## Features

- 📸 **Full Page Screenshots**: Captures the entire scrollable page, not just the viewport
- 📊 **Continuous Monitoring**:
  - Real-time console logs (log, warn, error, etc.)
  - Network requests with status codes
  - Failed network requests with error messages
- 🔄 **Smart Capture**: One shortcut to connect and capture
- 🎯 **Multi-tab Support**: Select from any open tab in your debugging browser
- 📝 **Formatted Output**: Clean, readable logs with proper categorization
- ⚡ **Fast Performance**: Parallel operations and optimized capturing
- 🎨 **Full Rendering**: Ensures all content is properly loaded before capture

## Quick Start

1. Install the extension in Cursor
2. Launch Chrome with debugging enabled (see setup below)
3. Press `Cmd + ;` (Mac) or `Ctrl + ;` (Windows/Linux)
4. Select the tab you want to monitor
5. Use the same shortcut to capture the current state anytime!

## How It Works

1. **Connect to a Tab**:

   - Click "Connect Browser Tab" in the status bar or use the keyboard shortcut
   - Select your target tab from the list
   - The extension starts monitoring console logs and network requests

2. **Monitor Activity**:

   - The status bar shows which tab is being monitored
   - All console logs and network requests are collected in real-time
   - Logs persist until you close VSCode or disconnect

3. **Capture State**:
   - Press the keyboard shortcut again or click "Capture Tab Info" in the status bar
   - The extension captures:
     - A full-page screenshot
     - All console logs since connection
     - All network requests since connection
   - Everything is sent directly to Composer

## Setup Instructions

### Enable Remote Debugging in Chrome

Choose the method for your OS:

#### macOS

```bash
# Method 1 (Recommended):
open -n -a "Google Chrome" --args --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug-profile

# Method 2 (Alternative):
/Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug-profile
```

#### Windows

```bash
"C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir=%TEMP%\chrome-debug-profile
```

#### Linux

```bash
google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug-profile
```

## Usage Tips

### Keyboard Shortcuts

- Mac: `⌘ ;` (Command + Semicolon)
  - First press: Connect to a tab if not connected
  - Subsequent presses: Capture current state
- Windows/Linux: `Ctrl ;` (Control + Semicolon)

### Best Practices

1. **Before Connecting**:

   - Start Chrome with debugging enabled
   - Open the pages you want to monitor
   - Make sure DevTools isn't blocking console output

2. **While Monitoring**:

   - Keep an eye on the status bar to see which tab is connected
   - Use the browser normally - all logs are captured automatically
   - If the tab crashes or closes, just reconnect

3. **For Best Results**:
   - Use a fresh Chrome profile (the debug profile is perfect)
   - Clear browser cache if you're not seeing latest changes
   - Wait for all animations to complete before capturing

### Log Format

The extension captures and formats logs in a clean, readable structure:

```
---Console Logs---
log: Regular console.log messages
warn: Warning messages
error: Error messages

---Network Requests---
200: https://api.example.com/success
404: https://api.example.com/not-found
Failed: https://api.example.com/error (Network error details)
```

## Troubleshooting

### Common Issues

1. **"Cannot connect to Chrome debugging port"**

   - Ensure Chrome is running with the debugging flag
   - Check if the port (9222) is not in use
   - Try closing all Chrome instances and starting fresh

2. **"No open pages found"**

   - Open at least one tab in the debugging Chrome instance
   - Refresh the page if it's stuck
   - Check if you're using the correct Chrome window

3. **"Screenshot is incomplete"**

   - Wait for all content to load before capturing
   - Check if there are any loading indicators
   - Try scrolling through the page once

4. **"Tab was closed or crashed"**
   - The monitored tab was closed or crashed
   - Just reconnect to the tab to continue monitoring

### Still Having Issues?

1. Check Chrome's remote debugging is working:
   - Open `http://localhost:9222/json/version` in your browser
   - Should see Chrome's debugging information
2. Verify extension settings in Cursor
3. Try using a fresh Chrome profile
4. Check for any browser console errors

## Requirements

- Cursor (latest version)
- Google Chrome/Chromium
- Node.js and npm (for development)

## Extension Development

### Project Structure

The codebase is organized into modular components:

```
src/
├── browser/        # Browser monitoring functionality
│   └── monitor.ts  # Handles browser tab monitoring and screenshots
├── composer/       # Composer integration
│   └── integration.ts  # Manages interaction with Cursor's Composer
├── config/         # Configuration management
│   └── index.ts    # Handles extension settings
├── types/          # TypeScript type definitions
│   └── index.ts    # Shared interfaces and types
├── utils/          # Utility functions
│   └── clipboard.ts # Cross-platform clipboard operations
└── extension.ts    # Main extension entry point
```

Each module has a specific responsibility:

- **Browser Monitor**: Manages Chrome debugging connections, page monitoring, and screenshot capture
- **Composer Integration**: Handles sending captured data to Cursor's Composer
- **Config Manager**: Centralizes extension configuration management
- **Types**: Defines shared TypeScript interfaces for type safety
- **Utils**: Contains reusable utility functions

### Building from Source

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the extension:
   ```bash
   npm run compile   # For production build
   # or
   npm run watch     # For development with auto-reload
   ```
4. Press F5 in Cursor to start debugging

### Development Workflow

1. **Setup**:

   - Install recommended extensions in Cursor
   - Use `npm run watch` for live compilation
   - Enable Chrome debugging (see Setup Instructions)

2. **Testing**:

   - Run `npm run check-types` to verify types
   - Run `npm run lint` to check code style
   - Use F5 to launch extension in debug mode

3. **Building**:
   - Run `npm run package` for production build
   - Output will be in `dist/` directory

### Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Submit a pull request

## License

MIT - See LICENSE file for details
