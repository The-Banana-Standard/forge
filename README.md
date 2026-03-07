<p align="center">
  <img src="logo.svg" alt="Canopy" width="128" height="128" />
</p>

<h1 align="center">Canopy</h1>

<p align="center">
  A desktop workspace manager and terminal multiplexer for <a href="https://docs.anthropic.com/en/docs/claude-code">Claude Code</a> CLI sessions.
</p>

<p align="center">
  <a href="#quick-install">Install</a> &middot;
  <a href="#features">Features</a> &middot;
  <a href="#development">Development</a> &middot;
  <a href="#contributing">Contributing</a>
</p>

---

Canopy is a Tauri v2 desktop app that lets you manage project folders, launch Claude Code sessions and shell terminals against them, and keep everything organized in workspaces. Everything runs locally -- no external APIs, no cloud dependencies.

## Quick Install

**macOS / Linux:**

```bash
curl -fsSL https://raw.githubusercontent.com/The-Banana-Standard/canopy/main/install.sh | sh
```

**Windows:** Download the latest `.exe` or `.msi` from the [Releases](https://github.com/The-Banana-Standard/canopy/releases) page.

> **Prerequisite:** [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) must be installed (`npm install -g @anthropic-ai/claude-code`).

## Features

- **Workspace management** -- Group projects into workspaces and switch between them
- **Terminal multiplexer** -- Run multiple Claude Code sessions and shell terminals side by side with split view
- **Workspace Agent** -- Launch a Claude session with full workspace context as a system prompt
- **Session history** -- Browse and resume past Claude Code sessions per project
- **Skills manager** -- Install, browse, and run Claude Code slash-command skills
- **Daily planner** -- Built-in task management with the ability to send tasks directly to Claude
- **GitHub dashboard** -- View issues and PRs (authored, assigned, review-requested) via the GitHub CLI
- **Keyboard shortcuts** -- Cmd+T (new session), Cmd+W (close tab), Cmd+1-9 (switch tabs), Cmd+F (search terminal)
- **Session persistence** -- Tabs restore automatically across app restarts
- **Drag and drop** -- Reorder tabs by dragging; drop files from Finder into terminals to paste paths
- **Dark theme** -- Purpose-built dark UI designed for long coding sessions
- **Cross-platform** -- macOS (Apple Silicon & Intel), Linux, and Windows

## Installation

### Pre-built releases

Download the latest release for your platform from the [Releases](https://github.com/The-Banana-Standard/canopy/releases) page.

| Platform | File |
|----------|------|
| macOS (Apple Silicon) | `Canopy_x.x.x_aarch64.dmg` |
| macOS (Intel) | `Canopy_x.x.x_x64.dmg` |
| Windows | `Canopy_x.x.x_x64-setup.exe` |
| Linux (Debian/Ubuntu) | `Canopy_x.x.x_amd64.deb` |
| Linux (other) | `Canopy_x.x.x_amd64.AppImage` |

> **macOS users:** The app is code-signed and notarized. If you installed an older version and macOS shows "Canopy is damaged and can't be opened", run:
> ```bash
> xattr -cr /Applications/Canopy.app
> ```

### Build from source

**Prerequisites:**
- [Rust](https://rustup.rs/) (stable toolchain)
- [Node.js](https://nodejs.org/) v18+
- Platform-specific Tauri dependencies -- see the [Tauri v2 prerequisites](https://v2.tauri.app/start/prerequisites/)

```bash
git clone https://github.com/The-Banana-Standard/canopy.git
cd canopy
npm install
npm run tauri build
```

The built application will be in `src-tauri/target/release/`.

## Development

```bash
# Run in development mode (hot reload)
npm run tauri dev

# Run frontend tests
npm test

# Run Rust tests
cargo test --manifest-path src-tauri/Cargo.toml

# Frontend-only dev server (no Tauri shell, limited use)
npm run dev
```

The Vite dev server runs on port 1420 with HMR enabled.

## Architecture

Canopy is built with:

- **Backend:** Rust (Tauri v2, portable-pty, tokio)
- **Frontend:** React 19, TypeScript (strict), xterm.js v6
- **Storage:** SQLite via tauri-plugin-sql
- **Build:** Vite 7, Cargo

See [CLAUDE.md](CLAUDE.md) for detailed architecture documentation.

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions and guidelines.

## Security

To report a vulnerability, please see [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE)
