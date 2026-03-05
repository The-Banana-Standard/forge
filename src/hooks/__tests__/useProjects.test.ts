import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { mockInvoke, resetTauriMocks } from "../../__test-utils__/tauri-mock";
import { useProjects } from "../useProjects";

// Mock database-service
const mockGetAllProjects = vi.fn();
const mockAddProject = vi.fn();
const mockUpdateLastOpened = vi.fn();
const mockRemoveProject = vi.fn();
const mockGetAllWorkspaces = vi.fn();
const mockAddWorkspace = vi.fn();
const mockRemoveWorkspace = vi.fn();

vi.mock("../../services/database-service", () => ({
  getAllProjects: (...args: unknown[]) => mockGetAllProjects(...args),
  addProject: (...args: unknown[]) => mockAddProject(...args),
  updateLastOpened: (...args: unknown[]) => mockUpdateLastOpened(...args),
  removeProject: (...args: unknown[]) => mockRemoveProject(...args),
  getAllWorkspaces: (...args: unknown[]) => mockGetAllWorkspaces(...args),
  addWorkspace: (...args: unknown[]) => mockAddWorkspace(...args),
  removeWorkspace: (...args: unknown[]) => mockRemoveWorkspace(...args),
}));

// Mock dialog
vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(),
}));

let uuidCounter = 0;

beforeEach(() => {
  uuidCounter = 0;
  vi.spyOn(crypto, "randomUUID").mockImplementation(() => `uuid-${++uuidCounter}` as `${string}-${string}-${string}-${string}-${string}`);
  resetTauriMocks();
  mockGetAllProjects.mockReset().mockResolvedValue([]);
  mockAddProject.mockReset().mockResolvedValue(undefined);
  mockUpdateLastOpened.mockReset().mockResolvedValue(undefined);
  mockRemoveProject.mockReset().mockResolvedValue(undefined);
  mockGetAllWorkspaces.mockReset().mockResolvedValue([]);
  mockAddWorkspace.mockReset().mockResolvedValue(undefined);
  mockRemoveWorkspace.mockReset().mockResolvedValue(undefined);
  mockInvoke.mockResolvedValue([]); // scan_workspace returns empty
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useProjects", () => {
  it("loads projects and workspaces on mount", async () => {
    const projects = [{ id: "p1", name: "MyApp", path: "/proj", added_at: "", last_opened: null, workspace_path: null }];
    mockGetAllProjects.mockResolvedValue(projects);
    mockGetAllWorkspaces.mockResolvedValue([]);

    const { result } = renderHook(() => useProjects());

    await waitFor(() => {
      expect(result.current.projects).toEqual(projects);
    });
  });

  it("starts with no selected project", async () => {
    const { result } = renderHook(() => useProjects());

    await waitFor(() => {
      expect(result.current.projects).toBeDefined();
    });

    expect(result.current.selectedProject).toBeNull();
  });

  it("selectProject sets selectedProject and updates last_opened", async () => {
    const project = { id: "p1", name: "MyApp", path: "/proj", added_at: "", last_opened: null, workspace_path: null };
    mockGetAllProjects.mockResolvedValue([project]);

    const { result } = renderHook(() => useProjects());

    await waitFor(() => {
      expect(result.current.projects.length).toBe(1);
    });

    await act(async () => {
      await result.current.selectProject(project);
    });

    expect(result.current.selectedProject).toEqual(project);
    expect(mockUpdateLastOpened).toHaveBeenCalledWith("p1");
  });

  it("removeProject calls service and reloads", async () => {
    const { result } = renderHook(() => useProjects());

    await waitFor(() => {
      expect(result.current.projects).toBeDefined();
    });

    await act(async () => {
      await result.current.removeProject("p1");
    });

    expect(mockRemoveProject).toHaveBeenCalledWith("p1");
    // Should reload (getAllProjects called again)
    expect(mockGetAllProjects.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("removeProject clears selectedProject if it was the removed one", async () => {
    const project = { id: "p1", name: "MyApp", path: "/proj", added_at: "", last_opened: null, workspace_path: null };
    mockGetAllProjects.mockResolvedValue([project]);

    const { result } = renderHook(() => useProjects());

    await waitFor(() => {
      expect(result.current.projects.length).toBe(1);
    });

    await act(async () => {
      await result.current.selectProject(project);
    });

    await act(async () => {
      await result.current.removeProject("p1");
    });

    expect(result.current.selectedProject).toBeNull();
  });

  it("removeWorkspace calls service and reloads", async () => {
    const { result } = renderHook(() => useProjects());

    await waitFor(() => {
      expect(result.current.projects).toBeDefined();
    });

    await act(async () => {
      await result.current.removeWorkspace("w1");
    });

    expect(mockRemoveWorkspace).toHaveBeenCalledWith("w1");
  });

  it("syncs workspaces on mount by calling scan_workspace", async () => {
    const workspace = { id: "w1", name: "workspace", path: "/home/user/workspace", added_at: "" };
    mockGetAllWorkspaces.mockResolvedValue([workspace]);
    mockInvoke.mockResolvedValue([
      { name: "proj-a", path: "/home/user/workspace/proj-a", is_git_repo: true, has_claude_md: false },
    ]);

    const { result } = renderHook(() => useProjects());

    await waitFor(() => {
      expect(result.current.projects).toBeDefined();
    });

    expect(mockInvoke).toHaveBeenCalledWith("scan_workspace", {
      workspacePath: "/home/user/workspace",
    });
    expect(mockAddProject).toHaveBeenCalledWith(
      "uuid-1",
      "proj-a",
      "/home/user/workspace/proj-a",
      "/home/user/workspace"
    );
  });
});
