import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useClaudeSessions } from "../useClaudeSessions";

const mockGetSessions = vi.fn();
vi.mock("../../services/claude-data-service", () => ({
  getSessionsForProject: (...args: unknown[]) => mockGetSessions(...args),
}));

beforeEach(() => {
  mockGetSessions.mockReset();
});

describe("useClaudeSessions", () => {
  it("returns empty sessions when projectPath is null", async () => {
    const { result } = renderHook(() => useClaudeSessions(null));

    expect(result.current.sessions).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(mockGetSessions).not.toHaveBeenCalled();
  });

  it("fetches sessions for a valid projectPath", async () => {
    const sessions = [
      { sessionId: "s1", summary: "Test", firstPrompt: null, messageCount: 5, modified: null, gitBranch: null, projectPath: "/proj" },
    ];
    mockGetSessions.mockResolvedValue(sessions);

    const { result } = renderHook(() => useClaudeSessions("/home/user/proj"));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.sessions).toEqual(sessions);
    expect(mockGetSessions).toHaveBeenCalledWith("/home/user/proj");
  });

  it("clears sessions when projectPath changes to null", async () => {
    mockGetSessions.mockResolvedValue([{ sessionId: "s1", summary: "x", firstPrompt: null, messageCount: 1, modified: null, gitBranch: null, projectPath: "/a" }]);

    const { result, rerender } = renderHook(
      ({ path }: { path: string | null }) => useClaudeSessions(path),
      { initialProps: { path: "/home/user/proj" as string | null } }
    );

    await waitFor(() => {
      expect(result.current.sessions).toHaveLength(1);
    });

    rerender({ path: null });

    expect(result.current.sessions).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it("handles fetch errors gracefully", async () => {
    mockGetSessions.mockRejectedValue(new Error("fetch failed"));

    const { result } = renderHook(() => useClaudeSessions("/proj"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.sessions).toEqual([]);
  });

  it("ignores stale responses when projectPath changes quickly", async () => {
    let resolveFirst: (v: unknown) => void;
    const firstCall = new Promise((r) => { resolveFirst = r; });
    const secondResult = [{ sessionId: "s2", summary: "second", firstPrompt: null, messageCount: 1, modified: null, gitBranch: null, projectPath: "/b" }];

    mockGetSessions
      .mockImplementationOnce(() => firstCall)
      .mockResolvedValueOnce(secondResult);

    const { result, rerender } = renderHook(
      ({ path }: { path: string }) => useClaudeSessions(path),
      { initialProps: { path: "/proj-a" } }
    );

    // Quickly switch to a different project
    rerender({ path: "/proj-b" });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should show second project's sessions, not first
    expect(result.current.sessions).toEqual(secondResult);

    // Now resolve the stale first request — should be ignored
    resolveFirst!([{ sessionId: "s1", summary: "stale", firstPrompt: null, messageCount: 1, modified: null, gitBranch: null, projectPath: "/a" }]);

    // Still shows second project's data
    expect(result.current.sessions).toEqual(secondResult);
  });
});
