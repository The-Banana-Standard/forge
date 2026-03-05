interface TerminalTabProps {
  label: string;
  projectName?: string;
  isActive: boolean;
  isClaudeSession: boolean;
  isWorkspaceAgent?: boolean;
  isHomePage?: boolean;
  isProjectOverview?: boolean;
  isDead?: boolean;
  onClick: () => void;
  onClose: () => void;
}

export function TerminalTab({
  label,
  projectName: _,
  isActive,
  isClaudeSession,
  isWorkspaceAgent,
  isHomePage,
  isProjectOverview,
  isDead,
  onClick,
  onClose,
}: TerminalTabProps) {
  const typeClass = isHomePage ? "home" : isProjectOverview ? "overview" : isClaudeSession ? "claude" : "shell";
  const icon = isHomePage ? "\u2302" : isProjectOverview ? "\u2261" : isWorkspaceAgent ? "*" : isClaudeSession ? ">" : "$";

  return (
    <div
      className={`terminal-tab ${isActive ? "active" : ""} ${typeClass} ${isWorkspaceAgent ? "agent" : ""} ${isDead ? "dead" : ""}`}
      onClick={onClick}
    >
      <span className="terminal-tab-icon">{icon}</span>
      <span className="terminal-tab-label">{label}</span>
      {!isHomePage && (
        <button
          className="terminal-tab-close"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        >
          x
        </button>
      )}
    </div>
  );
}
