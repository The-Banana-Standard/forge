import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { SKILL_CATALOG } from "../data/skill-catalog";
import type { CatalogSkill, InstalledSkillStatus, InstallResult } from "../types/skill-catalog";

export function useSkillStore() {
  const [statuses, setStatuses] = useState<Map<string, boolean>>(new Map());
  const [installing, setInstalling] = useState<Set<string>>(new Set());

  const checkStatuses = useCallback(async () => {
    try {
      const skillIds: [string, string][] = SKILL_CATALOG.map((s) => [s.id, s.format]);
      const results = await invoke<InstalledSkillStatus[]>("check_skills_installed", { skillIds });
      const map = new Map<string, boolean>();
      for (const r of results) {
        map.set(r.id, r.installed);
      }
      setStatuses(map);
    } catch {
      // Silently fail — statuses will show as not installed
    }
  }, []);

  useEffect(() => {
    checkStatuses();
  }, [checkStatuses]);

  const install = useCallback(async (skill: CatalogSkill) => {
    setInstalling((prev) => new Set(prev).add(skill.id));
    try {
      const result = await invoke<InstallResult>("install_skill", {
        id: skill.id,
        sourceUrl: skill.sourceUrl,
        format: skill.format,
      });
      if (!result.success) {
        throw new Error(result.error || "Install failed");
      }
      await checkStatuses();
    } finally {
      setInstalling((prev) => {
        const next = new Set(prev);
        next.delete(skill.id);
        return next;
      });
    }
  }, [checkStatuses]);

  const uninstall = useCallback(async (skill: CatalogSkill) => {
    try {
      const result = await invoke<InstallResult>("uninstall_skill", {
        id: skill.id,
        format: skill.format,
      });
      if (!result.success) {
        throw new Error(result.error || "Uninstall failed");
      }
      await checkStatuses();
    } catch {
      // Silently fail
    }
  }, [checkStatuses]);

  return {
    catalog: SKILL_CATALOG,
    statuses,
    installing,
    install,
    uninstall,
    refresh: checkStatuses,
  };
}
