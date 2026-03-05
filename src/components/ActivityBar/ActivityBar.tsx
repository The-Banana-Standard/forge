import { useState, useEffect } from "react";
import { UsagePanel } from "./UsagePanel";
import { SkillsPanel } from "./SkillsPanel";
import { ResourcesPanel } from "./ResourcesPanel";

export type PanelId = "usage" | "skills" | "resources" | null;

interface ActivityBarProps {
  projectPath: string | null;
  onRunSkill: (skillName: string) => void;
  openSkillsBrowse?: boolean;
  onSkillsBrowseConsumed?: () => void;
}

export function ActivityBar({ projectPath, onRunSkill, openSkillsBrowse, onSkillsBrowseConsumed }: ActivityBarProps) {
  const [activePanel, setActivePanel] = useState<PanelId>(null);
  const [skillsBrowseMode, setSkillsBrowseMode] = useState(false);

  // When "Browse all" is clicked from the dashboard, open skills panel in browse mode
  useEffect(() => {
    if (openSkillsBrowse) {
      setActivePanel("skills");
      setSkillsBrowseMode(true);
      onSkillsBrowseConsumed?.();
    }
  }, [openSkillsBrowse, onSkillsBrowseConsumed]);

  const toggle = (id: PanelId) => {
    setActivePanel((prev) => {
      if (prev === id) {
        setSkillsBrowseMode(false);
        return null;
      }
      if (id !== "skills") setSkillsBrowseMode(false);
      return id;
    });
  };

  const isWide = activePanel === "skills" && skillsBrowseMode;

  return (
    <>
      {/* Expandable panel */}
      {activePanel && (
        <div className={`activity-panel ${isWide ? "wide" : ""}`}>
          {activePanel === "usage" && <UsagePanel />}
          {activePanel === "skills" && (
            <SkillsPanel
              projectPath={projectPath}
              onRunSkill={onRunSkill}
              startOnBrowse={skillsBrowseMode}
              onBrowseModeChange={setSkillsBrowseMode}
            />
          )}
          {activePanel === "resources" && <ResourcesPanel />}
        </div>
      )}
      {/* Icon strip */}
      <div className="activity-bar">
        <button
          className={`activity-icon ${activePanel === "usage" ? "active" : ""}`}
          onClick={() => toggle("usage")}
          title="Usage Stats"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="12" width="4" height="9" rx="1" />
            <rect x="10" y="7" width="4" height="14" rx="1" />
            <rect x="17" y="3" width="4" height="18" rx="1" />
          </svg>
        </button>
        <button
          className={`activity-icon ${activePanel === "skills" ? "active" : ""}`}
          onClick={() => toggle("skills")}
          title="Skills & Commands"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </button>
        <button
          className={`activity-icon ${activePanel === "resources" ? "active" : ""}`}
          onClick={() => toggle("resources")}
          title="Resources & Learning"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
        </button>
      </div>
    </>
  );
}
