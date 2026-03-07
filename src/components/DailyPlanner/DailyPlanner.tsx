import { useState, type KeyboardEvent, useMemo } from "react";
import type { Project } from "../../types/project";
import { usePlannerTasks } from "../../hooks/usePlannerTasks";
import { DailyPlannerItem } from "./DailyPlannerItem";
import { CustomSelect } from "../CustomSelect";

interface DailyPlannerProps {
  projects: Project[];
  onSendToClaude: (text: string, projectPath?: string) => void;
}

export function DailyPlanner({ projects, onSendToClaude }: DailyPlannerProps) {
  const { tasks, loading, addTask, toggleTask, deleteTask, clearCompleted, setTaskProject } =
    usePlannerTasks();
  const [inputValue, setInputValue] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  const hasCompleted = tasks.some((t) => t.completed === 1);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      addTask(inputValue.trim(), selectedProjectId || undefined);
      setInputValue("");
    }
  };

  const projectOptions = useMemo(
    () => [
      { value: "", label: "No project" },
      ...projects.map((p) => ({ value: p.id, label: p.name })),
    ],
    [projects]
  );

  if (loading) return null;

  return (
    <div className="planner-section">
      <div className="planner-header">
        <h3 className="dash-section-title">Daily Planner</h3>
        {hasCompleted && (
          <button className="planner-clear-btn" onClick={clearCompleted}>
            Clear completed
          </button>
        )}
      </div>
      <div className="planner-input-row">
        <input
          type="text"
          className="planner-input"
          placeholder="Add a task for today..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        {projects.length > 0 && (
          <CustomSelect
            className="planner-project-select"
            value={selectedProjectId}
            options={projectOptions}
            onChange={setSelectedProjectId}
            placeholder="No project"
            title="Assign to project"
          />
        )}
      </div>
      {tasks.length > 0 && (
        <div className="planner-list">
          {tasks.map((task) => (
            <DailyPlannerItem
              key={task.id}
              task={task}
              projects={projects}
              onToggle={toggleTask}
              onDelete={deleteTask}
              onSendToClaude={onSendToClaude}
              onSetProject={setTaskProject}
            />
          ))}
        </div>
      )}
    </div>
  );
}
