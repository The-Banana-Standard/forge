import { invoke, Channel } from "@tauri-apps/api/core";
import type { TerminalEvent } from "../types/terminal";

export async function spawnTerminal(
  projectPath: string,
  isClaudeSession: boolean,
  sessionId: string | null,
  onEvent: (event: TerminalEvent) => void,
  initialCommand?: string | null,
  systemPrompt?: string | null
): Promise<string> {
  const channel = new Channel<TerminalEvent>();
  channel.onmessage = onEvent;

  const terminalId = await invoke<string>("spawn_terminal", {
    projectPath,
    isClaudeSession,
    sessionId,
    initialCommand: initialCommand || null,
    systemPrompt: systemPrompt || null,
    onEvent: channel,
  });

  return terminalId;
}

export async function writeToTerminal(
  terminalId: string,
  data: string
): Promise<void> {
  await invoke("write_to_terminal", { terminalId, data });
}

export async function resizeTerminal(
  terminalId: string,
  rows: number,
  cols: number
): Promise<void> {
  await invoke("resize_terminal", { terminalId, rows, cols });
}

export async function closeTerminal(terminalId: string): Promise<void> {
  await invoke("close_terminal", { terminalId });
}

export async function checkClaudeCli(): Promise<{ available: boolean; path: string | null }> {
  return await invoke<{ available: boolean; path: string | null }>("check_claude_cli");
}
