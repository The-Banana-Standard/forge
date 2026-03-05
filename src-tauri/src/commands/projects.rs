use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};

use super::claude_data;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DirectoryEntry {
    pub name: String,
    pub path: String,
    pub is_git_repo: bool,
    pub has_claude_md: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectInfo {
    pub name: String,
    pub path: String,
    pub description: Option<String>,
    pub tech_stack: Vec<String>,
    pub claude_md: Option<String>,
    pub tasks_md: Option<String>,
    pub readme_excerpt: Option<String>,
    pub is_git_repo: bool,
    pub git_branch: Option<String>,
    pub last_commit: Option<String>,
}

#[tauri::command]
pub fn scan_workspace(workspace_path: String) -> Result<Vec<DirectoryEntry>, String> {
    let path = PathBuf::from(&workspace_path);
    if !path.is_dir() {
        return Err(format!("Not a directory: {}", workspace_path));
    }

    let mut entries: Vec<DirectoryEntry> = Vec::new();

    let read_dir = fs::read_dir(&path)
        .map_err(|e| format!("Failed to read directory: {}", e))?;

    for entry in read_dir.flatten() {
        let entry_path = entry.path();
        if !entry_path.is_dir() {
            continue;
        }

        let name = entry.file_name().to_string_lossy().to_string();
        if name.starts_with('.') {
            continue;
        }

        let full_path = entry_path.to_string_lossy().to_string();
        let is_git_repo = entry_path.join(".git").exists();
        let has_claude_md = entry_path.join("CLAUDE.md").exists();

        entries.push(DirectoryEntry {
            name,
            path: full_path,
            is_git_repo,
            has_claude_md,
        });
    }

    entries.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    Ok(entries)
}

#[tauri::command]
pub fn get_project_info(project_path: String) -> Result<ProjectInfo, String> {
    let path = PathBuf::from(&project_path);
    let name = path.file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_default();

    // Detect tech stack from config files
    let mut tech_stack: Vec<String> = Vec::new();
    let mut description: Option<String> = None;

    // package.json → Node/JS project
    let pkg_json = path.join("package.json");
    if pkg_json.exists() {
        if let Ok(content) = fs::read_to_string(&pkg_json) {
            if let Ok(pkg) = serde_json::from_str::<serde_json::Value>(&content) {
                // Get description
                if let Some(desc) = pkg.get("description").and_then(|d| d.as_str()) {
                    if !desc.is_empty() {
                        description = Some(desc.to_string());
                    }
                }
                // Detect frameworks
                let all_deps = merge_deps(&pkg);
                if deps_has(&all_deps, "next") { tech_stack.push("Next.js".into()); }
                else if deps_has(&all_deps, "react") { tech_stack.push("React".into()); }
                if deps_has(&all_deps, "vue") { tech_stack.push("Vue".into()); }
                if deps_has(&all_deps, "svelte") { tech_stack.push("Svelte".into()); }
                if deps_has(&all_deps, "express") { tech_stack.push("Express".into()); }
                if deps_has(&all_deps, "tailwindcss") { tech_stack.push("Tailwind".into()); }
                if deps_has(&all_deps, "typescript") { tech_stack.push("TypeScript".into()); }
                else { tech_stack.push("JavaScript".into()); }
                if deps_has(&all_deps, "firebase") || deps_has(&all_deps, "firebase-admin") {
                    tech_stack.push("Firebase".into());
                }
                if deps_has(&all_deps, "@tauri-apps/api") { tech_stack.push("Tauri".into()); }
            }
        }
    }

    // Cargo.toml → Rust project
    if path.join("Cargo.toml").exists() {
        tech_stack.push("Rust".into());
    }

    // Podfile / .xcodeproj → iOS
    if path.join("Podfile").exists() || has_extension_in_dir(&path, "xcodeproj") {
        tech_stack.push("iOS".into());
    }

    // build.gradle → Android
    if path.join("build.gradle").exists() || path.join("build.gradle.kts").exists() {
        tech_stack.push("Android".into());
    }

    // requirements.txt / pyproject.toml → Python
    if path.join("requirements.txt").exists() || path.join("pyproject.toml").exists() {
        tech_stack.push("Python".into());
    }

    // go.mod → Go
    if path.join("go.mod").exists() {
        tech_stack.push("Go".into());
    }

    // Read CLAUDE.md
    let claude_md = read_file_truncated(&path.join("CLAUDE.md"), 2000);

    // Read TASKS.md
    let tasks_md = read_file_truncated(&path.join("TASKS.md"), 3000);

    // Read README excerpt for description fallback
    let readme_excerpt = read_readme_excerpt(&path);
    if description.is_none() {
        description = readme_excerpt.clone();
    }

    // Git info
    let is_git_repo = path.join(".git").exists();
    let mut git_branch: Option<String> = None;
    let mut last_commit: Option<String> = None;

    if is_git_repo {
        // Read current branch
        let head_file = path.join(".git/HEAD");
        if let Ok(head) = fs::read_to_string(&head_file) {
            let head = head.trim();
            if let Some(branch) = head.strip_prefix("ref: refs/heads/") {
                git_branch = Some(branch.to_string());
            }
        }
        // Read last commit message from COMMIT_EDITMSG or logs
        let commit_msg = path.join(".git/COMMIT_EDITMSG");
        if let Ok(msg) = fs::read_to_string(&commit_msg) {
            let first_line = msg.lines().next().unwrap_or("").trim().to_string();
            if !first_line.is_empty() {
                last_commit = Some(first_line);
            }
        }
    }

    Ok(ProjectInfo {
        name,
        path: project_path,
        description,
        tech_stack,
        claude_md,
        tasks_md,
        readme_excerpt,
        is_git_repo,
        git_branch,
        last_commit,
    })
}

fn merge_deps(pkg: &serde_json::Value) -> std::collections::HashSet<String> {
    let mut deps = std::collections::HashSet::new();
    for key in &["dependencies", "devDependencies"] {
        if let Some(obj) = pkg.get(key).and_then(|d| d.as_object()) {
            for k in obj.keys() {
                deps.insert(k.clone());
            }
        }
    }
    deps
}

fn deps_has(deps: &std::collections::HashSet<String>, name: &str) -> bool {
    deps.contains(name)
}

fn has_extension_in_dir(path: &Path, ext: &str) -> bool {
    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.flatten() {
            if let Some(e) = entry.path().extension() {
                if e == ext {
                    return true;
                }
            }
        }
    }
    false
}

fn read_file_truncated(path: &Path, max_bytes: usize) -> Option<String> {
    if !path.exists() {
        return None;
    }
    match fs::read_to_string(path) {
        Ok(content) => {
            if content.trim().is_empty() {
                None
            } else if content.len() > max_bytes {
                // Find the largest valid char boundary at or before max_bytes
                let truncated = &content[..content.floor_char_boundary(max_bytes)];
                Some(truncated.to_string())
            } else {
                Some(content)
            }
        }
        Err(_) => None,
    }
}

fn read_readme_excerpt(path: &Path) -> Option<String> {
    for name in &["README.md", "readme.md", "README.MD", "README"] {
        let readme = path.join(name);
        if readme.exists() {
            if let Ok(content) = fs::read_to_string(&readme) {
                // Extract first meaningful paragraph after the title
                let mut lines = content.lines();
                let mut found_title = false;
                let mut excerpt = String::new();

                while let Some(line) = lines.next() {
                    let trimmed = line.trim();
                    // Skip title lines
                    if trimmed.starts_with('#') {
                        found_title = true;
                        continue;
                    }
                    // Skip badges, empty lines after title
                    if trimmed.is_empty() || trimmed.starts_with('[') || trimmed.starts_with('!') {
                        if found_title && !excerpt.is_empty() {
                            break;
                        }
                        continue;
                    }
                    if found_title || excerpt.is_empty() {
                        if !excerpt.is_empty() {
                            excerpt.push(' ');
                        }
                        excerpt.push_str(trimmed);
                        if excerpt.len() > 300 {
                            break;
                        }
                    }
                }
                if !excerpt.is_empty() {
                    return Some(excerpt);
                }
            }
        }
    }
    None
}

/// Generate a concise workspace context focused on recent activity.
/// Used as a system prompt for the workspace agent.
#[tauri::command]
pub fn get_workspace_context(workspace_path: String) -> Result<String, String> {
    let entries = scan_workspace(workspace_path.clone())?;

    // Gather projects with their session data
    struct ProjectActivity {
        name: String,
        tech: Vec<String>,
        branch: Option<String>,
        description: Option<String>,
        sessions: Vec<(String, String, u32)>, // (date, summary, msg_count)
        latest_date: String,
    }

    let mut active_projects: Vec<ProjectActivity> = Vec::new();
    let mut inactive_names: Vec<String> = Vec::new();

    for entry in &entries {
        let info = get_project_info(entry.path.clone()).ok();
        let sessions = claude_data::get_sessions_for_project(entry.path.clone()).unwrap_or_default();

        let recent_sessions: Vec<(String, String, u32)> = sessions.iter().take(3).map(|s| {
            let date = s.modified.as_deref().unwrap_or("unknown").to_string();
            let summary = s.summary.as_deref()
                .or(s.first_prompt.as_deref())
                .unwrap_or("(no summary)")
                .to_string();
            let msgs = s.message_count.unwrap_or(0);
            (date, summary, msgs)
        }).collect();

        if recent_sessions.is_empty() {
            inactive_names.push(entry.name.clone());
            continue;
        }

        let latest = recent_sessions.first().map(|(d, _, _)| d.clone()).unwrap_or_default();

        active_projects.push(ProjectActivity {
            name: entry.name.clone(),
            tech: info.as_ref().map(|i| i.tech_stack.clone()).unwrap_or_default(),
            branch: info.as_ref().and_then(|i| i.git_branch.clone()),
            description: info.as_ref().and_then(|i| i.description.clone()),
            sessions: recent_sessions,
            latest_date: latest,
        });
    }

    // Sort by most recently active
    active_projects.sort_by(|a, b| b.latest_date.cmp(&a.latest_date));

    let mut ctx = String::new();
    ctx.push_str("You are a workspace project manager for this user's coding workspace. ");
    ctx.push_str("You know about their projects and recent coding activity. ");
    ctx.push_str("Help them understand what they've been working on, pick up where they left off, and manage their projects.\n\n");

    ctx.push_str(&format!("Workspace: {} ({} projects)\n\n", workspace_path, entries.len()));

    // Recent activity section — top 10 most active projects
    ctx.push_str("## Recently Active Projects\n\n");
    for proj in active_projects.iter().take(10) {
        ctx.push_str(&format!("### {}", proj.name));
        if !proj.tech.is_empty() {
            ctx.push_str(&format!(" [{}]", proj.tech.join(", ")));
        }
        ctx.push('\n');

        if let Some(ref desc) = proj.description {
            let short: String = desc.chars().take(120).collect();
            ctx.push_str(&format!("{}\n", short));
        }
        if let Some(ref branch) = proj.branch {
            ctx.push_str(&format!("Branch: {}\n", branch));
        }

        ctx.push_str("Recent work:\n");
        for (date, summary, msgs) in &proj.sessions {
            let short_summary: String = summary.chars().take(100).collect();
            ctx.push_str(&format!("  - {} | {} ({} msgs)\n", &date[..std::cmp::min(10, date.len())], short_summary, msgs));
        }
        ctx.push('\n');
    }

    // Just list inactive projects by name
    if !inactive_names.is_empty() {
        ctx.push_str(&format!("## Other Projects ({})\n", inactive_names.len()));
        ctx.push_str(&inactive_names.join(", "));
        ctx.push('\n');
    }

    Ok(ctx)
}

#[cfg(test)]
mod tests {
    use super::*;

    // --- merge_deps ---

    #[test]
    fn merge_deps_combines_deps_and_dev_deps() {
        let pkg: serde_json::Value = serde_json::json!({
            "dependencies": { "react": "^18", "react-dom": "^18" },
            "devDependencies": { "typescript": "^5", "vite": "^5" }
        });
        let deps = merge_deps(&pkg);
        assert!(deps.contains("react"));
        assert!(deps.contains("react-dom"));
        assert!(deps.contains("typescript"));
        assert!(deps.contains("vite"));
        assert_eq!(deps.len(), 4);
    }

    #[test]
    fn merge_deps_handles_missing_sections() {
        let pkg: serde_json::Value = serde_json::json!({ "name": "test" });
        let deps = merge_deps(&pkg);
        assert!(deps.is_empty());
    }

    #[test]
    fn merge_deps_deduplicates() {
        let pkg: serde_json::Value = serde_json::json!({
            "dependencies": { "lodash": "^4" },
            "devDependencies": { "lodash": "^4" }
        });
        let deps = merge_deps(&pkg);
        assert_eq!(deps.len(), 1);
    }

    // --- deps_has ---

    #[test]
    fn deps_has_finds_existing() {
        let mut deps = std::collections::HashSet::new();
        deps.insert("react".to_string());
        assert!(deps_has(&deps, "react"));
        assert!(!deps_has(&deps, "vue"));
    }

    // --- has_extension_in_dir ---

    #[test]
    fn has_extension_in_dir_finds_extension() {
        let dir = tempfile::tempdir().unwrap();
        std::fs::File::create(dir.path().join("project.xcodeproj")).unwrap();
        assert!(has_extension_in_dir(&dir.path().to_path_buf(), "xcodeproj"));
    }

    #[test]
    fn has_extension_in_dir_no_match() {
        let dir = tempfile::tempdir().unwrap();
        std::fs::File::create(dir.path().join("file.txt")).unwrap();
        assert!(!has_extension_in_dir(&dir.path().to_path_buf(), "xcodeproj"));
    }

    // --- read_file_truncated ---

    #[test]
    fn read_file_truncated_reads_short_file() {
        let dir = tempfile::tempdir().unwrap();
        let file_path = dir.path().join("short.txt");
        std::fs::write(&file_path, "Hello world").unwrap();

        let result = read_file_truncated(&file_path, 100);
        assert_eq!(result, Some("Hello world".to_string()));
    }

    #[test]
    fn read_file_truncated_truncates_long_file() {
        let dir = tempfile::tempdir().unwrap();
        let file_path = dir.path().join("long.txt");
        let content = "x".repeat(500);
        std::fs::write(&file_path, &content).unwrap();

        let result = read_file_truncated(&file_path, 100);
        assert!(result.is_some());
        assert_eq!(result.unwrap().len(), 100);
    }

    #[test]
    fn read_file_truncated_multibyte_utf8_no_panic() {
        let dir = tempfile::tempdir().unwrap();
        let file_path = dir.path().join("emoji.txt");
        // Each emoji is 4 bytes. 50 emojis = 200 bytes.
        let content = "\u{1F600}".repeat(50);
        std::fs::write(&file_path, &content).unwrap();

        // Truncate at 10 bytes — falls in the middle of a 4-byte emoji
        let result = read_file_truncated(&file_path, 10);
        assert!(result.is_some());
        let text = result.unwrap();
        // Should truncate to a valid char boundary (8 bytes = 2 emojis)
        assert_eq!(text.len(), 8);
        assert!(text.is_char_boundary(text.len()));
    }

    #[test]
    fn read_file_truncated_missing_file() {
        let path = PathBuf::from("/nonexistent/file.txt");
        assert_eq!(read_file_truncated(&path, 100), None);
    }

    #[test]
    fn read_file_truncated_empty_file() {
        let dir = tempfile::tempdir().unwrap();
        let file_path = dir.path().join("empty.txt");
        std::fs::write(&file_path, "").unwrap();
        assert_eq!(read_file_truncated(&file_path, 100), None);
    }

    // --- read_readme_excerpt ---

    #[test]
    fn read_readme_excerpt_extracts_paragraph_after_title() {
        let dir = tempfile::tempdir().unwrap();
        std::fs::write(
            dir.path().join("README.md"),
            "# My Project\n\nThis is the description of the project.\n\n## Getting Started\n",
        ).unwrap();

        let result = read_readme_excerpt(&dir.path().to_path_buf());
        assert!(result.is_some());
        assert_eq!(result.unwrap(), "This is the description of the project.");
    }

    #[test]
    fn read_readme_excerpt_skips_badges() {
        let dir = tempfile::tempdir().unwrap();
        std::fs::write(
            dir.path().join("README.md"),
            "# My Project\n\n[![Build](https://badge.svg)](https://link)\n![Logo](logo.png)\n\nActual description here.\n",
        ).unwrap();

        let result = read_readme_excerpt(&dir.path().to_path_buf());
        assert!(result.is_some());
        assert_eq!(result.unwrap(), "Actual description here.");
    }

    #[test]
    fn read_readme_excerpt_no_readme() {
        let dir = tempfile::tempdir().unwrap();
        let result = read_readme_excerpt(&dir.path().to_path_buf());
        assert!(result.is_none());
    }

    // --- scan_workspace ---

    #[test]
    fn scan_workspace_lists_directories() {
        let dir = tempfile::tempdir().unwrap();
        std::fs::create_dir(dir.path().join("project-a")).unwrap();
        std::fs::create_dir(dir.path().join("project-b")).unwrap();
        std::fs::write(dir.path().join("file.txt"), "not a dir").unwrap();
        std::fs::create_dir(dir.path().join(".hidden")).unwrap();

        let result = scan_workspace(dir.path().to_string_lossy().to_string());
        assert!(result.is_ok());
        let entries = result.unwrap();
        assert_eq!(entries.len(), 2);
        assert_eq!(entries[0].name, "project-a");
        assert_eq!(entries[1].name, "project-b");
    }

    #[test]
    fn scan_workspace_detects_git_and_claude_md() {
        let dir = tempfile::tempdir().unwrap();
        let proj = dir.path().join("myproject");
        std::fs::create_dir(&proj).unwrap();
        std::fs::create_dir(proj.join(".git")).unwrap();
        std::fs::write(proj.join("CLAUDE.md"), "# Instructions").unwrap();

        let result = scan_workspace(dir.path().to_string_lossy().to_string()).unwrap();
        assert_eq!(result.len(), 1);
        assert!(result[0].is_git_repo);
        assert!(result[0].has_claude_md);
    }
}
