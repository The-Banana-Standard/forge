import type { Project } from "../../types/project";
import { useGitHub } from "../../hooks/useGitHub";

interface GitHubDashboardProps {
  projects: Project[];
  onSendToClaude: (text: string, projectPath?: string) => void;
}

export function GitHubDashboard({ projects, onSendToClaude }: GitHubDashboardProps) {
  const projectPaths = projects.map((p) => p.path);
  const { data, loading, refresh } = useGitHub(projectPaths);

  // If gh not installed, show hint
  if (!loading && data?.error === "gh CLI not found") {
    return (
      <div className="dash-col-section">
        <div className="dash-col-header">
          <h3 className="dash-col-title">GitHub</h3>
        </div>
        <div className="gh-hint">
          Install GitHub CLI to see PRs &amp; issues &mdash;{" "}
          <span className="gh-hint-cmd">brew install gh</span>
        </div>
      </div>
    );
  }

  // If loading or error or no data, still render column placeholder
  if (!data || data.error) {
    return (
      <div className="dash-col-section">
        <div className="dash-col-header">
          <h3 className="dash-col-title">GitHub</h3>
        </div>
        {loading && <div className="dash-col-empty">Loading...</div>}
        {!loading && <div className="dash-col-empty">No GitHub data</div>}
      </div>
    );
  }

  const handleReview = (pr: typeof data.prs[0]) => {
    onSendToClaude(
      `Review PR #${pr.number} in ${pr.repoName}: ${pr.title}. URL: ${pr.url}`,
      pr.projectPath
    );
  };

  const handleStart = (issue: typeof data.issues[0]) => {
    onSendToClaude(
      `Work on issue #${issue.number} in ${issue.repoName}: ${issue.title}. URL: ${issue.url}`,
      issue.projectPath
    );
  };

  const getStatusChar = (pr: typeof data.prs[0]) => {
    if (pr.reviewDecision === "APPROVED") return "\u25CF"; // ●
    return "\u25CB"; // ○
  };

  const getStatusClass = (pr: typeof data.prs[0]) => {
    if (pr.reviewDecision === "APPROVED") return "gh-col-status approved";
    if (pr.draft) return "gh-col-status draft";
    return "gh-col-status pending";
  };

  return (
    <div className="dash-col-section">
      <div className="dash-col-header">
        <h3 className="dash-col-title">GitHub</h3>
        <button
          className="dash-col-link"
          onClick={refresh}
          disabled={loading}
          title="Refresh"
        >
          {"\u21BB"}
        </button>
      </div>
      <div className="dash-col-list">
        {data.prs.length > 0 && (
          <>
            <div className="gh-col-sublabel">PRs ({data.prs.length})</div>
            {data.prs.map((pr) => (
              <div key={`pr-${pr.repoName}-${pr.number}`} className="dash-col-item clickable" onClick={() => handleReview(pr)}>
                <div className="dash-col-item-main">
                  <span className={getStatusClass(pr)}>{getStatusChar(pr)}</span>
                  <span className="dash-col-item-name">#{pr.number} {pr.title}</span>
                </div>
                <div className="dash-col-item-desc">{pr.repoName}</div>
              </div>
            ))}
          </>
        )}
        {data.issues.length > 0 && (
          <>
            <div className="gh-col-sublabel">Issues ({data.issues.length})</div>
            {data.issues.map((issue) => (
              <div key={`issue-${issue.repoName}-${issue.number}`} className="dash-col-item clickable" onClick={() => handleStart(issue)}>
                <div className="dash-col-item-main">
                  <span className="gh-col-status issue">{"\u25CC"}</span>
                  <span className="dash-col-item-name">#{issue.number} {issue.title}</span>
                </div>
                <div className="dash-col-item-desc">{issue.repoName}</div>
              </div>
            ))}
          </>
        )}
        {data.prs.length === 0 && data.issues.length === 0 && (
          <div className="dash-col-empty">No PRs or issues</div>
        )}
      </div>
    </div>
  );
}
