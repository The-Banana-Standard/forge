export interface ClaudeSession {
  sessionId: string | null;
  summary: string | null;
  firstPrompt: string | null;
  messageCount: number | null;
  modified: string | null;
  gitBranch: string | null;
  projectPath: string | null;
}
