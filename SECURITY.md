# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Forge, please report it responsibly.

**Do not open a public GitHub issue for security vulnerabilities.**

Instead, please use [GitHub Security Advisories](https://github.com/The-Banana-Standard/forge/security/advisories/new) to report vulnerabilities privately.

You should receive a response within 48 hours. If the issue is confirmed, a fix will be released as soon as possible.

## Scope

Forge runs locally and spawns shell processes on your machine. Security-relevant areas include:

- **Skill installation** — Downloads files from GitHub. URLs are validated against an allowlist of trusted origins.
- **Terminal spawning** — Forge spawns PTY processes with your user's shell and permissions.
- **SQLite database** — Stores project paths and task data locally. No sensitive credentials are stored.
- **GitHub CLI integration** — Delegates to the locally installed `gh` CLI. No GitHub tokens are stored by Forge.

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.1.x   | Yes       |
