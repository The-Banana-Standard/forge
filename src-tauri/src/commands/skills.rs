use serde::Serialize;
use std::fs;
use std::path::PathBuf;
use std::process::Command;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Skill {
    pub name: String,
    pub title: String,
    pub description: String,
    pub source: String, // "global", "project", or "skill"
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallResult {
    pub success: bool,
    pub id: String,
    pub installed_path: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InstalledSkillStatus {
    pub id: String,
    pub installed: bool,
}

fn skip_yaml_frontmatter(content: &str) -> &str {
    if let Some(rest) = content.strip_prefix("---") {
        // Find the closing ---
        if let Some(end) = rest.find("\n---") {
            let after = &rest[end + 4..];
            return after.trim_start_matches('\n');
        }
    }
    content
}

fn parse_skill_file(path: &PathBuf, source: &str) -> Option<Skill> {
    let content = fs::read_to_string(path).ok()?;
    let content = skip_yaml_frontmatter(&content);

    let name = if source == "skill" {
        // For skills in ~/.claude/skills/<id>/SKILL.md, use the directory name
        path.parent()?.file_name()?.to_string_lossy().to_string()
    } else {
        path.file_stem()?.to_string_lossy().to_string()
    };

    let mut lines = content.lines();
    let title = lines
        .next()
        .unwrap_or("")
        .trim()
        .trim_start_matches('#')
        .trim()
        .to_string();

    // Skip blank line
    lines.next();

    let description = lines
        .next()
        .unwrap_or("")
        .trim()
        .to_string();

    if title.is_empty() {
        return None;
    }

    Some(Skill {
        name,
        title,
        description,
        source: source.to_string(),
    })
}

#[tauri::command]
pub fn get_skills(project_path: Option<String>) -> Result<Vec<Skill>, String> {
    let mut skills: Vec<Skill> = Vec::new();

    if let Some(home) = dirs::home_dir() {
        // Global commands from ~/.claude/commands/
        let global_dir = home.join(".claude").join("commands");
        if global_dir.is_dir() {
            if let Ok(entries) = fs::read_dir(&global_dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if path.extension().and_then(|e| e.to_str()) == Some("md") {
                        if let Some(skill) = parse_skill_file(&path, "global") {
                            skills.push(skill);
                        }
                    }
                }
            }
        }

        // Skills from ~/.claude/skills/*/SKILL.md
        let skills_dir = home.join(".claude").join("skills");
        if skills_dir.is_dir() {
            if let Ok(entries) = fs::read_dir(&skills_dir) {
                for entry in entries.flatten() {
                    let dir_path = entry.path();
                    if dir_path.is_dir() {
                        let skill_file = dir_path.join("SKILL.md");
                        if skill_file.exists() {
                            if let Some(skill) = parse_skill_file(&skill_file, "skill") {
                                skills.push(skill);
                            }
                        }
                    }
                }
            }
        }
    }

    // Project-level commands from {project}/.claude/commands/
    if let Some(ref proj) = project_path {
        let proj_dir = PathBuf::from(proj).join(".claude").join("commands");
        if proj_dir.is_dir() {
            if let Ok(entries) = fs::read_dir(&proj_dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if path.extension().and_then(|e| e.to_str()) == Some("md") {
                        if let Some(skill) = parse_skill_file(&path, "project") {
                            skills.push(skill);
                        }
                    }
                }
            }
        }
    }

    skills.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    Ok(skills)
}

#[tauri::command]
pub fn install_skill(id: String, source_url: String, format: String) -> InstallResult {
    // Validate skill id — prevent path traversal
    if id.is_empty() || id.contains('/') || id.contains('\\') || id.contains("..") {
        return InstallResult {
            success: false,
            id,
            installed_path: None,
            error: Some("Invalid skill id".to_string()),
        };
    }

    // Validate URL against allowed origins (raw content only, no redirects)
    const ALLOWED_PREFIXES: &[&str] = &[
        "https://raw.githubusercontent.com/",
    ];
    if !ALLOWED_PREFIXES.iter().any(|prefix| source_url.starts_with(prefix)) {
        return InstallResult {
            success: false,
            id,
            installed_path: None,
            error: Some("Source URL must be from raw.githubusercontent.com".to_string()),
        };
    }

    let home = match dirs::home_dir() {
        Some(h) => h,
        None => {
            return InstallResult {
                success: false,
                id,
                installed_path: None,
                error: Some("Could not determine home directory".to_string()),
            }
        }
    };

    let (target_dir, target_file) = if format == "command" {
        let dir = home.join(".claude").join("commands");
        let file = dir.join(format!("{}.md", id));
        (dir, file)
    } else {
        let dir = home.join(".claude").join("skills").join(&id);
        let file = dir.join("SKILL.md");
        (dir, file)
    };

    // Create directory if needed
    if let Err(e) = fs::create_dir_all(&target_dir) {
        return InstallResult {
            success: false,
            id,
            installed_path: None,
            error: Some(format!("Failed to create directory: {}", e)),
        };
    }

    // Download via curl (no redirects — raw.githubusercontent.com serves directly)
    let output = Command::new("curl")
        .args(["-s", "--fail", "--max-redirs", "0", &source_url])
        .output();

    match output {
        Ok(result) => {
            if !result.status.success() {
                let stderr = String::from_utf8_lossy(&result.stderr);
                return InstallResult {
                    success: false,
                    id,
                    installed_path: None,
                    error: Some(format!("Download failed: {}", stderr)),
                };
            }

            match fs::write(&target_file, &result.stdout) {
                Ok(_) => InstallResult {
                    success: true,
                    id,
                    installed_path: Some(target_file.to_string_lossy().to_string()),
                    error: None,
                },
                Err(e) => InstallResult {
                    success: false,
                    id,
                    installed_path: None,
                    error: Some(format!("Failed to write file: {}", e)),
                },
            }
        }
        Err(e) => InstallResult {
            success: false,
            id,
            installed_path: None,
            error: Some(format!("Failed to run curl: {}", e)),
        },
    }
}

#[tauri::command]
pub fn uninstall_skill(id: String, format: String) -> InstallResult {
    // Validate skill id — prevent path traversal
    if id.is_empty() || id.contains('/') || id.contains('\\') || id.contains("..") {
        return InstallResult {
            success: false,
            id,
            installed_path: None,
            error: Some("Invalid skill id".to_string()),
        };
    }

    let home = match dirs::home_dir() {
        Some(h) => h,
        None => {
            return InstallResult {
                success: false,
                id,
                installed_path: None,
                error: Some("Could not determine home directory".to_string()),
            }
        }
    };

    let result = if format == "command" {
        let file = home.join(".claude").join("commands").join(format!("{}.md", id));
        if file.exists() {
            fs::remove_file(&file)
        } else {
            Ok(())
        }
    } else {
        let dir = home.join(".claude").join("skills").join(&id);
        if dir.exists() {
            fs::remove_dir_all(&dir)
        } else {
            Ok(())
        }
    };

    match result {
        Ok(_) => InstallResult {
            success: true,
            id,
            installed_path: None,
            error: None,
        },
        Err(e) => InstallResult {
            success: false,
            id,
            installed_path: None,
            error: Some(format!("Failed to uninstall: {}", e)),
        },
    }
}

#[tauri::command]
pub fn check_skills_installed(skill_ids: Vec<(String, String)>) -> Vec<InstalledSkillStatus> {
    let home = match dirs::home_dir() {
        Some(h) => h,
        None => return skill_ids.iter().map(|(id, _)| InstalledSkillStatus { id: id.clone(), installed: false }).collect(),
    };

    skill_ids
        .iter()
        .map(|(id, format)| {
            let exists = if format == "command" {
                home.join(".claude").join("commands").join(format!("{}.md", id)).exists()
            } else {
                home.join(".claude").join("skills").join(id).join("SKILL.md").exists()
            };
            InstalledSkillStatus {
                id: id.clone(),
                installed: exists,
            }
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn skip_yaml_frontmatter_with_frontmatter() {
        let input = "---\ntitle: My Skill\nauthor: test\n---\n# Hello\nThis is content.";
        let result = skip_yaml_frontmatter(input);
        assert_eq!(result, "# Hello\nThis is content.");
    }

    #[test]
    fn skip_yaml_frontmatter_without_frontmatter() {
        let input = "# Hello\nThis is content.";
        let result = skip_yaml_frontmatter(input);
        assert_eq!(result, input);
    }

    #[test]
    fn skip_yaml_frontmatter_unclosed_returns_as_is() {
        let input = "---\ntitle: Unclosed\nNo closing delimiter here";
        let result = skip_yaml_frontmatter(input);
        assert_eq!(result, input);
    }

    #[test]
    fn skip_yaml_frontmatter_empty_string() {
        let result = skip_yaml_frontmatter("");
        assert_eq!(result, "");
    }

    // --- parse_skill_file ---

    #[test]
    fn parse_skill_file_basic() {
        let dir = tempfile::tempdir().unwrap();
        let file_path = dir.path().join("my-skill.md");
        std::fs::write(&file_path, "# My Cool Skill\n\nThis does something useful.\n\nMore details here.\n").unwrap();

        let path = PathBuf::from(&file_path);
        let result = parse_skill_file(&path, "global");
        assert!(result.is_some());

        let skill = result.unwrap();
        assert_eq!(skill.name, "my-skill");
        assert_eq!(skill.title, "My Cool Skill");
        assert_eq!(skill.description, "This does something useful.");
        assert_eq!(skill.source, "global");
    }

    #[test]
    fn parse_skill_file_with_frontmatter() {
        let dir = tempfile::tempdir().unwrap();
        let file_path = dir.path().join("fancy.md");
        std::fs::write(&file_path, "---\nauthor: test\n---\n# Fancy Skill\n\nA fancy description.\n").unwrap();

        let path = PathBuf::from(&file_path);
        let result = parse_skill_file(&path, "project");
        assert!(result.is_some());

        let skill = result.unwrap();
        assert_eq!(skill.title, "Fancy Skill");
        assert_eq!(skill.description, "A fancy description.");
    }

    #[test]
    fn parse_skill_file_empty_title_returns_none() {
        let dir = tempfile::tempdir().unwrap();
        let file_path = dir.path().join("empty.md");
        std::fs::write(&file_path, "\n\n").unwrap();

        let path = PathBuf::from(&file_path);
        assert!(parse_skill_file(&path, "global").is_none());
    }

    #[test]
    fn parse_skill_file_skill_source_uses_dir_name() {
        let dir = tempfile::tempdir().unwrap();
        let skill_dir = dir.path().join("my-awesome-skill");
        std::fs::create_dir(&skill_dir).unwrap();
        let file_path = skill_dir.join("SKILL.md");
        std::fs::write(&file_path, "# Awesome\n\nDoes awesome things.\n").unwrap();

        let path = PathBuf::from(&file_path);
        let result = parse_skill_file(&path, "skill");
        assert!(result.is_some());
        assert_eq!(result.unwrap().name, "my-awesome-skill");
    }
}
