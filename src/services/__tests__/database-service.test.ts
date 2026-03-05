import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the db object returned by Database.load
const mockExecute = vi.fn();
const mockSelect = vi.fn();

vi.mock("@tauri-apps/plugin-sql", () => ({
  default: {
    load: vi.fn().mockResolvedValue({
      execute: (...args: unknown[]) => mockExecute(...args),
      select: (...args: unknown[]) => mockSelect(...args),
    }),
  },
}));

// Must import AFTER the mock so the module picks up the mocked Database
import {
  getAllProjects,
  addProject,
  updateLastOpened,
  removeProject,
  removeProjectsByWorkspace,
  getAllWorkspaces,
  addWorkspace,
  removeWorkspace,
  getPlannerTasks,
  addPlannerTask,
  togglePlannerTask,
  removePlannerTask,
  clearCompletedPlannerTasks,
  updatePlannerTaskProject,
} from "../database-service";

beforeEach(() => {
  mockExecute.mockReset().mockResolvedValue(undefined);
  mockSelect.mockReset().mockResolvedValue([]);
});

describe("database-service", () => {
  // ── Projects ──

  describe("getAllProjects", () => {
    it("returns projects sorted by name", async () => {
      const projects = [{ id: "p1", name: "Aaa", path: "/a", added_at: "", last_opened: null, workspace_path: null }];
      mockSelect.mockResolvedValue(projects);

      const result = await getAllProjects();

      expect(result).toEqual(projects);
      expect(mockSelect).toHaveBeenCalledWith(
        expect.stringContaining("SELECT * FROM projects")
      );
    });
  });

  describe("addProject", () => {
    it("inserts project with workspace_path", async () => {
      await addProject("p1", "MyApp", "/path/to/app", "/workspace");

      expect(mockExecute).toHaveBeenCalledWith(
        expect.stringContaining("INSERT OR IGNORE INTO projects"),
        ["p1", "MyApp", "/path/to/app", "/workspace"]
      );
    });

    it("inserts project with null workspace_path when omitted", async () => {
      await addProject("p1", "MyApp", "/path/to/app");

      expect(mockExecute).toHaveBeenCalledWith(
        expect.stringContaining("INSERT OR IGNORE INTO projects"),
        ["p1", "MyApp", "/path/to/app", null]
      );
    });
  });

  describe("updateLastOpened", () => {
    it("updates last_opened for the given project id", async () => {
      await updateLastOpened("p1");

      expect(mockExecute).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE projects SET last_opened"),
        ["p1"]
      );
    });
  });

  describe("removeProject", () => {
    it("deletes the project by id", async () => {
      await removeProject("p1");

      expect(mockExecute).toHaveBeenCalledWith(
        expect.stringContaining("DELETE FROM projects WHERE id"),
        ["p1"]
      );
    });
  });

  describe("removeProjectsByWorkspace", () => {
    it("deletes all projects with matching workspace_path", async () => {
      await removeProjectsByWorkspace("/my/workspace");

      expect(mockExecute).toHaveBeenCalledWith(
        expect.stringContaining("DELETE FROM projects WHERE workspace_path"),
        ["/my/workspace"]
      );
    });
  });

  // ── Workspaces ──

  describe("getAllWorkspaces", () => {
    it("returns workspaces sorted by added_at DESC", async () => {
      const workspaces = [{ id: "w1", name: "ws", path: "/ws", added_at: "" }];
      mockSelect.mockResolvedValue(workspaces);

      const result = await getAllWorkspaces();

      expect(result).toEqual(workspaces);
      expect(mockSelect).toHaveBeenCalledWith(
        expect.stringContaining("SELECT * FROM workspaces")
      );
    });
  });

  describe("addWorkspace", () => {
    it("inserts workspace", async () => {
      await addWorkspace("w1", "workspace", "/home/workspace");

      expect(mockExecute).toHaveBeenCalledWith(
        expect.stringContaining("INSERT OR IGNORE INTO workspaces"),
        ["w1", "workspace", "/home/workspace"]
      );
    });
  });

  describe("removeWorkspace", () => {
    it("deletes workspace and its projects", async () => {
      mockSelect.mockResolvedValue([{ id: "w1", name: "ws", path: "/ws", added_at: "" }]);

      await removeWorkspace("w1");

      // Should first select the workspace to get its path
      expect(mockSelect).toHaveBeenCalledWith(
        expect.stringContaining("SELECT * FROM workspaces WHERE id"),
        ["w1"]
      );
      // Then delete associated projects
      expect(mockExecute).toHaveBeenCalledWith(
        expect.stringContaining("DELETE FROM projects WHERE workspace_path"),
        ["/ws"]
      );
      // Then delete the workspace itself
      expect(mockExecute).toHaveBeenCalledWith(
        expect.stringContaining("DELETE FROM workspaces WHERE id"),
        ["w1"]
      );
    });

    it("does nothing if workspace not found", async () => {
      mockSelect.mockResolvedValue([]);

      await removeWorkspace("nonexistent");

      // select was called, but no execute for delete
      expect(mockSelect).toHaveBeenCalled();
      // Only the initial schema creation executes happened, no workspace/project deletes
      const deleteCalls = mockExecute.mock.calls.filter(
        (call) => typeof call[0] === "string" && call[0].includes("DELETE")
      );
      expect(deleteCalls).toHaveLength(0);
    });
  });

  // ── Planner Tasks ──

  describe("getPlannerTasks", () => {
    it("returns tasks (incomplete + recently completed)", async () => {
      const tasks = [{ id: "t1", text: "Do stuff", completed: 0, created_at: "", completed_at: null, project_id: null, sort_order: 0 }];
      mockSelect.mockResolvedValue(tasks);

      const result = await getPlannerTasks();

      expect(result).toEqual(tasks);
      expect(mockSelect).toHaveBeenCalledWith(
        expect.stringContaining("SELECT * FROM planner_tasks")
      );
    });
  });

  describe("addPlannerTask", () => {
    it("inserts task with calculated sort_order", async () => {
      mockSelect.mockResolvedValue([{ max_order: 5 }]);

      await addPlannerTask("t1", "New task");

      expect(mockExecute).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO planner_tasks"),
        ["t1", "New task", 6, null]
      );
    });

    it("uses sort_order 0 when no existing tasks", async () => {
      mockSelect.mockResolvedValue([{ max_order: null }]);

      await addPlannerTask("t1", "First task");

      expect(mockExecute).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO planner_tasks"),
        ["t1", "First task", 0, null]
      );
    });

    it("passes projectId when provided", async () => {
      mockSelect.mockResolvedValue([{ max_order: 0 }]);

      await addPlannerTask("t1", "Project task", "proj-1");

      expect(mockExecute).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO planner_tasks"),
        ["t1", "Project task", 1, "proj-1"]
      );
    });
  });

  describe("togglePlannerTask", () => {
    it("marks task as completed with timestamp", async () => {
      await togglePlannerTask("t1", true);

      expect(mockExecute).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE planner_tasks SET completed"),
        [1, expect.any(String), "t1"]
      );
    });

    it("marks task as incomplete with null timestamp", async () => {
      await togglePlannerTask("t1", false);

      expect(mockExecute).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE planner_tasks SET completed"),
        [0, null, "t1"]
      );
    });
  });

  describe("removePlannerTask", () => {
    it("deletes task by id", async () => {
      await removePlannerTask("t1");

      expect(mockExecute).toHaveBeenCalledWith(
        expect.stringContaining("DELETE FROM planner_tasks WHERE id"),
        ["t1"]
      );
    });
  });

  describe("clearCompletedPlannerTasks", () => {
    it("deletes all completed tasks", async () => {
      await clearCompletedPlannerTasks();

      expect(mockExecute).toHaveBeenCalledWith(
        expect.stringContaining("DELETE FROM planner_tasks WHERE completed = 1")
      );
    });
  });

  describe("updatePlannerTaskProject", () => {
    it("updates project_id on task", async () => {
      await updatePlannerTaskProject("t1", "proj-2");

      expect(mockExecute).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE planner_tasks SET project_id"),
        ["proj-2", "t1"]
      );
    });

    it("clears project_id with null", async () => {
      await updatePlannerTaskProject("t1", null);

      expect(mockExecute).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE planner_tasks SET project_id"),
        [null, "t1"]
      );
    });
  });
});
