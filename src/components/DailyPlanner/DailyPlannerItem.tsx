import { useMemo } from "react";
import type { PlannerTask } from "../../services/database-service";
import type { Project } from "../../types/project";
import { CustomSelect } from "../CustomSelect";

interface DailyPlannerItemProps {
  task: PlannerTask;
  projects: Project[];
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
  onSendToClaude: (text: string, projectPath?: string) => void;
  onSetProject: (id: string, projectId: string | null) => void;
}

export function DailyPlannerItem({
  task,
  projects,
  onToggle,
  onDelete,
  onSendToClaude,
  onSetProject,
}: DailyPlannerItemProps) {
  const isCompleted = task.completed === 1;
  const project = task.project_id
    ? projects.find((p) => p.id === task.project_id)
    : null;

  const projectOptions = useMemo(
    () => [
      { value: "", label: "No project" },
      ...projects.map((p) => ({ value: p.id, label: p.name })),
    ],
    [projects]
  );

  return (
    <div className={`planner-item ${isCompleted ? "completed" : ""}`}>
      <label className="planner-checkbox-wrap">
        <input
          type="checkbox"
          checked={isCompleted}
          onChange={() => onToggle(task.id, !isCompleted)}
          className="planner-checkbox"
        />
      </label>
      <span className={`planner-item-text ${isCompleted ? "completed" : ""}`}>
        {task.text}
      </span>
      {projects.length > 0 && (
        <CustomSelect
          className="planner-item-project-select"
          value={task.project_id || ""}
          options={projectOptions}
          onChange={(val) => onSetProject(task.id, val || null)}
          placeholder="No project"
          title="Assign to project"
          compact
        />
      )}
      <div className="planner-item-actions">
        <button
          className="planner-send-btn"
          onClick={() => onSendToClaude(task.text, project?.path)}
          title="Send to Claude"
        >
          &#9654;
        </button>
        <button
          className="planner-delete-btn"
          onClick={() => onDelete(task.id)}
          title="Delete task"
        >
          &times;
        </button>
      </div>
    </div>
  );
}
