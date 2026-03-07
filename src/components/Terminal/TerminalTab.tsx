import { useRef } from "react";

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
  onClick: () => void;
  onClose: () => void;
  onReorder?: (fromId: string, toId: string) => void;
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
  onClick,
  onClose,
  onReorder,
}: TerminalTabProps) {
  const typeClass = isHomePage ? "home" : isProjectOverview ? "overview" : isClaudeSession ? "claude" : "shell";
  const icon = isHomePage ? "\u2302" : isProjectOverview ? "\u2261" : isWorkspaceAgent ? "*" : isClaudeSession ? ">" : "$";
  const dragRef = useRef(false);

  const draggable = !isHomePage && !!tabId && !!onReorder;

  return (
    <div
      className={`terminal-tab ${isActive ? "active" : ""} ${typeClass} ${isWorkspaceAgent ? "agent" : ""} ${isDead ? "dead" : ""}`}
      onClick={onClick}
      draggable={draggable}
      onDragStart={(e) => {
        if (!draggable) return;
        dragRef.current = true;
        e.dataTransfer.setData("text/tab-id", tabId!);
        e.dataTransfer.effectAllowed = "move";
      }}
      onDragEnd={() => { dragRef.current = false; }}
      onDragOver={(e) => {
        if (!draggable) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      }}
      onDrop={(e) => {
        if (!draggable) return;
        e.preventDefault();
        const fromId = e.dataTransfer.getData("text/tab-id");
        if (fromId && fromId !== tabId) {
          onReorder!(fromId, tabId!);
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
