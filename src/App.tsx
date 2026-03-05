import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { checkClaudeCli } from "./services/terminal-service";
import { AppLayout } from "./components/Layout/AppLayout";
import { Sidebar } from "./components/Sidebar/Sidebar";
import { WorkspaceOverview } from "./components/WorkspaceOverview/WorkspaceOverview";
import { ProjectSummaryPanel } from "./components/ProjectSummary/ProjectSummaryPanel";
import { TerminalTabBar } from "./components/Terminal/TerminalTabBar";
import { TerminalView } from "./components/Terminal/TerminalView";
import { useProjects } from "./hooks/useProjects";
import { useTerminal, HOME_TAB_ID } from "./hooks/useTerminal";
import type { Project } from "./types/project";

function App() {
  const {
    projects,
    workspaces,
    addProject,
    addWorkspace,
    selectProject,
    removeProject,
    removeWorkspace,
  } = useProjects();

  const {
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
  } = useTerminal();

  // Claude CLI availability — default true to avoid false-blocking before check completes
  const [claudeCliAvailable, setClaudeCliAvailable] = useState<boolean | null>(true);

  useEffect(() => {
    checkClaudeCli().then((status) => setClaudeCliAvailable(status.available));
  }, []);

  // Controls whether the right sidebar skills panel opens to Browse tab
  const [openSkillsBrowse, setOpenSkillsBrowse] = useState(false);

  const handleOpenProject = useCallback(
    (project: Project) => {
      selectProject(project);
      openProjectTab(project.path);
    },
    [selectProject, openProjectTab]
  );

  const handleResumeSession = useCallback(
    (sessionId: string) => {
      const tab = tabs.find((t) => t.id === activeTabId);
      const path = tab?.projectPath;
      if (path) {
        addTab(path, true, sessionId);
        if (tab) removeTab(tab.id);
      }
    },
    [tabs, activeTabId, addTab, removeTab]
  );

  const handleNewSessionFromOverview = useCallback(() => {
    const tab = tabs.find((t) => t.id === activeTabId);
    const path = tab?.projectPath;
    if (path) {
      addTab(path, true);
      if (tab) removeTab(tab.id);
    }
  }, [tabs, activeTabId, addTab, removeTab]);

  const handleNewShellFromOverview = useCallback(() => {
    const tab = tabs.find((t) => t.id === activeTabId);
    const path = tab?.projectPath;
    if (path) {
      addTab(path, false);
      if (tab) removeTab(tab.id);
    }
  }, [tabs, activeTabId, addTab, removeTab]);

  const getActiveProjectPath = useCallback(() => {
    if (activeTabId === HOME_TAB_ID) {
      if (workspaces.length > 0) return workspaces[0].path;
      if (projects.length > 0) return projects[0].path;
      return null;
    }
    const activeTab = tabs.find((t) => t.id === activeTabId);
    if (activeTab && activeTab.projectPath) {
      return activeTab.projectPath;
    }
    if (workspaces.length > 0) return workspaces[0].path;
    if (projects.length > 0) return projects[0].path;
    return null;
  }, [tabs, activeTabId, workspaces, projects]);

  const handleNewClaude = useCallback(() => {
    const path = getActiveProjectPath();
    if (path) addTab(path, true);
  }, [getActiveProjectPath, addTab]);

  const handleNewTerminal = useCallback(() => {
    const path = getActiveProjectPath();
    if (path) addTab(path, false);
  }, [getActiveProjectPath, addTab]);

  const handleRunSkill = useCallback(
    (skillName: string) => {
      const path = getActiveProjectPath();
      if (path) addTab(path, true, undefined, `/${skillName}`);
    },
    [getActiveProjectPath, addTab]
  );

  const handleSendTaskToClaude = useCallback(
    (text: string, projectPath?: string) => {
      const path = projectPath || getActiveProjectPath();
      if (path) addTab(path, true, undefined, text);
    },
    [getActiveProjectPath, addTab]
  );

  const handleLaunchWorkspaceAgent = useCallback(async () => {
    const wsPath = workspaces.length > 0 ? workspaces[0].path : null;
    if (!wsPath) return;
    try {
      const context = await invoke<string>("get_workspace_context", {
        workspacePath: wsPath,
      });
      addWorkspaceAgentTab(wsPath, context);
    } catch (err) {
      console.error("Failed to launch workspace agent:", err);
    }
  }, [workspaces, addWorkspaceAgentTab]);

  const handleBrowseAllSkills = useCallback(() => {
    setOpenSkillsBrowse(true);
  }, []);

  const hasWorkspace = workspaces.length > 0;
  const activeTab = tabs.find((t) => t.id === activeTabId);
  const isHomeActive = activeTabId === HOME_TAB_ID;
  const isOverviewActive = activeTab?.isProjectOverview === true;
  const terminalTabs = tabs.filter((t) => !t.isProjectOverview);

  // In split mode, show all terminal tabs. Otherwise show only active.
  const gridCount = splitMode ? terminalTabs.length : 1;
  const gridCols = gridCount <= 1 ? "1fr" : gridCount === 2 ? "1fr 1fr" : gridCount <= 4 ? "1fr 1fr" : "1fr 1fr 1fr";
  const gridRows = gridCount <= 2 ? "1fr" : "1fr 1fr";

  const isSpecialTab = isHomeActive || isOverviewActive;

  return (
    <AppLayout
      projectPath={activeTab ? activeTab.projectPath : null}
      onRunSkill={handleRunSkill}
      onGoHome={goHome}
      openSkillsBrowse={openSkillsBrowse}
      onSkillsBrowseConsumed={() => setOpenSkillsBrowse(false)}
      sidebar={
        <Sidebar
          projects={projects}
          workspaces={workspaces}
          selectedProject={null}
          onAddProject={addProject}
          onAddWorkspace={addWorkspace}
          onSelectProject={handleOpenProject}
          onRemoveProject={removeProject}
          onRemoveWorkspace={removeWorkspace}
          onGoHome={goHome}
        />
      }
      main={
        <div className="main-content">
          {/* Tab bar */}
          <TerminalTabBar
            tabs={tabs}
            activeTabId={activeTabId}
            splitMode={splitMode}
            onSelectTab={setActiveTabId}
            onCloseTab={removeTab}
            onToggleSplit={toggleSplit}
            onNewTerminal={handleNewTerminal}
            onNewClaudeSession={handleNewClaude}
          />

          {/* Home tab content */}
          {isHomeActive && hasWorkspace && (
            <WorkspaceOverview
              projects={projects}
              onSelectProject={handleOpenProject}
              onLaunchAgent={handleLaunchWorkspaceAgent}
              onSendTaskToClaude={handleSendTaskToClaude}
              onRunSkill={handleRunSkill}
              onBrowseAllSkills={handleBrowseAllSkills}
            />
          )}

          {isHomeActive && !hasWorkspace && (
            <div className="no-project-selected">
              <div className="no-project-icon">&gt;_</div>
              <h2>Forge</h2>
              <p>Add a workspace folder to get started.</p>
            </div>
          )}

          {/* Project overview tab content */}
          {isOverviewActive && activeTab && (
            <ProjectSummaryPanel
              projectName={activeTab.projectName || activeTab.label}
              projectPath={activeTab.projectPath}
              onResumeSession={handleResumeSession}
              onNewSession={handleNewSessionFromOverview}
              onNewShell={handleNewShellFromOverview}
            />
          )}

          {/* Terminal panels — always in DOM so xterm can init with real dimensions */}
          {terminalTabs.length > 0 && (
            <div
              className={`terminal-panels ${splitMode && !isSpecialTab ? "grid-mode" : ""}`}
              style={{
                display: splitMode && !isSpecialTab ? "grid" : "flex",
                ...(splitMode && !isSpecialTab
                  ? { gridTemplateColumns: gridCols, gridTemplateRows: gridRows, gap: "2px" }
                  : {}),
                ...(isSpecialTab ? { opacity: 0, pointerEvents: "none", position: "absolute", inset: "36px 0 0 0" } : {}),
              }}
            >
              {terminalTabs.map((tab, idx) => {
                const isTabVisible = isSpecialTab
                  ? idx === 0
                  : splitMode
                  ? true
                  : tab.id === activeTabId;

                return splitMode && !isSpecialTab ? (
                  <div key={tab.id} className="split-pane">
                    <div className="split-pane-header">
                      <span className="split-pane-icon">
                        {tab.isWorkspaceAgent ? "*" : tab.isClaudeSession ? ">" : "$"}
                      </span>
                      <span className="split-pane-label">{tab.label}</span>
                      <button
                        className="split-pane-close"
                        onClick={() => removeTab(tab.id)}
                        title="Close"
                      >
                        x
                      </button>
                    </div>
                    <TerminalView
                      tab={tab}
                      isVisible={isTabVisible}
                      splitMode={splitMode}
                      onTerminalSpawned={setTerminalId}
                      claudeCliAvailable={claudeCliAvailable ?? true}
                      onTabDied={() => markTabDead(tab.id)}
                    />
                  </div>
                ) : (
                  <TerminalView
                    key={tab.id}
                    tab={tab}
                    isVisible={isTabVisible}
                    splitMode={splitMode}
                    onTerminalSpawned={setTerminalId}
                    claudeCliAvailable={claudeCliAvailable ?? true}
                    onTabDied={() => markTabDead(tab.id)}
                  />
                );
              })}
            </div>
          )}
        </div>
      }
    />
  );
}

export default App;
