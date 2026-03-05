export interface CatalogSkill {
  id: string;
  name: string;
  description: string;
  category: "Documents" | "Development" | "Design" | "Productivity" | "Workflow";
  author: string;
  sourceUrl: string;
  repoUrl: string;
  format: "skill" | "command";
  featured: boolean;
}

export interface InstalledSkillStatus {
  id: string;
  installed: boolean;
}

export interface InstallResult {
  success: boolean;
  id: string;
  installedPath: string | null;
  error: string | null;
}
