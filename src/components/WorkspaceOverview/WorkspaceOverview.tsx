import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { Project } from "../../types/project";
import type { ProjectInfo, ClaudeUsageStats } from "../../types/project-info";
import { formatTokens } from "../../types/project-info";
import { DailyPlanner } from "../DailyPlanner/DailyPlanner";
import { GitHubDashboard } from "../GitHubDashboard/GitHubDashboard";
import { SkillsStoreSection } from "./SkillsStoreSection";

interface WorkspaceOverviewProps {
  projects: Project[];
  onSelectProject: (project: Project) => void;
  onLaunchAgent: () => void;
  onSendTaskToClaude: (text: string, projectPath?: string) => void;
  onRunSkill: (skillName: string) => void;
  onBrowseAllSkills: () => void;
}

export function WorkspaceOverview({
  projects,
  onSelectProject,
  onLaunchAgent,
  onSendTaskToClaude,
  onRunSkill,
  onBrowseAllSkills,
}: WorkspaceOverviewProps) {
  const [projectInfos, setProjectInfos] = useState<Map<string, ProjectInfo>>(new Map());
  const [usage, setUsage] = useState<ClaudeUsageStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(() => {
    setLoading(true);
    const toLoad = projects.slice(0, 24);
    Promise.all([
      Promise.all(
        toLoad.map((p) =>
          invoke<ProjectInfo>("get_project_info", { projectPath: p.path })
            .then((info) => [p.path, info] as const)
            .catch(() => null)
        )
      ),
      invoke<ClaudeUsageStats>("get_claude_usage_stats").catch(() => null),
    ]).then(([results, usageStats]) => {
      const map = new Map<string, ProjectInfo>();
      for (const r of results) {
        if (r) map.set(r[0], r[1]);
      }
      setProjectInfos(map);
      setUsage(usageStats);
      setLoading(false);
    });
  }, [projects]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Refresh on window focus with debounce (skip if refreshed within 30s)
  const lastLoadRef = useRef(0);
  useEffect(() => {
    const onFocus = () => {
      if (Date.now() - lastLoadRef.current > 30_000) {
        lastLoadRef.current = Date.now();
        loadDashboard();
      }
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loadDashboard]);

  // Sort projects: those with recent commits first, then alphabetical
  const sortedProjects = useMemo(() => [...projects].sort((a, b) => {
    const aInfo = projectInfos.get(a.path);
    const bInfo = projectInfos.get(b.path);
    const aHasActivity = aInfo?.lastCommit ? 1 : 0;
    const bHasActivity = bInfo?.lastCommit ? 1 : 0;
    if (bHasActivity !== aHasActivity) return bHasActivity - aHasActivity;
    return a.name.localeCompare(b.name);
  }), [projects, projectInfos]);

  const recentProjects = sortedProjects.slice(0, 6);

  const totalTokens = usage
    ? Object.values(usage.modelUsage).reduce(
        (sum, m) => sum + m.inputTokens + m.outputTokens + m.cacheReadInputTokens + m.cacheCreationInputTokens,
        0
      )
    : 0;

  // Today's activity (use local date, not UTC)
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const todayData = usage?.dailyActivity.find((d) => d.date === today);

  return (
    <div className="dashboard">
      {/* Hero section */}
      <div className="dash-hero">
        <div className="dash-hero-left">
          <h1 className="dash-title">Workspace</h1>
          <p className="dash-subtitle">{projects.length} projects</p>
        </div>
        <button className="dash-agent-btn" onClick={onLaunchAgent}>
          <div className="dash-agent-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 8V4H8" />
              <rect width="16" height="12" x="4" y="8" rx="2" />
              <path d="m2 14 6-6 6 6" />
              <path d="m14 10 4 4 4-4" />
            </svg>
          </div>
          <div className="dash-agent-text">
            <span className="dash-agent-label">Workspace Agent</span>
            <span className="dash-agent-desc">Ask about your projects, recent work, and more</span>
          </div>
        </button>
      </div>

      {loading ? (
        <div className="dash-loading">Scanning projects...</div>
      ) : (
        <>
          {/* Quick stats row */}
          {usage && (
            <div className="dash-stats-row">
              <div className="dash-stat-card">
                <span className="dash-stat-value">{projects.length}</span>
                <span className="dash-stat-label">Projects</span>
              </div>
              <div className="dash-stat-card">
                <span className="dash-stat-value">{usage.totalSessions}</span>
                <span className="dash-stat-label">Sessions</span>
              </div>
              <div className="dash-stat-card">
                <span className="dash-stat-value">{usage.totalMessages.toLocaleString()}</span>
                <span className="dash-stat-label">Messages</span>
              </div>
              <div className="dash-stat-card">
                <span className="dash-stat-value">{formatTokens(totalTokens)}</span>
                <span className="dash-stat-label">Tokens</span>
              </div>
              {todayData && (
                <div className="dash-stat-card accent">
                  <span className="dash-stat-value">{todayData.messageCount}</span>
                  <span className="dash-stat-label">Today</span>
                </div>
              )}
            </div>
          )}

          {/* Daily Planner */}
          <DailyPlanner
            projects={projects}
            onSendToClaude={onSendTaskToClaude}
          />

          {/* Three-column row: Recent Projects | GitHub | Skills Store */}
          <div className="dash-columns">
            {/* Recent Projects column */}
            <div className="dash-col-section">
              <div className="dash-col-header">
                <h3 className="dash-col-title">Recent Projects</h3>
              </div>
              <div className="dash-col-list">
                {recentProjects.map((p) => {
                  const info = projectInfos.get(p.path);
                  return (
                    <div
                      key={p.id}
                      className="dash-col-item clickable"
                      onClick={() => onSelectProject(p)}
                    >
                      <div className="dash-col-item-main">
                        <span className="dash-col-item-name">{p.name}</span>
                        {info?.gitBranch && (
                          <span className="dash-col-item-badge">{info.gitBranch}</span>
                        )}
                      </div>
                      {info && info.techStack.length > 0 && (
                        <div className="dash-col-item-tech">
                          {info.techStack.slice(0, 3).map((t) => (
                            <span key={t} className="dash-col-tech-badge">{t}</span>
                          ))}
                        </div>
                      )}
                      {info?.lastCommit && (
                        <div className="dash-col-item-desc">{info.lastCommit}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* GitHub column */}
            <GitHubDashboard
              projects={projects}
              onSendToClaude={onSendTaskToClaude}
            />

            {/* Skills Store column */}
            <SkillsStoreSection
              onRunSkill={onRunSkill}
              onBrowseAll={onBrowseAllSkills}
            />
          </div>

        </>
      )}
    </div>
  );
}
