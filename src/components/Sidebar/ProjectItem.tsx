import type { Project } from "../../types/project";

interface ProjectItemProps {
  project: Project;
  isSelected: boolean;
  onSelect: (project: Project) => void;
  onRemove: (id: string) => void;
}

export function ProjectItem({
  project,
  isSelected,
  onSelect,
  onRemove,
}: ProjectItemProps) {
  return (
    <div
      className={`project-item ${isSelected ? "selected" : ""}`}
      onClick={() => onSelect(project)}
    >
      <div className="project-item-info">
        <div className="project-item-name">{project.name}</div>
        <div className="project-item-path">{project.path}</div>
      </div>
      <button
        className="project-item-remove"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(project.id);
        }}
        title="Remove project"
      >
        x
      </button>
    </div>
  );
}
