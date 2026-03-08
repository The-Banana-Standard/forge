import { useState, useEffect, useCallback } from "react";
import type { TerminalTab as TerminalTabType } from "../../types/terminal";
import { TerminalTab } from "./TerminalTab";
import { HOME_TAB_ID } from "../../hooks/useTerminal";

interface TerminalTabBarProps {
  tabs: TerminalTabType[];
  activeTabId: string | null;
  splitMode: boolean;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onToggleSplit: () => void;
  onNewTerminal: () => void;
  onNewClaudeSession: () => void;
  onReorderTabs?: (fromId: string, toId: string) => void;
}

export function TerminalTabBar({
  tabs,
  activeTabId,
  splitMode,
  onSelectTab,
  onCloseTab,
  onToggleSplit,
  onNewTerminal,
  onNewClaudeSession,
  onReorderTabs,
}: TerminalTabBarProps) {
  const terminalCount = tabs.filter((t) => !t.isProjectOverview).length;

  // Pointer-based tab reorder (avoids conflict with Tauri's native drag-drop)
  const [draggingTabId, setDraggingTabId] = useState<string | null>(null);
  const [dragOverTabId, setDragOverTabId] = useState<string | null>(null);

  const handleDragStart = useCallback((tabId: string) => {
    setDraggingTabId(tabId);
  }, []);

  const handleDragEnter = useCallback((tabId: string) => {
    if (draggingTabId && tabId !== draggingTabId) {
      setDragOverTabId(tabId);
    }
  }, [draggingTabId]);

  // Listen for global mouseup to complete the reorder
  useEffect(() => {
    if (!draggingTabId) return;

    const handleMouseUp = () => {
      if (draggingTabId && dragOverTabId && onReorderTabs) {
        onReorderTabs(draggingTabId, dragOverTabId);
      }
      setDraggingTabId(null);
      setDragOverTabId(null);
    };

    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, [draggingTabId, dragOverTabId, onReorderTabs]);

  return (
    <div className="terminal-tab-bar">
      <div className="terminal-tabs">
        {/* Permanent Home tab */}
        <TerminalTab
          label="Home"
          isActive={activeTabId === HOME_TAB_ID}
          isClaudeSession={false}
          isHomePage={true}
          onClick={() => onSelectTab(HOME_TAB_ID)}
          onClose={() => {}}
        />
        {/* Dynamic tabs */}
        {tabs.map((tab) => (
          <TerminalTab
            key={tab.id}
            tabId={tab.id}
            label={tab.label}
            projectName={tab.projectName}
            isActive={tab.id === activeTabId}
            isClaudeSession={tab.isClaudeSession}
            isWorkspaceAgent={tab.isWorkspaceAgent}
            isProjectOverview={tab.isProjectOverview}
            isDead={tab.dead}
            completedWhileHidden={tab.completedWhileHidden}
            needsAttention={tab.needsAttention}
            isDragOver={dragOverTabId === tab.id}
            onClick={() => onSelectTab(tab.id)}
            onClose={() => onCloseTab(tab.id)}
            onDragStart={onReorderTabs ? handleDragStart : undefined}
            onDragEnter={onReorderTabs ? handleDragEnter : undefined}
          />
        ))}
      </div>
      <div className="terminal-tab-actions">
        {terminalCount >= 2 && (
          <button
            className={`split-view-btn ${splitMode ? "active" : ""}`}
            onClick={onToggleSplit}
            title={splitMode ? "Single view" : "Split view"}
          >
            {splitMode ? (
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="1" y="1" width="14" height="14" rx="2" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="1" y="1" width="14" height="14" rx="2" />
                <line x1="8" y1="1" x2="8" y2="15" />
              </svg>
            )}
          </button>
        )}
        <button className="new-tab-btn" onClick={onNewClaudeSession} title="New Claude Session">
          + Claude
        </button>
        <button className="new-tab-btn shell" onClick={onNewTerminal} title="New Terminal">
          + Shell
        </button>
      </div>
    </div>
  );
}
