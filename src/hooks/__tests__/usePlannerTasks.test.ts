import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { usePlannerTasks } from "../usePlannerTasks";

const mockGetTasks = vi.fn();
const mockAddTask = vi.fn();
const mockToggleTask = vi.fn();
const mockRemoveTask = vi.fn();
const mockClearCompleted = vi.fn();
const mockUpdateProject = vi.fn();

vi.mock("../../services/database-service", () => ({
  getPlannerTasks: (...args: unknown[]) => mockGetTasks(...args),
  addPlannerTask: (...args: unknown[]) => mockAddTask(...args),
  togglePlannerTask: (...args: unknown[]) => mockToggleTask(...args),
  removePlannerTask: (...args: unknown[]) => mockRemoveTask(...args),
  clearCompletedPlannerTasks: (...args: unknown[]) => mockClearCompleted(...args),
  updatePlannerTaskProject: (...args: unknown[]) => mockUpdateProject(...args),
}));

let uuidCounter = 0;

beforeEach(() => {
  uuidCounter = 0;
  vi.spyOn(crypto, "randomUUID").mockImplementation(() => `uuid-${++uuidCounter}` as `${string}-${string}-${string}-${string}-${string}`);
  mockGetTasks.mockReset().mockResolvedValue([]);
  mockAddTask.mockReset().mockResolvedValue(undefined);
  mockToggleTask.mockReset().mockResolvedValue(undefined);
  mockRemoveTask.mockReset().mockResolvedValue(undefined);
  mockClearCompleted.mockReset().mockResolvedValue(undefined);
  mockUpdateProject.mockReset().mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("usePlannerTasks", () => {
  it("loads tasks on mount", async () => {
    const tasks = [{ id: "t1", text: "Do something", completed: 0, created_at: "", completed_at: null, project_id: null, sort_order: 0 }];
    mockGetTasks.mockResolvedValue(tasks);

    const { result } = renderHook(() => usePlannerTasks());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.tasks).toEqual(tasks);
  });

  it("addTask calls service and reloads", async () => {
    const { result } = renderHook(() => usePlannerTasks());

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.addTask("New task");
    });

    expect(mockAddTask).toHaveBeenCalledWith("uuid-1", "New task", undefined);
    // Should reload after adding
    expect(mockGetTasks).toHaveBeenCalledTimes(2);
  });

  it("addTask passes projectId when provided", async () => {
    const { result } = renderHook(() => usePlannerTasks());

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.addTask("Build feature", "proj-1");
    });

    expect(mockAddTask).toHaveBeenCalledWith("uuid-1", "Build feature", "proj-1");
  });

  it("toggleTask calls service and reloads", async () => {
    const { result } = renderHook(() => usePlannerTasks());

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.toggleTask("t1", true);
    });

    expect(mockToggleTask).toHaveBeenCalledWith("t1", true);
    expect(mockGetTasks).toHaveBeenCalledTimes(2);
  });

  it("deleteTask calls service and reloads", async () => {
    const { result } = renderHook(() => usePlannerTasks());

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.deleteTask("t1");
    });

    expect(mockRemoveTask).toHaveBeenCalledWith("t1");
    expect(mockGetTasks).toHaveBeenCalledTimes(2);
  });

  it("clearCompleted calls service and reloads", async () => {
    const { result } = renderHook(() => usePlannerTasks());

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.clearCompleted();
    });

    expect(mockClearCompleted).toHaveBeenCalled();
    expect(mockGetTasks).toHaveBeenCalledTimes(2);
  });

  it("setTaskProject calls service and reloads", async () => {
    const { result } = renderHook(() => usePlannerTasks());

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.setTaskProject("t1", "proj-2");
    });

    expect(mockUpdateProject).toHaveBeenCalledWith("t1", "proj-2");
    expect(mockGetTasks).toHaveBeenCalledTimes(2);
  });

  it("handles load errors gracefully", async () => {
    mockGetTasks.mockRejectedValue(new Error("db error"));

    const { result } = renderHook(() => usePlannerTasks());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.tasks).toEqual([]);
  });
});
