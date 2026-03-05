import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TerminalTabBar } from "../Terminal/TerminalTabBar";
import type { TerminalTab } from "../../types/terminal";

const makeTabs = (count: number): TerminalTab[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `tab-${i}`,
    terminalId: `term-${i}`,
    label: `Project ${i}`,
    isClaudeSession: i % 2 === 0,
    projectPath: `/home/user/project-${i}`,
    projectName: `project-${i}`,
  }));

describe("TerminalTabBar", () => {
  it("renders Home tab", () => {
    render(
      <TerminalTabBar
        tabs={[]}
        activeTabId="home"
        splitMode={false}
        onSelectTab={vi.fn()}
        onCloseTab={vi.fn()}
        onToggleSplit={vi.fn()}
        onNewTerminal={vi.fn()}
        onNewClaudeSession={vi.fn()}
      />
    );
    expect(screen.getByText("Home")).toBeTruthy();
  });

  it("renders dynamic tabs", () => {
    const tabs = makeTabs(2);
    render(
      <TerminalTabBar
        tabs={tabs}
        activeTabId="tab-0"
        splitMode={false}
        onSelectTab={vi.fn()}
        onCloseTab={vi.fn()}
        onToggleSplit={vi.fn()}
        onNewTerminal={vi.fn()}
        onNewClaudeSession={vi.fn()}
      />
    );
    expect(screen.getByText("Project 0")).toBeTruthy();
    expect(screen.getByText("Project 1")).toBeTruthy();
  });

  it("shows split view button when 2+ terminal tabs exist", () => {
    const tabs = makeTabs(2);
    const { container } = render(
      <TerminalTabBar
        tabs={tabs}
        activeTabId="tab-0"
        splitMode={false}
        onSelectTab={vi.fn()}
        onCloseTab={vi.fn()}
        onToggleSplit={vi.fn()}
        onNewTerminal={vi.fn()}
        onNewClaudeSession={vi.fn()}
      />
    );
    expect(container.querySelector(".split-view-btn")).toBeTruthy();
  });

  it("hides split view button with fewer than 2 terminal tabs", () => {
    const tabs = makeTabs(1);
    const { container } = render(
      <TerminalTabBar
        tabs={tabs}
        activeTabId="tab-0"
        splitMode={false}
        onSelectTab={vi.fn()}
        onCloseTab={vi.fn()}
        onToggleSplit={vi.fn()}
        onNewTerminal={vi.fn()}
        onNewClaudeSession={vi.fn()}
      />
    );
    expect(container.querySelector(".split-view-btn")).toBeNull();
  });

  it("calls onNewClaudeSession when + Claude clicked", () => {
    const onNewClaudeSession = vi.fn();
    render(
      <TerminalTabBar
        tabs={[]}
        activeTabId="home"
        splitMode={false}
        onSelectTab={vi.fn()}
        onCloseTab={vi.fn()}
        onToggleSplit={vi.fn()}
        onNewTerminal={vi.fn()}
        onNewClaudeSession={onNewClaudeSession}
      />
    );
    fireEvent.click(screen.getByText("+ Claude"));
    expect(onNewClaudeSession).toHaveBeenCalled();
  });

  it("calls onNewTerminal when + Shell clicked", () => {
    const onNewTerminal = vi.fn();
    render(
      <TerminalTabBar
        tabs={[]}
        activeTabId="home"
        splitMode={false}
        onSelectTab={vi.fn()}
        onCloseTab={vi.fn()}
        onToggleSplit={vi.fn()}
        onNewTerminal={onNewTerminal}
        onNewClaudeSession={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText("+ Shell"));
    expect(onNewTerminal).toHaveBeenCalled();
  });
});
