import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockInvoke, mockChannel, resetTauriMocks } from "../../__test-utils__/tauri-mock";
import {
  spawnTerminal,
  writeToTerminal,
  resizeTerminal,
  closeTerminal,
  checkClaudeCli,
} from "../terminal-service";

beforeEach(() => {
  resetTauriMocks();
});

describe("terminal-service", () => {
  describe("spawnTerminal", () => {
    it("invokes spawn_terminal with correct args", async () => {
      mockInvoke.mockResolvedValue("term-123");
      const onEvent = vi.fn();

      const result = await spawnTerminal(
        "/home/user/project",
        true,
        "session-1",
        onEvent
      );

      expect(result).toBe("term-123");
      expect(mockInvoke).toHaveBeenCalledWith("spawn_terminal", {
        projectPath: "/home/user/project",
        isClaudeSession: true,
        sessionId: "session-1",
        initialCommand: null,
        systemPrompt: null,
        onEvent: expect.any(Object),
      });
    });

    it("passes initialCommand and systemPrompt when provided", async () => {
      mockInvoke.mockResolvedValue("term-456");
      const onEvent = vi.fn();

      await spawnTerminal(
        "/path",
        false,
        null,
        onEvent,
        "echo hello",
        "You are helpful"
      );

      expect(mockInvoke).toHaveBeenCalledWith("spawn_terminal", {
        projectPath: "/path",
        isClaudeSession: false,
        sessionId: null,
        initialCommand: "echo hello",
        systemPrompt: "You are helpful",
        onEvent: expect.any(Object),
      });
    });

    it("sets channel onmessage to the callback", async () => {
      mockInvoke.mockResolvedValue("term-789");
      const onEvent = vi.fn();

      await spawnTerminal("/path", false, null, onEvent);

      const channelInstance = mockChannel.mock.results[0].value;
      expect(channelInstance.onmessage).toBe(onEvent);
    });
  });

  describe("writeToTerminal", () => {
    it("invokes write_to_terminal with correct args", async () => {
      mockInvoke.mockResolvedValue(undefined);
      await writeToTerminal("term-123", "hello\n");
      expect(mockInvoke).toHaveBeenCalledWith("write_to_terminal", {
        terminalId: "term-123",
        data: "hello\n",
      });
    });
  });

  describe("resizeTerminal", () => {
    it("invokes resize_terminal with correct args", async () => {
      mockInvoke.mockResolvedValue(undefined);
      await resizeTerminal("term-123", 24, 80);
      expect(mockInvoke).toHaveBeenCalledWith("resize_terminal", {
        terminalId: "term-123",
        rows: 24,
        cols: 80,
      });
    });
  });

  describe("closeTerminal", () => {
    it("invokes close_terminal with correct args", async () => {
      mockInvoke.mockResolvedValue(undefined);
      await closeTerminal("term-123");
      expect(mockInvoke).toHaveBeenCalledWith("close_terminal", {
        terminalId: "term-123",
      });
    });
  });

  describe("checkClaudeCli", () => {
    it("invokes check_claude_cli and returns result", async () => {
      const expected = { available: true, path: "/usr/local/bin/claude" };
      mockInvoke.mockResolvedValue(expected);
      const result = await checkClaudeCli();
      expect(result).toEqual(expected);
      expect(mockInvoke).toHaveBeenCalledWith("check_claude_cli");
    });
  });
});
