export interface ProjectInfo {
  name: string;
  path: string;
  description: string | null;
  techStack: string[];
  claudeMd: string | null;
  tasksMd: string | null;
  readmeExcerpt: string | null;
  isGitRepo: boolean;
  gitBranch: string | null;
  lastCommit: string | null;
}

export interface ClaudeUsageStats {
  totalSessions: number;
  totalMessages: number;
  firstSessionDate: string | null;
  dailyActivity: { date: string; messageCount: number; sessionCount: number; toolCallCount: number }[];
  modelUsage: Record<string, { inputTokens: number; outputTokens: number; cacheReadInputTokens: number; cacheCreationInputTokens: number }>;
}

export function formatTokens(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}
