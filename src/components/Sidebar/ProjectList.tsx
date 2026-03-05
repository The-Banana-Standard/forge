import type { Project } from "../../types/project";
import { ProjectItem } from "./ProjectItem";

interface ProjectListProps {
  projects: Project[];
  selectedProject: Project | null;
  onSelect: (project: Project) => void;
  onRemove: (id: string) => void;
}

export function ProjectList({
  projects,
  selectedProject,
  onSelect,
  onRemove,
}: ProjectListProps) {
  if (projects.length === 0) {
    return (
      <div className="project-list-empty">
        No projects yet. Add one to get started.
      </div>
    );
  }

  return (
    <div className="project-list">
      {projects.map((p) => (
        <ProjectItem
          key={p.id}
          project={p}
          isSelected={selectedProject?.id === p.id}
          onSelect={onSelect}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}
