import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import type { TerminalTab } from "../../types/terminal";
import {
  spawnTerminal,
  writeToTerminal,
  resizeTerminal,
} from "../../services/terminal-service";

interface TerminalViewProps {
  tab: TerminalTab;
  isVisible: boolean;
  splitMode: boolean;
  onTerminalSpawned: (tabId: string, terminalId: string) => void;
  claudeCliAvailable?: boolean;
  onTabDied?: () => void;
}

export function TerminalView({
  tab,
  isVisible,
  splitMode,
  onTerminalSpawned,
  claudeCliAvailable,
  onTabDied,
}: TerminalViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const spawnedRef = useRef(false);
  const terminalIdRef = useRef<string | null>(null);
  const roRef = useRef<ResizeObserver | null>(null);

  // Keep latest callbacks in refs to avoid stale closures
  const onTerminalSpawnedRef = useRef(onTerminalSpawned);
  onTerminalSpawnedRef.current = onTerminalSpawned;
  const onTabDiedRef = useRef(onTabDied);
  onTabDiedRef.current = onTabDied;

  // Init terminal on first visibility — no cleanup (xterm persists)
  useEffect(() => {
    if (!containerRef.current || spawnedRef.current || !isVisible) return;
    spawnedRef.current = true;

    const container = containerRef.current;

    const xterm = new Terminal({
      cursorBlink: true,
      fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', Menlo, monospace",
      fontSize: 13,
      lineHeight: 1.2,
      theme: {
        background: "#0D0D0D",
        foreground: "#E0E0E0",
        cursor: "#FF6B00",
        cursorAccent: "#0D0D0D",
        selectionBackground: "#FF6B0040",
        black: "#1A1A1A",
        red: "#FF5555",
        green: "#50FA7B",
        yellow: "#FFB86C",
        blue: "#6272A4",
        magenta: "#FF79C6",
        cyan: "#8BE9FD",
        white: "#E0E0E0",
        brightBlack: "#555555",
        brightRed: "#FF6E6E",
        brightGreen: "#69FF94",
        brightYellow: "#FFCFA8",
        brightBlue: "#D6ACFF",
        brightMagenta: "#FF92DF",
        brightCyan: "#A4FFFF",
        brightWhite: "#FFFFFF",
      },
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    xterm.loadAddon(fitAddon);
    xterm.loadAddon(new WebLinksAddon());

    xterm.open(container);
    xtermRef.current = xterm;
    fitAddonRef.current = fitAddon;

    // Fit after a frame so container has real dimensions
    requestAnimationFrame(() => fitAddon.fit());

    // Guard: if Claude CLI is not available, show help instead of spawning
    if (tab.isClaudeSession && claudeCliAvailable === false) {
      xterm.write("\x1b[31mClaude CLI not found.\x1b[0m\r\n\r\n");
      xterm.write("Install it with:\r\n");
      xterm.write("  \x1b[33mnpm install -g @anthropic-ai/claude-code\x1b[0m\r\n\r\n");
      xterm.write("Then close this tab and try again.\r\n");
      onTabDiedRef.current?.();
      return;
    }

    // Build initial command and system prompt
    let initialCmd: string | undefined;
    let sysPrompt: string | undefined;

    if (tab.isWorkspaceAgent && tab.workspaceContext) {
      sysPrompt = tab.workspaceContext;
      initialCmd = "Give me a quick status update — what have I been working on recently and what should I pick up next?";
    } else if (tab.initialPrompt) {
      initialCmd = tab.initialPrompt;
    }

    spawnTerminal(
      tab.projectPath,
      tab.isClaudeSession,
      tab.sessionId || null,
      (event) => {
        if (event.type === "output") {
          xterm.write(new Uint8Array(event.data));
        } else if (event.type === "exit") {
          xterm.write("\r\n\x1b[90m[Process exited]\x1b[0m\r\n");
          onTabDiedRef.current?.();
        }
      },
      initialCmd,
      sysPrompt,
    )
      .then((termId) => {
        terminalIdRef.current = termId;
        onTerminalSpawnedRef.current(tab.id, termId);

        xterm.onData((data) => {
          writeToTerminal(termId, data).catch(console.error);
        });

        const ro = new ResizeObserver(() => {
          if (container) {
            fitAddon.fit();
            resizeTerminal(termId, xterm.rows, xterm.cols).catch(console.error);
          }
        });
        ro.observe(container);
        roRef.current = ro;
      })
      .catch((err) => {
        xterm.write(`\x1b[31mFailed to start: ${err}\x1b[0m\r\n`);
      });

    // NO cleanup here — xterm must survive visibility changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible]);

  // Cleanup on UNMOUNT only
  useEffect(() => {
    return () => {
      roRef.current?.disconnect();
      xtermRef.current?.dispose();
    };
  }, []);

  // Re-fit when becoming visible again or when split mode changes
  useEffect(() => {
    if (isVisible && fitAddonRef.current && xtermRef.current && terminalIdRef.current) {
      // Use requestAnimationFrame to wait for layout, then fit once
      const rafId = requestAnimationFrame(() => {
        fitAddonRef.current?.fit();
        if (terminalIdRef.current && xtermRef.current) {
          resizeTerminal(
            terminalIdRef.current,
            xtermRef.current.rows,
            xtermRef.current.cols
          ).catch(console.error);
        }
      });
      return () => cancelAnimationFrame(rafId);
    }
  }, [isVisible, splitMode]);

  return (
    <div
      ref={containerRef}
      className="terminal-container"
      style={{
        display: isVisible ? "block" : "none",
      }}
    />
  );
}
