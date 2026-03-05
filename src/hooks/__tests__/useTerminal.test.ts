import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTerminal, HOME_TAB_ID } from "../useTerminal";
import { closeTerminal } from "../../services/terminal-service";

// Mock terminal-service
vi.mock("../../services/terminal-service", () => ({
  closeTerminal: vi.fn(() => Promise.resolve()),
}));

// Spy on crypto.randomUUID instead of replacing the entire object
let uuidCounter = 0;

beforeEach(() => {
  uuidCounter = 0;
  vi.spyOn(crypto, "randomUUID").mockImplementation(() => `uuid-${++uuidCounter}` as `${string}-${string}-${string}-${string}-${string}`);
  vi.mocked(closeTerminal).mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useTerminal", () => {
  it("starts with empty tabs and HOME active", () => {
    const { result } = renderHook(() => useTerminal());
    expect(result.current.tabs).toEqual([]);
    expect(result.current.activeTabId).toBe(HOME_TAB_ID);
  });

  it("addTab creates tab with correct fields", () => {
    const { result } = renderHook(() => useTerminal());

    act(() => {
      result.current.addTab("/home/user/myproject", true);
    });

    expect(result.current.tabs).toHaveLength(1);
    const tab = result.current.tabs[0];
    expect(tab.label).toBe("myproject");
    expect(tab.projectPath).toBe("/home/user/myproject");
    expect(tab.isClaudeSession).toBe(true);
    expect(tab.terminalId).toBeNull();
    expect(tab.projectName).toBe("myproject");
  });

  it("addTab adds numeric suffix for duplicates", () => {
    const { result } = renderHook(() => useTerminal());

    act(() => {
      result.current.addTab("/home/user/myproject", true);
    });
    act(() => {
      result.current.addTab("/home/user/myproject", true);
    });

    expect(result.current.tabs[0].label).toBe("myproject");
    expect(result.current.tabs[1].label).toBe("myproject 2");
  });

  it("addTab sets new tab as active", () => {
    const { result } = renderHook(() => useTerminal());

    let tabId: string = "";
    act(() => {
      tabId = result.current.addTab("/home/user/proj", false);
    });

    expect(result.current.activeTabId).toBe(tabId);
  });

  it("addTab with initialPrompt uses project name as label", () => {
    const { result } = renderHook(() => useTerminal());

    act(() => {
      result.current.addTab("/home/user/myproject", true, undefined, "help me fix this");
    });

    expect(result.current.tabs[0].label).toBe("myproject");
    expect(result.current.tabs[0].initialPrompt).toBe("help me fix this");
  });

  it("addTab with slash-command initialPrompt uses command as label", () => {
    const { result } = renderHook(() => useTerminal());

    act(() => {
      result.current.addTab("/home/user/myproject", true, undefined, "/review-pr");
    });

    expect(result.current.tabs[0].label).toBe("/review-pr");
  });

  it("removeTab switches active to HOME", async () => {
    const { result } = renderHook(() => useTerminal());

    let tabId: string = "";
    act(() => {
      tabId = result.current.addTab("/home/user/proj", false);
    });
    expect(result.current.activeTabId).toBe(tabId);

    await act(async () => {
      await result.current.removeTab(tabId);
    });

    expect(result.current.activeTabId).toBe(HOME_TAB_ID);
    expect(result.current.tabs).toHaveLength(0);
  });

  it("removeTab calls closeTerminal when tab has a terminal", async () => {
    const { result } = renderHook(() => useTerminal());

    let tabId: string = "";
    act(() => {
      tabId = result.current.addTab("/home/user/proj", true);
    });
    act(() => {
      result.current.setTerminalId(tabId, "term-99");
    });

    await act(async () => {
      await result.current.removeTab(tabId);
    });

    expect(closeTerminal).toHaveBeenCalledWith("term-99");
  });

  it("removeTab on HOME does nothing", async () => {
    const { result } = renderHook(() => useTerminal());

    act(() => {
      result.current.addTab("/home/user/proj", false);
    });
    const tabsBefore = result.current.tabs.length;

    await act(async () => {
      await result.current.removeTab(HOME_TAB_ID);
    });

    expect(result.current.tabs).toHaveLength(tabsBefore);
  });

  it("markTabDead sets dead flag on correct tab", () => {
    const { result } = renderHook(() => useTerminal());

    let tabId: string = "";
    act(() => {
      tabId = result.current.addTab("/home/user/proj", true);
    });

    act(() => {
      result.current.markTabDead(tabId);
    });

    expect(result.current.tabs[0].dead).toBe(true);
  });

  it("setTerminalId links terminal to tab", () => {
    const { result } = renderHook(() => useTerminal());

    let tabId: string = "";
    act(() => {
      tabId = result.current.addTab("/home/user/proj", true);
    });

    act(() => {
      result.current.setTerminalId(tabId, "term-42");
    });

    expect(result.current.tabs[0].terminalId).toBe("term-42");
  });

  it("openProjectTab creates new overview tab", () => {
    const { result } = renderHook(() => useTerminal());

    act(() => {
      result.current.openProjectTab("/home/user/proj");
    });

    expect(result.current.tabs).toHaveLength(1);
    const tab = result.current.tabs[0];
    expect(tab.isProjectOverview).toBe(true);
    expect(tab.projectPath).toBe("/home/user/proj");
    expect(tab.label).toBe("proj");
  });

  it("openProjectTab reuses existing overview", () => {
    const { result } = renderHook(() => useTerminal());

    act(() => {
      result.current.openProjectTab("/home/user/proj");
    });
    expect(result.current.tabs).toHaveLength(1);

    act(() => {
      result.current.openProjectTab("/home/user/proj");
    });
    // Should still be 1 tab, not 2
    expect(result.current.tabs).toHaveLength(1);
  });

  it("goHome sets activeTabId to HOME", () => {
    const { result } = renderHook(() => useTerminal());

    act(() => {
      result.current.addTab("/home/user/proj", false);
    });
    expect(result.current.activeTabId).not.toBe(HOME_TAB_ID);

    act(() => {
      result.current.goHome();
    });
    expect(result.current.activeTabId).toBe(HOME_TAB_ID);
  });

  it("toggleSplit toggles split mode", () => {
    const { result } = renderHook(() => useTerminal());

    expect(result.current.splitMode).toBe(false);

    act(() => {
      result.current.toggleSplit();
    });
    expect(result.current.splitMode).toBe(true);

    act(() => {
      result.current.toggleSplit();
    });
    expect(result.current.splitMode).toBe(false);
  });

  it("addWorkspaceAgentTab creates agent tab with label", () => {
    const { result } = renderHook(() => useTerminal());

    act(() => {
      result.current.addWorkspaceAgentTab("/workspace", "context here");
    });

    expect(result.current.tabs).toHaveLength(1);
    const tab = result.current.tabs[0];
    expect(tab.label).toBe("Workspace Agent");
    expect(tab.isWorkspaceAgent).toBe(true);
    expect(tab.isClaudeSession).toBe(true);
    expect(tab.workspaceContext).toBe("context here");
  });
});
