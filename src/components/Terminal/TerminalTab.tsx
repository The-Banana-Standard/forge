interface TerminalTabProps {
  tabId?: string;
  label: string;
  projectName?: string;
  isActive: boolean;
  isClaudeSession: boolean;
  isWorkspaceAgent?: boolean;
  isHomePage?: boolean;
  isProjectOverview?: boolean;
  isDead?: boolean;
  isDragOver?: boolean;
  onClick: () => void;
  onClose: () => void;
  onDragStart?: (tabId: string) => void;
  onDragEnter?: (tabId: string) => void;
}

export function TerminalTab({
  tabId,
  label,
  projectName: _,
  isActive,
  isClaudeSession,
  isWorkspaceAgent,
  isHomePage,
  isProjectOverview,
  isDead,
  isDragOver,
  onClick,
  onClose,
  onDragStart,
  onDragEnter,
}: TerminalTabProps) {
  const typeClass = isHomePage ? "home" : isProjectOverview ? "overview" : isClaudeSession ? "claude" : "shell";
  const icon = isHomePage ? "\u2302" : isProjectOverview ? "\u2261" : isWorkspaceAgent ? "*" : isClaudeSession ? ">" : "$";

  const canDrag = !isHomePage && !!tabId && !!onDragStart;

  return (
    <div
      className={`terminal-tab ${isActive ? "active" : ""} ${typeClass} ${isWorkspaceAgent ? "agent" : ""} ${isDead ? "dead" : ""} ${isDragOver ? "drag-over" : ""}`}
      onClick={onClick}
      onMouseDown={(e) => {
        // Only start drag on left click, not on close button
        if (!canDrag || e.button !== 0) return;
        const target = e.target as HTMLElement;
        if (target.closest(".terminal-tab-close")) return;
        e.preventDefault(); // Prevent text selection during drag
        onDragStart!(tabId!);
      }}
      onMouseEnter={() => {
        if (canDrag && onDragEnter) {
          onDragEnter(tabId!);
        }
      }}
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
