import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import ReactMarkdown from "react-markdown";
import type { ClaudeSession } from "../../types/claude-session";
import type { ProjectInfo } from "../../types/project-info";
import { SessionCard } from "./SessionCard";

interface ProjectSummaryPanelProps {
  projectName: string;
  projectPath: string;
  onResumeSession: (sessionId: string) => void;
  onNewSession?: () => void;
  onNewShell?: () => void;
}

export function ProjectSummaryPanel({
  projectName,
  projectPath,
  onResumeSession,
  onNewSession,
  onNewShell,
}: ProjectSummaryPanelProps) {
  const [sessions, setSessions] = useState<ClaudeSession[]>([]);
  const [info, setInfo] = useState<ProjectInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const currentPath = useRef(projectPath);

  useEffect(() => {
    currentPath.current = projectPath;
    setLoading(true);
    setSessions([]);
    setInfo(null);

    Promise.all([
      invoke<ClaudeSession[]>("get_sessions_for_project", { projectPath }),
      invoke<ProjectInfo>("get_project_info", { projectPath }),
    ])
      .then(([sessionData, projectInfo]) => {
        if (currentPath.current === projectPath) {
          setSessions(sessionData);
          setInfo(projectInfo);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Failed to load project data:", err);
        if (currentPath.current === projectPath) {
          setLoading(false);
        }
      });
  }, [projectPath]);

  if (loading) {
    return (
      <div className="summary-panel">
        <div className="summary-loading">Loading project...</div>
      </div>
    );
  }

  return (
    <div className="summary-panel">
      {/* Project Header */}
      <div className="project-header">
        <h2 className="project-title">{projectName}</h2>
        {info && info.techStack.length > 0 && (
          <div className="tech-stack">
            {info.techStack.map((t) => (
              <span key={t} className="tech-badge">{t}</span>
            ))}
          </div>
        )}
        {info?.gitBranch && (
          <div className="project-git-info">
            <span className="git-branch-badge">{info.gitBranch}</span>
            {info.lastCommit && (
              <span className="git-commit">{info.lastCommit}</span>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {(onNewSession || onNewShell) && (
        <div className="project-actions">
          {onNewSession && (
            <button className="project-action-btn claude" onClick={onNewSession}>
              &gt; New Session
            </button>
          )}
          {onNewShell && (
            <button className="project-action-btn shell" onClick={onNewShell}>
              $ New Shell
            </button>
          )}
        </div>
      )}

      {/* Project Description */}
      {info?.description && (
        <div className="project-description">
          {info.description}
        </div>
      )}

      {/* Recent Sessions — at the top */}
      <div className="info-section">
        <h4 className="info-section-title">
          Recent Sessions
          {sessions.length > 0 && (
            <span className="info-count">{sessions.length}</span>
          )}
        </h4>
        {sessions.length === 0 ? (
          <div className="summary-empty">
            No Claude sessions found for this project.
          </div>
        ) : (
          <div className="session-list">
            {sessions.map((s, i) => (
              <SessionCard
                key={s.sessionId || i}
                session={s}
                onResume={onResumeSession}
              />
            ))}
          </div>
        )}
      </div>

      {/* CLAUDE.md Section — rendered as markdown */}
      {info?.claudeMd && (
        <div className="info-section">
          <h4 className="info-section-title">CLAUDE.md</h4>
          <div className="info-content markdown-content claude-md-content">
            <ReactMarkdown>{info.claudeMd}</ReactMarkdown>
          </div>
        </div>
      )}

      {/* TASKS.md Section — rendered as markdown */}
      {info?.tasksMd && (
        <div className="info-section">
          <h4 className="info-section-title">TASKS.md</h4>
          <div className="info-content markdown-content tasks-md-content">
            <ReactMarkdown>{info.tasksMd}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}
