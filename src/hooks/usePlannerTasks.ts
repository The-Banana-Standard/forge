import { useState, useEffect, useCallback } from "react";
import {
  getPlannerTasks,
  addPlannerTask,
  togglePlannerTask,
  removePlannerTask,
  clearCompletedPlannerTasks,
  updatePlannerTaskProject,
  type PlannerTask,
} from "../services/database-service";

export function usePlannerTasks() {
  const [tasks, setTasks] = useState<PlannerTask[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTasks = useCallback(async () => {
    try {
      const t = await getPlannerTasks();
      setTasks(t);
    } catch (err) {
      console.error("Failed to load planner tasks:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Refresh on window focus so tasks stay in sync
  useEffect(() => {
    const onFocus = () => loadTasks();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loadTasks]);

  const addTask = useCallback(
    async (text: string, projectId?: string) => {
      const id = crypto.randomUUID();
      await addPlannerTask(id, text, projectId);
      await loadTasks();
    },
    [loadTasks]
  );

  const setTaskProject = useCallback(
    async (id: string, projectId: string | null) => {
      await updatePlannerTaskProject(id, projectId);
      await loadTasks();
    },
    [loadTasks]
  );

  const toggleTask = useCallback(
    async (id: string, completed: boolean) => {
      await togglePlannerTask(id, completed);
      await loadTasks();
    },
    [loadTasks]
  );

  const deleteTask = useCallback(
    async (id: string) => {
      await removePlannerTask(id);
      await loadTasks();
    },
    [loadTasks]
  );

  const clearCompleted = useCallback(async () => {
    await clearCompletedPlannerTasks();
    await loadTasks();
  }, [loadTasks]);

  return { tasks, loading, addTask, toggleTask, deleteTask, clearCompleted, setTaskProject };
}
