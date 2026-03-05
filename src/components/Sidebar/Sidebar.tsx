import type { Project } from "../../types/project";
import type { Workspace } from "../../services/database-service";
import { ProjectList } from "./ProjectList";

interface SidebarProps {
  projects: Project[];
  workspaces: Workspace[];
  selectedProject: Project | null;
  onAddProject: () => void;
  onAddWorkspace: () => void;
  onSelectProject: (project: Project) => void;
  onRemoveProject: (id: string) => void;
  onRemoveWorkspace: (id: string) => void;
  onGoHome: () => void;
}

export function Sidebar({
  projects,
  workspaces,
  selectedProject,
  onAddProject,
  onAddWorkspace,
  onSelectProject,
  onRemoveProject,
  onRemoveWorkspace,
  onGoHome,
}: SidebarProps) {
  // Group projects by workspace
  const workspaceProjects = new Map<string, Project[]>();
  const standaloneProjects: Project[] = [];

  for (const p of projects) {
    if (p.workspace_path) {
      const existing = workspaceProjects.get(p.workspace_path) || [];
      existing.push(p);
      workspaceProjects.set(p.workspace_path, existing);
    } else {
      standaloneProjects.push(p);
    }
  }

  // Sort workspace projects alphabetically
  for (const [key, val] of workspaceProjects) {
    workspaceProjects.set(
      key,
      val.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
    );
  }

  return (
    <div className="sidebar">
      <div className="sidebar-header" onClick={onGoHome} style={{ cursor: "pointer" }}>
        <h2 className="sidebar-title">Workspace</h2>
      </div>

      <div className="sidebar-actions">
        <button className="add-project-btn" onClick={onAddWorkspace}>
          <span className="add-icon">+</span>
          <span>Add Workspace</span>
        </button>
        <button className="add-project-btn add-single" onClick={onAddProject}>
          <span className="add-icon">+</span>
          <span>Add Project</span>
        </button>
      </div>

      <div className="sidebar-scroll">
        {workspaces.map((ws) => {
          const wsProjects = workspaceProjects.get(ws.path) || [];
          return (
            <div key={ws.id} className="workspace-group">
              <div className="workspace-header">
                <span className="workspace-icon" onClick={onGoHome} style={{ cursor: "pointer" }}>/</span>
                <span className="workspace-name" onClick={onGoHome} style={{ cursor: "pointer" }}>{ws.name}</span>
                <span className="workspace-count">{wsProjects.length}</span>
                <button
                  className="workspace-remove"
                  onClick={() => onRemoveWorkspace(ws.id)}
                  title="Remove workspace"
                >
                  x
                </button>
              </div>
              <ProjectList
                projects={wsProjects}
                selectedProject={selectedProject}
                onSelect={onSelectProject}
                onRemove={onRemoveProject}
              />
            </div>
          );
        })}

        {standaloneProjects.length > 0 && (
          <div className="workspace-group">
            {workspaces.length > 0 && (
              <div className="workspace-header">
                <span className="workspace-icon">#</span>
                <span className="workspace-name">Standalone</span>
                <span className="workspace-count">{standaloneProjects.length}</span>
              </div>
            )}
            <ProjectList
              projects={standaloneProjects}
              selectedProject={selectedProject}
              onSelect={onSelectProject}
              onRemove={onRemoveProject}
            />
          </div>
        )}

        {workspaces.length === 0 && standaloneProjects.length === 0 && (
          <div className="project-list-empty">
            Add a workspace folder to see your projects.
          </div>
        )}
      </div>
    </div>
  );
}
