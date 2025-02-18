# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
- Configurable settings for capture format and quality
- Keyboard shortcuts for quick capture
- Progress notifications during capture
- Error handling and recovery
- Documentation and setup guides
