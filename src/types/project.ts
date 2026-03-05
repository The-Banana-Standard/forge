export interface Project {
  id: string;
  name: string;
  path: string;
  added_at: string;
  last_opened: string | null;
  workspace_path: string | null;
}

export interface DirectoryEntry {
  name: string;
  path: string;
  isGitRepo: boolean;
  hasClaudeMd: boolean;
}
