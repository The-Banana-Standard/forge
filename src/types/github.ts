export interface GitHubPr {
  number: number;
  title: string;
  author: string;
  repoName: string;
  projectPath: string;
  url: string;
  createdAt: string;
  draft: boolean;
  reviewDecision: string | null;
}

export interface GitHubIssue {
  number: number;
  title: string;
  repoName: string;
  projectPath: string;
  url: string;
  createdAt: string;
  labels: string[];
}

export interface GitHubData {
  prs: GitHubPr[];
  issues: GitHubIssue[];
  error: string | null;
}
