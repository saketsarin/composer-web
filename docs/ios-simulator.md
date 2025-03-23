# iOS Simulator Integration

This feature allows you to capture logs and screenshots from iOS simulators directly into Composer.

## Prerequisites

- macOS with Xcode installed
- iOS simulators set up in Xcode
- At least one simulator must be booted/running

## Testing the Implementation

1. Build and run the extension in VSCode/Cursor
2. Start an iOS simulator from Xcode (the extension only shows booted simulators)
3. Use the command palette (`Cmd+Shift+P`) to run "Composer Web: Connect iOS Simulator"
4. If multiple simulators are running, select one from the list
   - If only one simulator is running, it will be selected automatically
5. The extension will scan for installed apps and show a list
   - Choose "All Apps" to monitor logs from all apps
   - Or select a specific app to focus only on its logs
6. Once connected, you can use the following commands:
   - "Composer Web: Send iOS Logs to Composer"
   - "Composer Web: Send iOS Screenshot to Composer"
   - "Composer Web: Capture iOS Simulator (Logs + Screenshot)"
   - "Composer Web: Clear iOS Simulator Logs"

## Keyboard Shortcuts

- Connect Simulator: `Cmd+I` (macOS) / `Ctrl+I` (Windows/Linux)
- Capture Simulator: `Cmd+Shift+I` (macOS) / `Ctrl+Shift+I` (Windows/Linux)

## Testing with the Script

You can run the provided test script to verify that your system can interact with iOS simulators:

```bash
# Build the extension first
npm run compile

# Run the test script
node out/test/ios-simulator-test.js YOUR_SIMULATOR_UDID
```

To get the UDID of your simulators, you can run:

```bash
xcrun simctl list devices
```

Or to see only booted simulators:

```bash
xcrun simctl list devices | grep Booted -B 1
```

## How It Works

The integration uses the `xcrun simctl` utility to:

1. List available booted simulators
2. Scan for installed apps using `xcrun simctl listapps UDID`
3. Filter out system apps to show only user-installed apps
4. Capture screenshots using `xcrun simctl io UDID screenshot PATH`
5. Stream app logs using `xcrun simctl spawn UDID log stream --level debug --style compact --predicate 'category == "App"'`

The captured data is then sent to Composer following the same mechanism as browser captures.

### App-Specific Logs vs. System Logs

When you connect to a simulator, the extension will show a list of installed apps:

- **Specific app**: Choose an app from the list to focus only on its logs
- **All Apps**: Select this option to monitor logs from all apps (filtered to reduce noise)
- **System logs**: These are no longer collected by default to avoid overwhelming the log system

This approach provides more focused logs that are relevant to your app development and testing, similar to what you would see in Xcode's console while debugging.

### Log Collection Limitations

Due to system limitations, the extension can only collect a limited number of logs to avoid the "E2BIG" (argument list too long) error. The current implementation:

- Limits the total number of stored logs to 1000 entries
- Only sends the most recent 200 logs to Composer when capturing
- Uses filtering to focus on app-specific logs rather than system logs

If you need more extensive logs, you can use the Terminal directly with:

```bash
# For a specific app's logs
xcrun simctl spawn SIMULATOR_UDID log stream --predicate 'process == "YOUR_APP_NAME"' > app_logs.txt

# For all app-related logs
xcrun simctl spawn SIMULATOR_UDID log stream --predicate 'category == "App"' > app_logs.txt
```

## Troubleshooting

### "Unable to find utility simctl" Error

If you encounter the error `xcrun: error: unable to find utility "simctl", not a developer tool or in PATH`, follow these steps:

1. **Install Xcode** - Make sure you have Xcode installed from the Mac App Store.

2. **Install Command Line Tools**:

   ```
   xcode-select --install
   ```

3. **Set Xcode Path** - If Xcode is already installed but the command line tools aren't properly linked:

   ```
   sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
   ```

4. **Accept License** (if needed):

   ```
   sudo xcodebuild -license accept
   ```

5. **Verify Installation** - After completing the steps above, verify that simctl is available:
   ```
   xcrun simctl list
   ```

### "No booted iOS simulators found" Error

If you see this error, it means no simulators are currently running. To fix this:

1. Open Xcode
2. Go to Xcode menu → Open Developer Tool → Simulator
3. Wait for the simulator to fully boot
4. Try connecting again from VSCode/Cursor

### "Failed to get installed apps from simulator" Error

If you see this error when trying to list apps:

1. **Check simulator status** - Make sure the simulator is fully booted
2. **Update Xcode** - Older Xcode versions might not support the `listapps` command
3. **Try rebooting the simulator** - Sometimes the app list can be corrupted
4. **Use the "All Apps" option** - This will monitor all app logs if specific app selection fails

### "Log collection stopped with code 1" Error

If you see "Log collection stopped with code 1" and "iOS simulator disconnected" messages:

1. **Check Command Syntax** - Make sure you're using the correct command syntax:

   ```
   xcrun simctl spawn SIMULATOR_UDID log stream --level debug
   ```

   NOT

   ```
   xcrun simctl log stream --level debug SIMULATOR_UDID
   ```

2. **Restart the Simulator** - Sometimes the log stream connection can be interrupted:

   ```
   xcrun simctl shutdown [SIMULATOR_UDID]
   xcrun simctl boot [SIMULATOR_UDID]
   ```

3. **Check Simulator Status** - Make sure the simulator is fully booted and not in a transitional state:

   ```
   xcrun simctl list devices
   ```

4. **Restart the VSCode/Cursor Extension** - If the issue persists, reload the window (Developer: Reload Window)

5. **Increase Log Collection Timeout** - For older or resource-intensive simulators, the default timeout might be too short

### "Error: spawn E2BIG" When Sending Logs

If you see this error when trying to send logs to Composer:

1. **Clear the logs first** - Use "Composer Web: Clear iOS Simulator Logs" to reset the log collection
2. **Try again with fewer logs** - The system has a limit on the amount of data that can be sent
3. **Use the "Capture iOS Simulator" command** - This uses more efficient chunking of logs
4. **Reduce application activity** - Close unnecessary applications in the simulator to reduce log volume
5. **Specify an app name** - Choose a specific app to focus only on relevant logs

### No App Logs Appearing

If you're not seeing any logs from your app:

1. **Check app selection** - Make sure you selected the correct app from the list
2. **Use NSLog or print** - Make sure your app is using NSLog, print, or os_log statements
3. **Try console.log** - For React Native or web apps, console.log should work
4. **Check process name** - Sometimes the process name differs from the app name; try the "All Apps" option

Other troubleshooting tips:

- If you can't connect to a simulator, make sure Xcode is properly installed
- Check that the simulator is available using `xcrun simctl list devices`
- Some older iOS versions may not support all features
- Try using a different simulator if one is consistently problematic
