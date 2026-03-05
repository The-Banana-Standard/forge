import { invoke } from "@tauri-apps/api/core";
import type { ClaudeSession } from "../types/claude-session";

export async function getSessionsForProject(
  projectPath: string
): Promise<ClaudeSession[]> {
  return await invoke<ClaudeSession[]>("get_sessions_for_project", {
    projectPath,
  });
}

export async function readClaudeMd(
  projectPath: string
): Promise<string | null> {
  return await invoke<string | null>("read_claude_md", { projectPath });
}
