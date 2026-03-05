import { useState, useCallback } from "react";
import type { TerminalTab } from "../types/terminal";
import { closeTerminal } from "../services/terminal-service";

export const HOME_TAB_ID = "home";

export function useTerminal() {
  const [tabs, setTabs] = useState<TerminalTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(HOME_TAB_ID);
  const [splitMode, setSplitMode] = useState(false);

  const addTab = useCallback(
    (projectPath: string, isClaudeSession: boolean, sessionId?: string, initialPrompt?: string) => {
      const id = crypto.randomUUID();
      const projectName = projectPath.split("/").pop() || projectPath;
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
        const projectName = projectPath.split("/").pop() || projectPath;
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

      setTabs((prev) => {
        const tab = prev.find((t) => t.id === tabId);
        if (tab?.terminalId) {
          closeTerminal(tab.terminalId).catch(() => {});
        }
        const filtered = prev.filter((t) => t.id !== tabId);
        // If we're removing the active tab, switch to home
        setActiveTabId((currentActive) => {
          if (currentActive === tabId) return HOME_TAB_ID;
          return currentActive;
        });
        return filtered;
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
  };
}
