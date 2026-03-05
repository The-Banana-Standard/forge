import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { mockInvoke, resetTauriMocks } from "../../__test-utils__/tauri-mock";
import { useSkillStore } from "../useSkillStore";
import type { CatalogSkill } from "../../types/skill-catalog";

beforeEach(() => {
  resetTauriMocks();
  // Default: all invoke calls resolve to empty array (covers checkStatuses on mount)
  mockInvoke.mockResolvedValue([]);
});

const testSkill: CatalogSkill = {
  id: "test-skill",
  name: "Test Skill",
  description: "A test skill",
  category: "Development",
  author: "Test",
  sourceUrl: "https://raw.githubusercontent.com/test/SKILL.md",
  repoUrl: "https://github.com/test",
  format: "skill",
  featured: false,
};

describe("useSkillStore", () => {
  it("checks installed statuses on mount", async () => {
    const { result } = renderHook(() => useSkillStore());

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("check_skills_installed", {
        skillIds: expect.any(Array),
      });
    });

    expect(result.current.catalog).toBeDefined();
    expect(result.current.catalog.length).toBeGreaterThan(0);
  });

  it("populates statuses map from check response", async () => {
    mockInvoke.mockResolvedValue([
      { id: "pdf", installed: true },
      { id: "xlsx", installed: false },
    ]);

    const { result } = renderHook(() => useSkillStore());

    await waitFor(() => {
      expect(result.current.statuses.size).toBeGreaterThan(0);
    });

    expect(result.current.statuses.get("pdf")).toBe(true);
    expect(result.current.statuses.get("xlsx")).toBe(false);
  });

  it("install calls invoke and refreshes statuses", async () => {
    const { result } = renderHook(() => useSkillStore());

    // Wait for initial checkStatuses to complete
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledTimes(1);
    });

    // Set up responses for install + refresh
    mockInvoke
      .mockResolvedValueOnce({ success: true, id: "test-skill", installedPath: "/path", error: null })
      .mockResolvedValueOnce([{ id: "test-skill", installed: true }]);

    await act(async () => {
      await result.current.install(testSkill);
    });

    expect(mockInvoke).toHaveBeenCalledWith("install_skill", {
      id: "test-skill",
      sourceUrl: testSkill.sourceUrl,
      format: "skill",
    });
    // 1 (initial check) + 1 (install) + 1 (refresh check) = 3
    expect(mockInvoke).toHaveBeenCalledTimes(3);
  });

  it("install clears installing state after completion", async () => {
    const { result } = renderHook(() => useSkillStore());

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledTimes(1);
    });

    mockInvoke
      .mockResolvedValueOnce({ success: true, id: "test-skill", installedPath: null, error: null })
      .mockResolvedValueOnce([]);

    await act(async () => {
      await result.current.install(testSkill);
    });

    // After install completes, installing set should not contain the skill
    expect(result.current.installing.has("test-skill")).toBe(false);
  });

  it("uninstall calls invoke and refreshes", async () => {
    const { result } = renderHook(() => useSkillStore());

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledTimes(1);
    });

    mockInvoke
      .mockResolvedValueOnce({ success: true, id: "test-skill", installedPath: null, error: null })
      .mockResolvedValueOnce([]);

    await act(async () => {
      await result.current.uninstall(testSkill);
    });

    expect(mockInvoke).toHaveBeenCalledWith("uninstall_skill", {
      id: "test-skill",
      format: "skill",
    });
  });

  it("handles checkStatuses failure silently", async () => {
    mockInvoke.mockRejectedValue(new Error("network error"));

    const { result } = renderHook(() => useSkillStore());

    // Should not throw; wait a tick for the rejected promise to settle
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalled();
    });

    // Statuses remain empty on failure
    expect(result.current.statuses.size).toBe(0);
  });
});
