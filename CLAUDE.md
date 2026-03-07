# CLAUDE.md

## Project Overview

Canopy is a Tauri v2 desktop app that manages Claude Code CLI sessions. It acts as a workspace manager and terminal multiplexer: you add project folders, then launch Claude Code sessions or shell terminals against them. Everything runs locally -- no external APIs.

## Tech Stack

- **Backend:** Rust (Tauri v2, portable-pty, tokio, serde)
- **Frontend:** React 19, TypeScript (strict), xterm.js v6
- **Storage:** SQLite via tauri-plugin-sql (projects, workspaces, planner tasks)
- **Build:** Vite 7, Cargo (edition 2021)
- **Testing:** Vitest + @testing-library/react (frontend), `cargo test` (Rust)

## Directory Structure

```
src-tauri/
  src/
    lib.rs              -- Tauri app setup, plugin registration, command handler
    state.rs            -- AppState (terminals map behind Mutex)
    commands/
      terminal.rs       -- spawn_terminal, write_to_terminal, resize_terminal, close_terminal
      claude_data.rs    -- get_sessions_for_project, read_claude_md, get_claude_usage_stats
      projects.rs       -- scan_workspace, get_project_info, get_workspace_context
      skills.rs         -- get_skills, install_skill, uninstall_skill, check_skills_installed
      github.rs         -- get_github_items

src/
  App.tsx               -- Root component, wires hooks to layout
  components/
    Layout/             -- AppLayout shell
    Sidebar/            -- Project/workspace list
    Terminal/            -- TerminalTabBar, TerminalView (xterm.js)
    WorkspaceOverview/  -- Home tab dashboard
    ProjectSummary/     -- Per-project overview with session history
    ActivityBar/        -- Left icon bar
    DailyPlanner/       -- Task management UI
    GitHubDashboard/    -- GitHub issues/PRs panel
  hooks/
    useTerminal.ts      -- Tab state, PTY lifecycle, split mode
    useProjects.ts      -- Project/workspace CRUD (SQLite-backed)
    useSkillStore.ts    -- Skill installation and listing
    useClaudeSessions.ts -- Session history from ~/.claude
    useGitHub.ts        -- GitHub CLI integration
    usePlannerTasks.ts  -- Daily planner tasks (SQLite-backed)
  styles/
    globals.css         -- All styles, CSS custom properties for dark theme
```

## Key Patterns

**Rust-to-frontend communication:** All Rust commands are called from React via `invoke()` from `@tauri-apps/api/core`. PTY output streams to the frontend through Tauri Channel events.

**Terminal tabs:** Managed in-memory by `useTerminal`. `HOME_TAB_ID = "home"` is a reserved tab that shows the workspace overview. Each non-home tab spawns a PTY process. Tabs can be Claude Code sessions (`isClaudeSession: true`) or plain shells.

**Split mode:** Terminal tabs can display in a grid layout. The grid columns/rows adjust based on tab count (1, 2, or 3+ columns).

**Skills:** Installed to `~/.claude/commands/` or `~/.claude/skills/`. The skills system reads, installs, and uninstalls slash-command skill files for Claude Code.

**SQLite:** Used for persisting projects, workspaces, and planner tasks. Accessed through `tauri-plugin-sql`.

**PTY cleanup:** All PTY processes are killed on window destroy (see `on_window_event` in `lib.rs`).

## Development

```sh
# Run in development (requires cargo in PATH)
npm run tauri dev

# Production build
npm run tauri build

# Frontend-only dev server (no Tauri shell, limited use)
npm run dev

# Run tests
npm test                    # TypeScript (vitest)
cargo test --manifest-path src-tauri/Cargo.toml  # Rust
```

The Vite dev server runs on port 1420. HMR ignores `src-tauri/`.

## TypeScript Config

Strict mode enabled. Target ES2021. Module resolution set to `bundler`. JSX uses `react-jsx` transform.
