import { useSkillStore } from "../../hooks/useSkillStore";

interface SkillsStoreSectionProps {
  onRunSkill: (skillName: string) => void;
  onBrowseAll: () => void;
}

export function SkillsStoreSection({ onRunSkill, onBrowseAll }: SkillsStoreSectionProps) {
  const { catalog, statuses, installing, install } = useSkillStore();

  const featured = catalog.filter((s) => s.featured).slice(0, 6);

  return (
    <div className="dash-col-section">
      <div className="dash-col-header">
        <h3 className="dash-col-title">Skills Store</h3>
        <button className="dash-col-link" onClick={onBrowseAll}>
          Browse all &rarr;
        </button>
      </div>
      <div className="dash-col-list">
        {featured.map((skill) => {
          const isInstalled = statuses.get(skill.id) ?? false;
          const isInstalling = installing.has(skill.id);

          return (
            <div
              key={skill.id}
              className="dash-col-item"
              onClick={isInstalled ? () => onRunSkill(skill.id) : undefined}
              style={isInstalled ? { cursor: "pointer" } : undefined}
            >
              <div className="dash-col-item-main">
                <span className="dash-col-item-name">{skill.name}</span>
                <span className="dash-col-item-badge">{skill.category}</span>
              </div>
              <div className="dash-col-item-desc">{skill.description}</div>
              <button
                className={`dash-col-action-btn ${isInstalled ? "installed" : ""} ${isInstalling ? "installing" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isInstalled && !isInstalling) {
                    install(skill);
                  }
                }}
                disabled={isInstalling}
              >
                {isInstalling ? "..." : isInstalled ? "Installed" : "Install"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
