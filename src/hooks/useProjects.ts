import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { Project, DirectoryEntry } from "../types/project";
import {
  getAllProjects,
  addProject,
  updateLastOpened,
  removeProject,
  getAllWorkspaces,
  addWorkspace,
  removeWorkspace,
  type Workspace,
} from "../services/database-service";
import { open } from "@tauri-apps/plugin-dialog";

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const loadAll = useCallback(async () => {
    try {
      const [p, w] = await Promise.all([getAllProjects(), getAllWorkspaces()]);
      setProjects(p);
      setWorkspaces(w);
    } catch (err) {
      console.error("Failed to load:", err);
    }
  }, []);

  // Sync a workspace: scan its directory and add any new project subdirs
  const syncWorkspace = useCallback(async (ws: Workspace) => {
    try {
      const entries = await invoke<DirectoryEntry[]>("scan_workspace", {
        workspacePath: ws.path,
      });
      for (const entry of entries) {
        const id = crypto.randomUUID();
        await addProject(id, entry.name, entry.path, ws.path);
      }
    } catch (err) {
      console.error("Failed to sync workspace:", err);
    }
  }, []);

  // On mount: load everything, then sync all workspaces to pick up new folders
  useEffect(() => {
    (async () => {
      const w = await getAllWorkspaces();
      setWorkspaces(w);
      for (const ws of w) {
        await syncWorkspace(ws);
      }
      const p = await getAllProjects();
      setProjects(p);
    })();
  }, [syncWorkspace]);

  const handleAddWorkspace = useCallback(async () => {
    const selected = await open({ directory: true, multiple: false });
    if (selected && typeof selected === "string") {
      const name = selected.split("/").pop() || selected;
      const id = crypto.randomUUID();
      await addWorkspace(id, name, selected);

      // Scan and import all subdirectories as projects
      const entries = await invoke<DirectoryEntry[]>("scan_workspace", {
        workspacePath: selected,
      });
      for (const entry of entries) {
        const pid = crypto.randomUUID();
        await addProject(pid, entry.name, entry.path, selected);
      }

      await loadAll();
    }
  }, [loadAll]);

  const handleAddProject = useCallback(async () => {
    const selected = await open({ directory: true, multiple: false });
    if (selected && typeof selected === "string") {
      const name = selected.split("/").pop() || selected;
      const id = crypto.randomUUID();
      await addProject(id, name, selected);
      await loadAll();
    }
  }, [loadAll]);

  const handleSelectProject = useCallback(
    async (project: Project) => {
      setSelectedProject(project);
      await updateLastOpened(project.id);
      // Don't re-sort the whole list on every click — just update local state
    },
    []
  );

  const handleRemoveProject = useCallback(
    async (id: string) => {
      await removeProject(id);
      setSelectedProject((prev) => (prev?.id === id ? null : prev));
      await loadAll();
    },
    [loadAll]
  );

  const handleRemoveWorkspace = useCallback(
    async (id: string) => {
      await removeWorkspace(id);
      setSelectedProject(null);
      await loadAll();
    },
    [loadAll]
  );

  return {
    projects,
    workspaces,
    selectedProject,
    addProject: handleAddProject,
    addWorkspace: handleAddWorkspace,
    selectProject: handleSelectProject,
    removeProject: handleRemoveProject,
    removeWorkspace: handleRemoveWorkspace,
  };
}
