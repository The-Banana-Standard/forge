import type { ClaudeSession } from "../../types/claude-session";

interface SessionCardProps {
  session: ClaudeSession;
  onResume: (sessionId: string) => void;
}

export function SessionCard({ session, onResume }: SessionCardProps) {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diff = now.getTime() - d.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const days = Math.floor(hours / 24);

      if (hours < 1) return "Just now";
      if (hours < 24) return `${hours}h ago`;
      if (days < 7) return `${days}d ago`;
      return d.toLocaleDateString();
    } catch {
      return dateStr;
    }
  };

  return (
    <div
      className="session-card"
      onClick={() => session.sessionId && onResume(session.sessionId)}
    >
      <div className="session-card-header">
        <span className="session-date">{formatDate(session.modified)}</span>
        {session.gitBranch && (
          <span className="session-branch">{session.gitBranch}</span>
        )}
      </div>
      {session.summary && (
        <div className="session-summary">{session.summary}</div>
      )}
      {session.firstPrompt && !session.summary && (
        <div className="session-prompt">{session.firstPrompt}</div>
      )}
      <div className="session-card-footer">
        {session.messageCount != null && (
          <span className="session-messages">
            {session.messageCount} messages
          </span>
        )}
        {session.sessionId && (
          <span className="session-resume-hint">Click to resume</span>
        )}
      </div>
    </div>
  );
}
