import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useSkillStore } from "../../hooks/useSkillStore";
import type { CatalogSkill } from "../../types/skill-catalog";

interface Skill {
  name: string;
  title: string;
  description: string;
  source: string;
}

interface SkillsPanelProps {
  projectPath: string | null;
  onRunSkill: (skillName: string) => void;
  startOnBrowse?: boolean;
  onBrowseModeChange?: (isBrowse: boolean) => void;
}

const CATEGORIES = ["All", "Documents", "Development", "Design", "Productivity", "Workflow"] as const;

export function SkillsPanel({ projectPath, onRunSkill, startOnBrowse, onBrowseModeChange }: SkillsPanelProps) {
  const [activeTab, setActiveTab] = useState<"installed" | "browse">(startOnBrowse ? "browse" : "installed");
  const [skills, setSkills] = useState<Skill[]>([]);
  const [filter, setFilter] = useState("");
  const [browseFilter, setBrowseFilter] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const { catalog, statuses, installing, install, uninstall } = useSkillStore();

  // Sync with external browse mode signal
  useEffect(() => {
    if (startOnBrowse) {
      setActiveTab("browse");
    }
  }, [startOnBrowse]);

  const handleTabChange = (tab: "installed" | "browse") => {
    setActiveTab(tab);
    onBrowseModeChange?.(tab === "browse");
  };

  const loadSkills = useCallback(() => {
    invoke<Skill[]>("get_skills", { projectPath })
      .then(setSkills)
      .catch(() => setSkills([]));
  }, [projectPath]);

  useEffect(() => {
    loadSkills();
  }, [loadSkills]);

  // Installed tab filtering
  const filtered = filter
    ? skills.filter(
        (s) =>
          s.name.toLowerCase().includes(filter.toLowerCase()) ||
          s.title.toLowerCase().includes(filter.toLowerCase()) ||
          s.description.toLowerCase().includes(filter.toLowerCase())
      )
    : skills;

  const projectSkills = filtered.filter((s) => s.source === "project");
  const globalSkills = filtered.filter((s) => s.source === "global" || s.source === "skill");

  // Browse tab filtering
  const browseCatalog = catalog.filter((s) => {
    const matchesSearch = !browseFilter ||
      s.name.toLowerCase().includes(browseFilter.toLowerCase()) ||
      s.description.toLowerCase().includes(browseFilter.toLowerCase()) ||
      s.id.toLowerCase().includes(browseFilter.toLowerCase());
    const matchesCategory = selectedCategory === "All" || s.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleInstall = async (skill: CatalogSkill) => {
    await install(skill);
    loadSkills();
  };

  const handleUninstall = async (skill: CatalogSkill) => {
    await uninstall(skill);
    loadSkills();
  };

  const installedCount = Array.from(statuses.values()).filter(Boolean).length;

  return (
    <div className="skills-panel">
      <h3 className="skills-panel-title">Skills</h3>

      <div className="skills-tabs">
        <button
          className={`skills-tab ${activeTab === "installed" ? "active" : ""}`}
          onClick={() => handleTabChange("installed")}
        >
          Installed
        </button>
        <button
          className={`skills-tab ${activeTab === "browse" ? "active" : ""}`}
          onClick={() => handleTabChange("browse")}
        >
          Browse Store
        </button>
      </div>

      {activeTab === "installed" ? (
        <>
          <input
            className="skills-search"
            type="text"
            placeholder="Filter skills..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />

          {projectSkills.length > 0 && (
            <div className="skills-group">
              <div className="skills-group-label">Project</div>
              {projectSkills.map((s) => (
                <div
                  key={`project-${s.name}`}
                  className="skill-card"
                  onClick={() => onRunSkill(s.name)}
                >
                  <div className="skill-name">/{s.name}</div>
                  <div className="skill-title">{s.title}</div>
                  {s.description && (
                    <div className="skill-desc">{s.description}</div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="skills-group">
            <div className="skills-group-label">
              Global
              <span className="skills-count">{globalSkills.length}</span>
            </div>
            {globalSkills.map((s) => (
              <div
                key={`global-${s.name}`}
                className="skill-card"
                onClick={() => onRunSkill(s.name)}
              >
                <div className="skill-name">/{s.name}</div>
                <div className="skill-title">{s.title}</div>
                {s.description && (
                  <div className="skill-desc">{s.description}</div>
                )}
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="skills-empty">No skills found</div>
          )}
        </>
      ) : (
        <>
          <div className="skills-browse-header">
            <span className="skills-browse-count">{installedCount} installed</span>
          </div>

          <input
            className="skills-search"
            type="text"
            placeholder="Search skills..."
            value={browseFilter}
            onChange={(e) => setBrowseFilter(e.target.value)}
          />

          <div className="skills-categories">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                className={`skills-category-pill ${selectedCategory === cat ? "active" : ""}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="skills-browse-list">
            {browseCatalog.map((skill) => {
              const isInstalled = statuses.get(skill.id) ?? false;
              const isInstalling = installing.has(skill.id);

              return (
                <div key={skill.id} className="store-skill-card">
                  <div className="store-skill-info">
                    <div className="store-skill-name">{skill.name}</div>
                    <div className="store-skill-desc">{skill.description}</div>
                    <div className="store-skill-meta">
                      <span className="store-skill-category">{skill.category}</span>
                      <span className="store-skill-author">{skill.author}</span>
                    </div>
                  </div>
                  <button
                    className={`store-install-btn ${isInstalled ? "installed" : ""} ${isInstalling ? "installing" : ""}`}
                    onClick={() => {
                      if (isInstalling) return;
                      if (isInstalled) {
                        handleUninstall(skill);
                      } else {
                        handleInstall(skill);
                      }
                    }}
                    disabled={isInstalling}
                  >
                    {isInstalling ? "..." : isInstalled ? "Remove" : "Install"}
                  </button>
                </div>
              );
            })}
            {browseCatalog.length === 0 && (
              <div className="skills-empty">No skills match your search</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
