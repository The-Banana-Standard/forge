<p align="center">
  <img src="logo.svg" alt="Forge" width="128" height="128" />
</p>

<h1 align="center">Forge</h1>

<p align="center">
  A desktop workspace manager and terminal multiplexer for <a href="https://docs.anthropic.com/en/docs/claude-code">Claude Code</a> CLI sessions.
</p>

<p align="center">
  <a href="#features">Features</a> &middot;
  <a href="#installation">Installation</a> &middot;
  <a href="#development">Development</a> &middot;
  <a href="#contributing">Contributing</a>
</p>

---

Forge is a Tauri v2 desktop app that lets you manage project folders, launch Claude Code sessions and shell terminals against them, and keep everything organized in workspaces. Everything runs locally -- no external APIs, no cloud dependencies.

## Features

- **Workspace management** -- Group projects into workspaces and switch between them
- **Terminal multiplexer** -- Run multiple Claude Code sessions and shell terminals side by side with split view
- **Session history** -- Browse past Claude Code sessions per project
- **Skills manager** -- Install, uninstall, and browse Claude Code slash-command skills
- **Daily planner** -- Built-in task management to track your work
- **GitHub dashboard** -- View issues and PRs for your projects via the GitHub CLI
- **Dark theme** -- Purpose-built dark UI designed for long coding sessions

## Installation

### Pre-built releases

Download the latest release for your platform from the [Releases](https://github.com/The-Banana-Standard/forge/releases) page.

### Build from source

**Prerequisites:**
- [Rust](https://rustup.rs/) (stable toolchain)
- [Node.js](https://nodejs.org/) v18+
- Platform-specific Tauri dependencies -- see the [Tauri v2 prerequisites](https://v2.tauri.app/start/prerequisites/)

```bash
git clone https://github.com/The-Banana-Standard/forge.git
cd forge
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

Forge is built with:

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
