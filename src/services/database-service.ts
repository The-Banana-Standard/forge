import Database from "@tauri-apps/plugin-sql";
import type { Project } from "../types/project";

let dbPromise: Promise<Awaited<ReturnType<typeof Database.load>>> | null = null;

async function getDb() {
  if (!dbPromise) {
    dbPromise = initDb();
  }
  return dbPromise;
}

async function initDb() {
  const db = await Database.load("sqlite:canopy.db");
  await db.execute(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        path TEXT NOT NULL UNIQUE,
        added_at TEXT NOT NULL DEFAULT (datetime('now')),
        last_opened TEXT,
        workspace_path TEXT
      )
    `);
    await db.execute(`
      CREATE TABLE IF NOT EXISTS workspaces (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        path TEXT NOT NULL UNIQUE,
        added_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    await db.execute(`
      CREATE TABLE IF NOT EXISTS planner_tasks (
        id TEXT PRIMARY KEY,
        text TEXT NOT NULL,
        completed INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        completed_at TEXT,
        project_id TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0
      )
    `);

    // Auto-cleanup: delete completed tasks older than 7 days
    try {
      await db.execute(
        "DELETE FROM planner_tasks WHERE completed = 1 AND completed_at IS NOT NULL AND completed_at < datetime('now', '-7 days')"
      );
    } catch (_) {
      // Non-critical — silently ignore cleanup failures
    }

    await db.execute(`
      CREATE TABLE IF NOT EXISTS provider_settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        provider TEXT NOT NULL DEFAULT 'direct',
        aws_region TEXT,
        aws_profile TEXT,
        gcp_project_id TEXT,
        gcp_region TEXT,
        model_override TEXT
      )
    `);

  return db;
}

// ── Projects ──

export async function getAllProjects(): Promise<Project[]> {
  const d = await getDb();
  return await d.select<Project[]>(
    "SELECT * FROM projects ORDER BY name COLLATE NOCASE ASC"
  );
}

export async function addProject(
  id: string,
  name: string,
  path: string,
  workspacePath?: string
): Promise<void> {
  const d = await getDb();
  await d.execute(
    "INSERT OR IGNORE INTO projects (id, name, path, workspace_path) VALUES ($1, $2, $3, $4)",
    [id, name, path, workspacePath || null]
  );
}

export async function updateLastOpened(id: string): Promise<void> {
  const d = await getDb();
  await d.execute(
    "UPDATE projects SET last_opened = datetime('now') WHERE id = $1",
    [id]
  );
}

export async function removeProject(id: string): Promise<void> {
  const d = await getDb();
  await d.execute("DELETE FROM projects WHERE id = $1", [id]);
}

// ── Workspaces ──

export interface Workspace {
  id: string;
  name: string;
  path: string;
  added_at: string;
}

export async function getAllWorkspaces(): Promise<Workspace[]> {
  const d = await getDb();
  return await d.select<Workspace[]>(
    "SELECT * FROM workspaces ORDER BY added_at DESC"
  );
}

export async function addWorkspace(id: string, name: string, path: string): Promise<void> {
  const d = await getDb();
  await d.execute(
    "INSERT OR IGNORE INTO workspaces (id, name, path) VALUES ($1, $2, $3)",
    [id, name, path]
  );
}

export async function removeWorkspace(id: string): Promise<void> {
  const d = await getDb();
  const ws = await d.select<Workspace[]>("SELECT * FROM workspaces WHERE id = $1", [id]);
  if (ws.length > 0) {
    await d.execute("DELETE FROM projects WHERE workspace_path = $1", [ws[0].path]);
    await d.execute("DELETE FROM workspaces WHERE id = $1", [id]);
  }
}

// ── Planner Tasks ──

export interface PlannerTask {
  id: string;
  text: string;
  completed: number;
  created_at: string;
  completed_at: string | null;
  project_id: string | null;
  sort_order: number;
}

export async function getPlannerTasks(): Promise<PlannerTask[]> {
  const d = await getDb();
  return await d.select<PlannerTask[]>(
    `SELECT * FROM planner_tasks
     WHERE completed = 0
        OR (completed = 1 AND completed_at > datetime('now', '-24 hours'))
     ORDER BY completed ASC, sort_order ASC, created_at ASC`
  );
}

export async function addPlannerTask(id: string, text: string, projectId?: string): Promise<void> {
  const d = await getDb();
  const rows = await d.select<{ max_order: number | null }[]>(
    "SELECT MAX(sort_order) as max_order FROM planner_tasks WHERE completed = 0"
  );
  const nextOrder = (rows[0]?.max_order ?? -1) + 1;
  await d.execute(
    "INSERT INTO planner_tasks (id, text, sort_order, project_id) VALUES ($1, $2, $3, $4)",
    [id, text, nextOrder, projectId || null]
  );
}

export async function togglePlannerTask(id: string, completed: boolean): Promise<void> {
  const d = await getDb();
  await d.execute(
    "UPDATE planner_tasks SET completed = $1, completed_at = $2 WHERE id = $3",
    [completed ? 1 : 0, completed ? new Date().toISOString() : null, id]
  );
}

export async function removePlannerTask(id: string): Promise<void> {
  const d = await getDb();
  await d.execute("DELETE FROM planner_tasks WHERE id = $1", [id]);
}

export async function clearCompletedPlannerTasks(): Promise<void> {
  const d = await getDb();
  await d.execute("DELETE FROM planner_tasks WHERE completed = 1");
}

export async function updatePlannerTaskProject(id: string, projectId: string | null): Promise<void> {
  const d = await getDb();
  await d.execute("UPDATE planner_tasks SET project_id = $1 WHERE id = $2", [projectId, id]);
}

// ── Provider Settings ──

export interface ProviderSettingsRow {
  provider: string;
  aws_region: string | null;
  aws_profile: string | null;
  gcp_project_id: string | null;
  gcp_region: string | null;
  model_override: string | null;
}

export async function getProviderSettings(): Promise<ProviderSettingsRow | null> {
  const d = await getDb();
  const rows = await d.select<ProviderSettingsRow[]>(
    "SELECT provider, aws_region, aws_profile, gcp_project_id, gcp_region, model_override FROM provider_settings WHERE id = 1"
  );
  return rows.length > 0 ? rows[0] : null;
}

export async function saveProviderSettings(settings: ProviderSettingsRow): Promise<void> {
  const d = await getDb();
  await d.execute(
    `INSERT INTO provider_settings (id, provider, aws_region, aws_profile, gcp_project_id, gcp_region, model_override)
     VALUES (1, $1, $2, $3, $4, $5, $6)
     ON CONFLICT(id) DO UPDATE SET
       provider = $1, aws_region = $2, aws_profile = $3,
       gcp_project_id = $4, gcp_region = $5, model_override = $6`,
    [settings.provider, settings.aws_region, settings.aws_profile,
     settings.gcp_project_id, settings.gcp_region, settings.model_override]
  );
}
