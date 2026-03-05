# Contributing to Forge

Thanks for your interest in contributing to Forge! This guide will help you get set up and submit your first contribution.

## Prerequisites

- [Rust](https://rustup.rs/) (stable toolchain)
- [Node.js](https://nodejs.org/) (v18+)
- [Tauri CLI](https://v2.tauri.app/start/prerequisites/) (`npm install -g @tauri-apps/cli`)
- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) (optional, for testing Claude sessions)
- [GitHub CLI](https://cli.github.com/) (optional, for testing GitHub integration)

## Setup

```bash
# Clone the repo
git clone https://github.com/The-Banana-Standard/forge.git
cd forge

# Install frontend dependencies
npm install

# Run in development mode
npm run tauri dev
```

## Development

```bash
# Frontend-only dev server (limited — no Tauri shell)
npm run dev

# Run tests
npm test                  # TypeScript tests (vitest)
cargo test --manifest-path src-tauri/Cargo.toml   # Rust tests

# Watch mode for tests
npm run test:watch
```

## Project Structure

- `src/` — React frontend (TypeScript)
- `src-tauri/` — Rust backend (Tauri v2)
- `src/hooks/` — Custom React hooks (state management)
- `src/components/` — UI components
- `src/services/` — Service layer (database, terminal, Claude data)
- `src-tauri/src/commands/` — Tauri commands exposed to frontend

See `CLAUDE.md` for detailed architecture documentation.

## Submitting Changes

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Make your changes
4. Run tests to ensure nothing is broken
5. Commit with a clear message describing the change
6. Open a Pull Request against `main`

## Pull Request Guidelines

- Keep PRs focused — one feature or fix per PR
- Include tests for new functionality
- Update `CLAUDE.md` if you change the architecture
- Make sure all tests pass before submitting

## Reporting Bugs

Open an issue with:
- Steps to reproduce
- Expected vs actual behavior
- OS and app version
- Console/terminal output if relevant

## Code Style

- TypeScript: strict mode, 2-space indent
- Rust: standard rustfmt defaults
- Prefer small, focused functions
- Follow existing patterns in the codebase

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
