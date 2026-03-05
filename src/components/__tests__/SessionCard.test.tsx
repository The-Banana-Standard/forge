import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SessionCard } from "../ProjectSummary/SessionCard";
import type { ClaudeSession } from "../../types/claude-session";

// Freeze time so relative date formatting is deterministic
const NOW = new Date("2025-06-15T12:00:00Z");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

function makeSession(overrides: Partial<ClaudeSession> = {}): ClaudeSession {
  return {
    sessionId: "sess-1",
    summary: "Fixed login bug",
    firstPrompt: "Fix the login bug",
    messageCount: 12,
    modified: new Date(NOW.getTime() - 2 * 60 * 60 * 1000).toISOString(), // 2h ago
    gitBranch: "fix/login",
    projectPath: "/home/user/project",
    ...overrides,
  };
}

describe("SessionCard", () => {
  it("renders summary text", () => {
    render(<SessionCard session={makeSession()} onResume={vi.fn()} />);
    expect(screen.getByText("Fixed login bug")).toBeTruthy();
  });

  it("renders git branch when present", () => {
    render(<SessionCard session={makeSession()} onResume={vi.fn()} />);
    expect(screen.getByText("fix/login")).toBeTruthy();
  });

  it("renders message count", () => {
    render(<SessionCard session={makeSession()} onResume={vi.fn()} />);
    expect(screen.getByText("12 messages")).toBeTruthy();
  });

  it("shows firstPrompt when summary is absent", () => {
    const session = makeSession({ summary: null, firstPrompt: "Help me debug this" });
    render(<SessionCard session={session} onResume={vi.fn()} />);
    expect(screen.getByText("Help me debug this")).toBeTruthy();
  });

  it("calls onResume with sessionId when clicked", () => {
    const onResume = vi.fn();
    const { container } = render(
      <SessionCard session={makeSession()} onResume={onResume} />
    );
    const card = container.querySelector(".session-card");
    expect(card).not.toBeNull();
    fireEvent.click(card!);
    expect(onResume).toHaveBeenCalledWith("sess-1");
  });

  it("shows 'Click to resume' when sessionId exists", () => {
    render(<SessionCard session={makeSession()} onResume={vi.fn()} />);
    expect(screen.getByText("Click to resume")).toBeTruthy();
  });

  it("hides branch when not present", () => {
    const session = makeSession({ gitBranch: null });
    const { container } = render(
      <SessionCard session={session} onResume={vi.fn()} />
    );
    expect(container.querySelector(".session-branch")).toBeNull();
  });

  it("formats recent dates as relative time", () => {
    render(<SessionCard session={makeSession()} onResume={vi.fn()} />);
    expect(screen.getByText("2h ago")).toBeTruthy();
  });
});
