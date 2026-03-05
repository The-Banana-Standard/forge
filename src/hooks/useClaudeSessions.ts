import { useState, useEffect, useRef } from "react";
import type { ClaudeSession } from "../types/claude-session";
import { getSessionsForProject } from "../services/claude-data-service";

export function useClaudeSessions(projectPath: string | null) {
  const [sessions, setSessions] = useState<ClaudeSession[]>([]);
  const [loading, setLoading] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    if (!projectPath) {
      setSessions([]);
      setLoading(false);
      return;
    }

    const currentRequest = ++requestId.current;
    setLoading(true);
    setSessions([]); // Clear while loading

    getSessionsForProject(projectPath)
      .then((data) => {
        // Only update if this is still the current request
        if (currentRequest === requestId.current) {
          setSessions(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Failed to load sessions:", err);
        if (currentRequest === requestId.current) {
          setSessions([]);
          setLoading(false);
        }
      });
  }, [projectPath]);

  return { sessions, loading };
}
