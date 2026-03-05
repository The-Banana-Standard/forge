import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { GitHubData } from "../types/github";

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export function useGitHub(projectPaths: string[]) {
  const [data, setData] = useState<GitHubData | null>(null);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Stabilize projectPaths by value
  const stablePathsRef = useRef(projectPaths);
  const serialized = JSON.stringify(projectPaths);
  const prevSerialized = useRef(serialized);
  if (prevSerialized.current !== serialized) {
    prevSerialized.current = serialized;
    stablePathsRef.current = projectPaths;
  }
  const stablePaths = stablePathsRef.current;

  const refresh = useCallback(async () => {
    if (stablePaths.length === 0) {
      setData({ prs: [], issues: [], error: null });
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result = await invoke<GitHubData>("get_github_items", { projectPaths: stablePaths });
      setData(result);
    } catch (err) {
      setData({
        prs: [],
        issues: [],
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setLoading(false);
    }
  }, [stablePaths]);

  // Initial fetch + polling
  useEffect(() => {
    refresh();

    intervalRef.current = setInterval(refresh, POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refresh]);

  // Refresh on window focus (user returning to app)
  useEffect(() => {
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  return { data, loading, refresh };
}
