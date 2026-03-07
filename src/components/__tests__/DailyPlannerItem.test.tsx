import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DailyPlannerItem } from "../DailyPlanner/DailyPlannerItem";
import type { PlannerTask } from "../../services/database-service";
import type { Project } from "../../types/project";

const baseTask: PlannerTask = {
  id: "task-1",
  text: "Fix the sidebar layout",
  completed: 0,
  created_at: "2025-01-01T00:00:00Z",
  completed_at: null,
  project_id: null,
  sort_order: 0,
};

const projects: Project[] = [
  {
    id: "proj-1",
    name: "My App",
    path: "/home/user/myapp",
    added_at: "2025-01-01",
    last_opened: null,
    workspace_path: null,
  },
];

describe("DailyPlannerItem", () => {
  it("renders task text", () => {
    render(
      <DailyPlannerItem
        task={baseTask}
        projects={[]}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onSendToClaude={vi.fn()}
        onSetProject={vi.fn()}
      />
    );
    expect(screen.getByText("Fix the sidebar layout")).toBeTruthy();
  });

  it("renders unchecked checkbox for incomplete task", () => {
    const { container } = render(
      <DailyPlannerItem
        task={baseTask}
        projects={[]}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onSendToClaude={vi.fn()}
        onSetProject={vi.fn()}
      />
    );
    const checkbox = container.querySelector(
      'input[type="checkbox"]'
    ) as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
  });

  it("renders checked checkbox for completed task", () => {
    const completedTask = { ...baseTask, completed: 1 };
    const { container } = render(
      <DailyPlannerItem
        task={completedTask}
        projects={[]}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onSendToClaude={vi.fn()}
        onSetProject={vi.fn()}
      />
    );
    const checkbox = container.querySelector(
      'input[type="checkbox"]'
    ) as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });

  it("calls onToggle when checkbox clicked", () => {
    const onToggle = vi.fn();
    const { container } = render(
      <DailyPlannerItem
        task={baseTask}
        projects={[]}
        onToggle={onToggle}
        onDelete={vi.fn()}
        onSendToClaude={vi.fn()}
        onSetProject={vi.fn()}
      />
    );
    const checkbox = container.querySelector(
      'input[type="checkbox"]'
    ) as HTMLInputElement;
    fireEvent.click(checkbox);
    expect(onToggle).toHaveBeenCalledWith("task-1", true);
  });

  it("calls onDelete when delete button clicked", () => {
    const onDelete = vi.fn();
    render(
      <DailyPlannerItem
        task={baseTask}
        projects={[]}
        onToggle={vi.fn()}
        onDelete={onDelete}
        onSendToClaude={vi.fn()}
        onSetProject={vi.fn()}
      />
    );
    fireEvent.click(screen.getByTitle("Delete task"));
    expect(onDelete).toHaveBeenCalledWith("task-1");
  });

  it("calls onSendToClaude when send button clicked", () => {
    const onSendToClaude = vi.fn();
    render(
      <DailyPlannerItem
        task={baseTask}
        projects={[]}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onSendToClaude={onSendToClaude}
        onSetProject={vi.fn()}
      />
    );
    fireEvent.click(screen.getByTitle("Send to Claude"));
    expect(onSendToClaude).toHaveBeenCalledWith("Fix the sidebar layout", undefined);
  });

  it("shows project select when projects are provided", () => {
    const { container } = render(
      <DailyPlannerItem
        task={baseTask}
        projects={projects}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onSendToClaude={vi.fn()}
        onSetProject={vi.fn()}
      />
    );
    const customSelect = container.querySelector(".custom-select");
    expect(customSelect).toBeTruthy();
  });

  it("hides project select when no projects", () => {
    const { container } = render(
      <DailyPlannerItem
        task={baseTask}
        projects={[]}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onSendToClaude={vi.fn()}
        onSetProject={vi.fn()}
      />
    );
    expect(container.querySelector(".custom-select")).toBeNull();
  });

  it("calls onSetProject when project selection changes", () => {
    const onSetProject = vi.fn();
    render(
      <DailyPlannerItem
        task={baseTask}
        projects={projects}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onSendToClaude={vi.fn()}
        onSetProject={onSetProject}
      />
    );
    // Open the dropdown
    fireEvent.click(screen.getByText("No project"));
    // Select "My App"
    fireEvent.click(screen.getByText("My App"));
    expect(onSetProject).toHaveBeenCalledWith("task-1", "proj-1");
  });

  it("sends project path to Claude when task has assigned project", () => {
    const onSendToClaude = vi.fn();
    const taskWithProject = { ...baseTask, project_id: "proj-1" };
    render(
      <DailyPlannerItem
        task={taskWithProject}
        projects={projects}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onSendToClaude={onSendToClaude}
        onSetProject={vi.fn()}
      />
    );
    fireEvent.click(screen.getByTitle("Send to Claude"));
    expect(onSendToClaude).toHaveBeenCalledWith(
      "Fix the sidebar layout",
      "/home/user/myapp"
    );
  });

  it("adds completed class when task is done", () => {
    const completedTask = { ...baseTask, completed: 1 };
    const { container } = render(
      <DailyPlannerItem
        task={completedTask}
        projects={[]}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onSendToClaude={vi.fn()}
        onSetProject={vi.fn()}
      />
    );
    expect(container.querySelector(".planner-item.completed")).toBeTruthy();
  });
});
