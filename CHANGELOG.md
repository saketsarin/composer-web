# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.8] - 2025-03-26

### Added

- iOS Simulator Integration (Beta): Capture screenshots from iOS simulators
- Beta Feature Toggle: New settings panel toggle to enable/disable beta features
- Enhanced iOS device monitoring with screenshot capture capabilities

## [1.0.7] - 2025-03-20

### Added

- Log Filtering Functionality: Implemented filtering capabilities in the SettingsPanel and BrowserMonitor
- Enhanced log management with customizable filtering options

## [1.0.6] - 2025-03-18

### Fixed

- Issues with opening Chat Window: With the latest Cursor update, there were issues in opening the chat window when sending the logs. It has been fixed now

## [1.0.5] - 2025-03-18

### Added

- Keybinding Management: Implemented a new keybinding management system with a customizable settings panel.
- Keybinding Panel: Added a new `KeybindingPanel` for managing keybindings directly within the extension.

### Changed

- Settings Panel: Moved the settings panel to the sidebar for improved accessibility.

### Fixed

- Health Check: Enhanced health check by actively monitoring the status of tabs.
- Console Log Formatting: Improved formatting for console logs to enhance readability.

## [1.0.4] - 2025-02-20

### Added

- Code of Conduct for community guidelines
- Comprehensive CONTRIBUTING.md guidelines
- New ToastService for centralized notification management
- Enhanced session stability and connection handling

### Changed

- Improved error handling and retry logic in composer integration
- Simplified Windows clipboard operations using VSCode API
- Updated documentation for clarity and completeness
- Improved project structure

### Fixed

- Windows clipboard text handling and clearing methods
- Enhanced browser session stability
- Improved connection handling and recovery

## [1.0.3] - 2025-02-18

### Added

- Automatic session health monitoring
- Proactive detection of stale browser sessions
- Improved reconnection handling

### Changed

- Enhanced error messages for connection issues
- Better handling of browser disconnection events
- Improved status bar state management

### Fixed

- Issue with stale sessions requiring Cursor restart
- Status bar showing connected state for inactive sessions

## [1.0.2] - 2025-02-17

- Fixed minor bugs and issues
- Improved stability

## [1.0.1] - 2025-02-16

### Added

- Additional command palette actions:
  - Clear logs (with confirmation)
  - Send logs only
  - Send screenshot only
- Improved status bar indicators with connection state
- Additional keyboard shortcuts for power users:
  - `Cmd/Ctrl + Shift + ;` - Clear logs
  - `Cmd/Ctrl + '` - Send logs only
  - `Cmd/Ctrl + Shift + '` - Send screenshot only

### Changed

- Improved progress notifications for each action
- Enhanced error handling with specific messages
- Renamed commands for better clarity

## [1.0.0] - 2025-02-14

### Added

- Initial release
- Full page screenshot capture
- Real-time console log monitoring
- Network request tracking
- Smart capture functionality
- Multi-tab support
- Chrome DevTools Protocol integration
- Keyboard shortcuts for quick capture
- Progress notifications during capture
- Error handling and recovery
- Documentation and setup guides
