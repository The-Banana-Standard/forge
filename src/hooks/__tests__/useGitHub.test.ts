import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { mockInvoke, resetTauriMocks } from "../../__test-utils__/tauri-mock";
import { useGitHub } from "../useGitHub";

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  resetTauriMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useGitHub", () => {
  it("empty project paths returns empty data immediately", async () => {
    const { result } = renderHook(() => useGitHub([]));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual({ prs: [], issues: [], error: null });
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it("calls invoke with correct command and args", async () => {
    mockInvoke.mockResolvedValue({ prs: [], issues: [], error: null });

    const paths = ["/home/user/project1"];
    const { result } = renderHook(() => useGitHub(paths));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockInvoke).toHaveBeenCalledWith("get_github_items", {
      projectPaths: paths,
    });
  });

  it("sets loading during fetch", async () => {
    let resolveInvoke: (value: unknown) => void;
    mockInvoke.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveInvoke = resolve;
        })
    );

    const { result } = renderHook(() => useGitHub(["/some/path"]));

    expect(result.current.loading).toBe(true);

    await act(async () => {
      resolveInvoke!({ prs: [], issues: [], error: null });
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it("handles invoke rejection gracefully", async () => {
    mockInvoke.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useGitHub(["/some/path"]));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual({
      prs: [],
      issues: [],
      error: "Network error",
    });
  });

  it("handles string rejection (non-Error)", async () => {
    mockInvoke.mockRejectedValue("plain string error");

    const { result } = renderHook(() => useGitHub(["/some/path"]));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual({
      prs: [],
      issues: [],
      error: "plain string error",
    });
  });

  it("polls at 5 minute intervals", async () => {
    mockInvoke.mockResolvedValue({ prs: [], issues: [], error: null });

    renderHook(() => useGitHub(["/some/path"]));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      vi.advanceTimersByTime(5 * 60 * 1000);
    });

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledTimes(2);
    });
  });

  it("cleans up interval on unmount", async () => {
    mockInvoke.mockResolvedValue({ prs: [], issues: [], error: null });

    const { unmount } = renderHook(() => useGitHub(["/some/path"]));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledTimes(1);
    });

    unmount();

    vi.advanceTimersByTime(5 * 60 * 1000);

    expect(mockInvoke).toHaveBeenCalledTimes(1);
  });

  it("refreshes on window focus", async () => {
    mockInvoke.mockResolvedValue({ prs: [], issues: [], error: null });

    const { unmount } = renderHook(() => useGitHub(["/some/path"]));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      window.dispatchEvent(new Event("focus"));
    });

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledTimes(2);
    });

    unmount();
  });

  it("stablePaths prevents unnecessary re-fetches", async () => {
    mockInvoke.mockResolvedValue({ prs: [], issues: [], error: null });

    const paths = ["/home/user/project"];
    const { rerender } = renderHook(
      ({ p }: { p: string[] }) => useGitHub(p),
      { initialProps: { p: paths } }
    );

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledTimes(1);
    });

    rerender({ p: ["/home/user/project"] });

    vi.advanceTimersByTime(100);

    expect(mockInvoke).toHaveBeenCalledTimes(1);
  });
});
