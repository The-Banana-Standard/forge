export interface TerminalTab {
  id: string;
  terminalId: string | null; // null until spawned
  label: string;
  isClaudeSession: boolean;
  isProjectOverview?: boolean; // Project overview tab (no terminal, shows ProjectSummaryPanel)
  sessionId?: string;
  projectPath: string;
  projectName?: string; // Display name for the project
  initialPrompt?: string; // Sent to Claude after spawn (e.g. "/skill-name")
  isWorkspaceAgent?: boolean; // Special workspace-wide Claude session
  workspaceContext?: string; // Full context string for workspace agent
  dead?: boolean; // Process has exited
}

export type TerminalEvent =
  | { type: "output"; data: number[] }
  | { type: "exit"; code: number | null };
