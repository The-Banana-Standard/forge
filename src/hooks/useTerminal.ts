import { useState, useCallback, useRef, useEffect } from "react";
import type { TerminalTab } from "../types/terminal";
import { closeTerminal } from "../services/terminal-service";

export const HOME_TAB_ID = "home";

const SESSION_STORAGE_KEY = "canopy-tab-sessions";

interface SavedSession {
  id: string;
  label: string;
  isClaudeSession: boolean;
  isProjectOverview?: boolean;
  projectPath: string;
  projectName?: string;
  isWorkspaceAgent?: boolean;
}

function loadSavedSessions(): { tabs: TerminalTab[]; activeTabId: string } {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return { tabs: [], activeTabId: HOME_TAB_ID };
    const saved = JSON.parse(raw) as { tabs: SavedSession[]; activeTabId: string };
    const tabs: TerminalTab[] = saved.tabs.map((s) => ({
      id: s.id,
      terminalId: null,
      label: s.label,
      isClaudeSession: s.isClaudeSession,
      isProjectOverview: s.isProjectOverview,
      projectPath: s.projectPath,
      projectName: s.projectName,
      isWorkspaceAgent: s.isWorkspaceAgent,
    }));
    return { tabs, activeTabId: saved.activeTabId || HOME_TAB_ID };
  } catch {
    return { tabs: [], activeTabId: HOME_TAB_ID };
  }
}

function saveSessions(tabs: TerminalTab[], activeTabId: string | null) {
  const toSave: SavedSession[] = tabs.map((t) => ({
    id: t.id,
    label: t.label,
    isClaudeSession: t.isClaudeSession,
    isProjectOverview: t.isProjectOverview,
    projectPath: t.projectPath,
    projectName: t.projectName,
    isWorkspaceAgent: t.isWorkspaceAgent,
  }));
  localStorage.setItem(
    SESSION_STORAGE_KEY,
    JSON.stringify({ tabs: toSave, activeTabId: activeTabId || HOME_TAB_ID })
  );
}

export function useTerminal() {
  const [tabs, setTabs] = useState<TerminalTab[]>(() => loadSavedSessions().tabs);
  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;
  const [activeTabId, setActiveTabId] = useState<string | null>(() => loadSavedSessions().activeTabId);
  const [splitMode, setSplitMode] = useState(false);

  // Persist tab state on change
  useEffect(() => {
    saveSessions(tabs, activeTabId);
  }, [tabs, activeTabId]);

  const addTab = useCallback(
    (projectPath: string, isClaudeSession: boolean, sessionId?: string, initialPrompt?: string) => {
      const id = crypto.randomUUID();
      const projectName = projectPath.split(/[/\\]/).pop() || projectPath;
      const isSlashCommand = initialPrompt?.startsWith("/");
      const label = initialPrompt
        ? isSlashCommand
          ? initialPrompt
          : projectName
        : projectName;

      setTabs((prev) => {
        // Count existing tabs for the same project + type to add a suffix
        const sameCount = prev.filter(
          (t) => !t.isWorkspaceAgent && t.projectName === projectName && t.isClaudeSession === isClaudeSession
        ).length;
        const finalLabel = sameCount > 0 ? `${label} ${sameCount + 1}` : label;

        const newTab: TerminalTab = {
          id,
          terminalId: null,
          label: finalLabel,
          isClaudeSession,
          sessionId,
          projectPath,
          projectName,
          initialPrompt,
        };
        return [...prev, newTab];
      });
      setActiveTabId(id);
      return id;
    },
    []
  );

  const openProjectTab = useCallback(
    (projectPath: string) => {
      setTabs((prev) => {
        const existing = prev.find(
          (t) => t.isProjectOverview && t.projectPath === projectPath
        );
        if (existing) {
          setActiveTabId(existing.id);
          return prev;
        }

        const id = crypto.randomUUID();
        const projectName = projectPath.split(/[/\\]/).pop() || projectPath;
        const newTab: TerminalTab = {
          id,
          terminalId: null,
          label: projectName,
          isClaudeSession: false,
          isProjectOverview: true,
          projectPath,
          projectName,
        };
        setActiveTabId(id);
        return [...prev, newTab];
      });
    },
    []
  );

  const addWorkspaceAgentTab = useCallback(
    (workspacePath: string, context: string) => {
      const id = crypto.randomUUID();
      setTabs((prev) => {
        const agentCount = prev.filter((t) => t.isWorkspaceAgent).length;
        const label = agentCount === 0 ? "Workspace Agent" : `Workspace Agent ${agentCount + 1}`;

        const newTab: TerminalTab = {
          id,
          terminalId: null,
          label,
          isClaudeSession: true,
          projectPath: workspacePath,
          projectName: "Workspace",
          isWorkspaceAgent: true,
          workspaceContext: context,
        };

        setActiveTabId(id);
        return [...prev, newTab];
      });
      return id;
    },
    []
  );

  const goHome = useCallback(() => {
    setActiveTabId(HOME_TAB_ID);
  }, []);

  const toggleSplit = useCallback(() => {
    setSplitMode((prev) => !prev);
  }, []);

  const removeTab = useCallback(
    async (tabId: string) => {
      if (tabId === HOME_TAB_ID) return;

      // Read terminal ID and index from ref (always current) before updating state
      const currentTabs = tabsRef.current;
      const tabIdx = currentTabs.findIndex((t) => t.id === tabId);
      const tab = tabIdx !== -1 ? currentTabs[tabIdx] : null;
      const terminalIdToClose = tab?.terminalId ?? null;

      setTabs((prev) => prev.filter((t) => t.id !== tabId));

      if (terminalIdToClose) {
        closeTerminal(terminalIdToClose).catch(() => {});
      }

      // If the closed tab was active, switch to an adjacent tab instead of always going home
      setActiveTabId((currentActive) => {
        if (currentActive !== tabId) return currentActive;
        const remaining = currentTabs.filter((t) => t.id !== tabId);
        if (remaining.length === 0) return HOME_TAB_ID;
        // Pick the tab that was next to the closed one (prefer right neighbor, then left)
        const nextIdx = Math.min(tabIdx, remaining.length - 1);
        return remaining[nextIdx].id;
      });
    },
    []
  );

  const setTerminalId = useCallback((tabId: string, terminalId: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === tabId ? { ...t, terminalId } : t))
    );
  }, []);

  const markTabDead = useCallback((tabId: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === tabId ? { ...t, dead: true } : t))
    );
  }, []);

  const reorderTabs = useCallback((fromId: string, toId: string) => {
    setTabs((prev) => {
      const fromIdx = prev.findIndex((t) => t.id === fromId);
      const toIdx = prev.findIndex((t) => t.id === toId);
      if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  }, []);

  return {
    tabs,
    activeTabId,
    splitMode,
    setActiveTabId,
    addTab,
    openProjectTab,
    addWorkspaceAgentTab,
    goHome,
    toggleSplit,
    removeTab,
    setTerminalId,
    markTabDead,
    reorderTabs,
  };
}
