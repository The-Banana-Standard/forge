# Changelog

All notable changes to Forge will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.4] - 2026-03-07

### Added
- Keyboard shortcuts — Cmd+T (new shell), Cmd+W (close tab), Cmd+1-9 (switch tabs)
- Terminal search — Cmd+F to find text in terminal output with next/prev navigation
- Session persistence — tabs restore automatically across app restarts
- Tab reordering — drag and drop tabs to rearrange them

### Fixed
- GitHub dashboard now shows PRs assigned to you (not just authored/review-requested)
- Daily Planner no longer loses typed text when switching tabs
- Closing a tab in split mode now selects an adjacent tab instead of jumping to Home
- File drops in split mode now target the hovered terminal pane
- Tab drag reorder no longer causes text selection ghost artifacts

## [0.1.3] - 2026-03-05

### Added
- Drag-and-drop file support — drag images or files from Finder into terminal sessions to paste their paths

### Fixed
- GitHub CLI (`gh`) not found when Forge is launched from macOS Finder/Dock

## [0.1.2] - 2026-03-05

### Fixed
- Claude CLI not found when Forge is launched from macOS Finder/Dock due to minimal PATH

## [0.1.1] - 2026-03-05

### Fixed
- App icons now match logo.svg (previously showed default Tauri icon)
- macOS builds are now code-signed and notarized

## [0.1.0] - 2026-03-05

### Added
- Workspace management with project grouping
- Terminal multiplexer with split view for Claude Code and shell sessions
- Session history browser for past Claude Code sessions
- Skills manager for Claude Code slash commands
- Daily planner with task management
- GitHub dashboard for issues and PRs
- Dark theme UI
- Multi-platform support (macOS, Linux, Windows)

[Unreleased]: https://github.com/The-Banana-Standard/forge/compare/v0.1.4...HEAD
[0.1.4]: https://github.com/The-Banana-Standard/forge/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/The-Banana-Standard/forge/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/The-Banana-Standard/forge/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/The-Banana-Standard/forge/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/The-Banana-Standard/forge/releases/tag/v0.1.0
