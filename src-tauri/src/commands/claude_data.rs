use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::fs;
use std::io::{BufRead, BufReader};
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SessionEntry {
    pub session_id: Option<String>,
    pub summary: Option<String>,
    pub first_prompt: Option<String>,
    pub message_count: Option<u32>,
    pub modified: Option<String>,
    pub created: Option<String>,
    pub git_branch: Option<String>,
    pub project_path: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SessionsIndex {
    entries: Option<Vec<SessionIndexEntry>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SessionIndexEntry {
    session_id: Option<String>,
    summary: Option<String>,
    first_prompt: Option<String>,
    message_count: Option<u32>,
    modified: Option<String>,
    created: Option<String>,
    git_branch: Option<String>,
    project_path: Option<String>,
}

/// A single message line from a .jsonl session file
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct JournalLine {
    #[serde(rename = "type")]
    msg_type: Option<String>,
    session_id: Option<String>,
    cwd: Option<String>,
    git_branch: Option<String>,
    timestamp: Option<String>,
    message: Option<JournalMessage>,
}

#[derive(Debug, Deserialize)]
struct JournalMessage {
    role: Option<String>,
    content: Option<serde_json::Value>,
}

fn sanitize_path(path: &str) -> String {
    path.replace('/', "-")
}

fn get_claude_projects_dir() -> Option<PathBuf> {
    dirs::home_dir().map(|h| h.join(".claude").join("projects"))
}

/// Given a project at ~/workspace/foo, compute possible old Claude data paths
/// e.g. the project used to be at ~/Desktop/foo
fn get_candidate_sanitized_paths(project_path: &str) -> Vec<String> {
    let mut candidates = vec![sanitize_path(project_path)];

    // If the path is under ~/workspace/, also check ~/Desktop/ (common migration)
    if project_path.contains("/workspace/") {
        let desktop_path = project_path.replace("/workspace/", "/Desktop/");
        candidates.push(sanitize_path(&desktop_path));
    }

    // Also try just the project name under common parent dirs
    if let Some(name) = project_path.rsplit('/').next() {
        if let Some(home) = dirs::home_dir() {
            let desktop_variant = home.join("Desktop").join(name);
            let s = sanitize_path(&desktop_variant.to_string_lossy());
            if !candidates.contains(&s) {
                candidates.push(s);
            }
        }
    }

    candidates
}

/// Parse a .jsonl session file to extract session metadata
fn parse_jsonl_session(path: &PathBuf) -> Option<SessionEntry> {
    let file = fs::File::open(path).ok()?;
    let reader = BufReader::new(file);

    let mut session_id: Option<String> = None;
    let mut git_branch: Option<String> = None;
    let mut cwd: Option<String> = None;
    let mut first_user_prompt: Option<String> = None;
    let mut message_count: u32 = 0;
    let mut first_timestamp: Option<String> = None;
    let mut last_timestamp: Option<String> = None;

    for line in reader.lines() {
        let line = match line {
            Ok(l) => l,
            Err(_) => continue,
        };
        if line.is_empty() {
            continue;
        }

        let parsed: JournalLine = match serde_json::from_str(&line) {
            Ok(p) => p,
            Err(_) => continue,
        };

        // Skip non-message types
        let msg_type = parsed.msg_type.as_deref().unwrap_or("");
        if msg_type != "user" && msg_type != "assistant" {
            continue;
        }

        if session_id.is_none() {
            session_id = parsed.session_id.clone();
        }
        if git_branch.is_none() {
            git_branch = parsed.git_branch.clone();
        }
        if cwd.is_none() {
            cwd = parsed.cwd.clone();
        }

        if let Some(ref ts) = parsed.timestamp {
            if first_timestamp.is_none() {
                first_timestamp = Some(ts.clone());
            }
            last_timestamp = Some(ts.clone());
        }

        // Count user/assistant messages
        if msg_type == "user" || msg_type == "assistant" {
            message_count += 1;
        }

        // Get first user prompt (non-meta)
        if msg_type == "user" && first_user_prompt.is_none() {
            if let Some(ref msg) = parsed.message {
                if let Some(ref role) = msg.role {
                    if role == "user" {
                        if let Some(ref content) = msg.content {
                            let text = match content {
                                serde_json::Value::String(s) => s.clone(),
                                serde_json::Value::Array(arr) => {
                                    // Find first text block
                                    arr.iter()
                                        .filter_map(|v| {
                                            if v.get("type")?.as_str()? == "text" {
                                                v.get("text")?.as_str().map(|s| s.to_string())
                                            } else {
                                                None
                                            }
                                        })
                                        .next()
                                        .unwrap_or_default()
                                }
                                _ => String::new(),
                            };
                            // Skip meta/command prompts
                            if !text.is_empty()
                                && !text.starts_with("<command-message>")
                                && !text.starts_with("# ")
                                && text.len() < 500
                            {
                                first_user_prompt = Some(text);
                            }
                        }
                    }
                }
            }
        }
    }

    // Only return if we found actual messages
    if message_count < 2 {
        return None;
    }

    Some(SessionEntry {
        session_id,
        summary: None, // JSONL files don't have summaries
        first_prompt: first_user_prompt,
        message_count: Some(message_count),
        modified: last_timestamp,
        created: first_timestamp,
        git_branch,
        project_path: cwd,
    })
}

#[tauri::command]
pub fn get_sessions_for_project(project_path: String) -> Result<Vec<SessionEntry>, String> {
    let claude_dir = get_claude_projects_dir()
        .ok_or_else(|| "Could not determine home directory".to_string())?;

    let mut all_entries: Vec<SessionEntry> = Vec::new();
    let mut seen_ids: HashSet<String> = HashSet::new();

    let candidates = get_candidate_sanitized_paths(&project_path);

    for sanitized in &candidates {
        let project_dir = claude_dir.join(sanitized);
        if !project_dir.is_dir() {
            continue;
        }

        // Try sessions-index.json first
        let sessions_file = project_dir.join("sessions-index.json");
        if sessions_file.exists() {
            if let Ok(content) = fs::read_to_string(&sessions_file) {
                if let Ok(index) = serde_json::from_str::<SessionsIndex>(&content) {
                    if let Some(entries) = index.entries {
                        for entry in entries {
                            let sid = entry.session_id.clone().unwrap_or_default();
                            if !sid.is_empty() && seen_ids.contains(&sid) {
                                continue;
                            }
                            if !sid.is_empty() {
                                seen_ids.insert(sid);
                            }
                            all_entries.push(SessionEntry {
                                session_id: entry.session_id,
                                summary: entry.summary,
                                first_prompt: entry.first_prompt,
                                message_count: entry.message_count,
                                modified: entry.modified,
                                created: entry.created,
                                git_branch: entry.git_branch,
                                project_path: entry.project_path,
                            });
                        }
                    }
                }
            }
            continue; // If index exists, don't also parse JSONL
        }

        // No index — parse .jsonl files directly
        if let Ok(dir_entries) = fs::read_dir(&project_dir) {
            for entry in dir_entries.flatten() {
                let path = entry.path();
                if path.extension().and_then(|e| e.to_str()) != Some("jsonl") {
                    continue;
                }

                if let Some(session) = parse_jsonl_session(&path) {
                    let sid = session.session_id.clone().unwrap_or_default();
                    if !sid.is_empty() && seen_ids.contains(&sid) {
                        continue;
                    }
                    if !sid.is_empty() {
                        seen_ids.insert(sid);
                    }
                    all_entries.push(session);
                }
            }
        }
    }

    // Sort by modified date descending
    all_entries.sort_by(|a, b| {
        let a_mod = a.modified.as_deref().unwrap_or("");
        let b_mod = b.modified.as_deref().unwrap_or("");
        b_mod.cmp(a_mod)
    });

    Ok(all_entries)
}

#[tauri::command]
pub fn read_claude_md(project_path: String) -> Result<Option<String>, String> {
    let claude_md = PathBuf::from(&project_path).join("CLAUDE.md");
    if claude_md.exists() {
        fs::read_to_string(&claude_md)
            .map(Some)
            .map_err(|e| format!("Failed to read CLAUDE.md: {}", e))
    } else {
        Ok(None)
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ClaudeUsageStats {
    pub total_sessions: u32,
    pub total_messages: u32,
    pub first_session_date: Option<String>,
    pub daily_activity: Vec<DailyActivity>,
    pub model_usage: std::collections::HashMap<String, ModelUsage>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DailyActivity {
    pub date: String,
    pub message_count: u32,
    pub session_count: u32,
    pub tool_call_count: u32,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelUsage {
    pub input_tokens: u64,
    pub output_tokens: u64,
    pub cache_read_input_tokens: u64,
    pub cache_creation_input_tokens: u64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct StatsCache {
    total_sessions: Option<u32>,
    total_messages: Option<u32>,
    first_session_date: Option<String>,
    daily_activity: Option<Vec<DailyActivity>>,
    model_usage: Option<std::collections::HashMap<String, serde_json::Value>>,
    last_computed_date: Option<String>,
}

/// Lightweight scan of a JSONL file to count messages and extract date
fn scan_jsonl_stats(path: &PathBuf) -> Option<(String, u32, u32)> {
    let file = fs::File::open(path).ok()?;
    let reader = BufReader::new(file);

    let mut message_count: u32 = 0;
    let mut tool_call_count: u32 = 0;
    let mut date: Option<String> = None;

    for line in reader.lines() {
        let line = match line {
            Ok(l) => l,
            Err(_) => continue,
        };
        if line.is_empty() {
            continue;
        }

        // Quick JSON field extraction without full parse for speed
        if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&line) {
            let msg_type = parsed.get("type").and_then(|v| v.as_str()).unwrap_or("");

            if date.is_none() {
                if let Some(ts) = parsed.get("timestamp").and_then(|v| v.as_str()) {
                    // Extract date portion (YYYY-MM-DD) from ISO timestamp
                    if ts.len() >= 10 {
                        date = Some(ts[..10].to_string());
                    }
                }
            }

            match msg_type {
                "user" | "assistant" => {
                    message_count += 1;
                    // Count tool_use blocks in assistant messages
                    if msg_type == "assistant" {
                        if let Some(msg) = parsed.get("message") {
                            if let Some(content) = msg.get("content") {
                                if let Some(arr) = content.as_array() {
                                    for block in arr {
                                        if block.get("type").and_then(|t| t.as_str()) == Some("tool_use") {
                                            tool_call_count += 1;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                _ => {}
            }
        }
    }

    date.map(|d| (d, message_count, tool_call_count))
}

/// Scan recent JSONL files across all projects to supplement stale cache
fn scan_recent_activity(cutoff_date: &str) -> (Vec<DailyActivity>, u32, u32) {
    let mut daily_map: std::collections::HashMap<String, (u32, u32, u32)> = std::collections::HashMap::new();
    let mut extra_sessions: u32 = 0;
    let mut extra_messages: u32 = 0;

    let projects_dir = match dirs::home_dir() {
        Some(h) => h.join(".claude").join("projects"),
        None => return (vec![], 0, 0),
    };

    if !projects_dir.is_dir() {
        return (vec![], 0, 0);
    }

    // Iterate all project directories
    let project_dirs = match fs::read_dir(&projects_dir) {
        Ok(entries) => entries,
        Err(_) => return (vec![], 0, 0),
    };

    for project_entry in project_dirs.flatten() {
        let project_path = project_entry.path();
        if !project_path.is_dir() {
            continue;
        }

        let entries = match fs::read_dir(&project_path) {
            Ok(e) => e,
            Err(_) => continue,
        };

        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().and_then(|e| e.to_str()) != Some("jsonl") {
                continue;
            }

            // Check file modification time — skip files not modified after cutoff
            if let Ok(metadata) = fs::metadata(&path) {
                if let Ok(modified) = metadata.modified() {
                    if let Ok(duration) = modified.duration_since(std::time::UNIX_EPOCH) {
                        let mod_secs = duration.as_secs();
                        // Parse cutoff date to approximate epoch seconds
                        // cutoff_date is "YYYY-MM-DD"
                        let cutoff_secs = parse_date_to_epoch(cutoff_date);
                        if mod_secs < cutoff_secs {
                            continue;
                        }
                    }
                }
            }

            if let Some((date, msgs, tools)) = scan_jsonl_stats(&path) {
                if date.as_str() > cutoff_date {
                    let entry = daily_map.entry(date).or_insert((0, 0, 0));
                    entry.0 += msgs;
                    entry.1 += 1; // session count
                    entry.2 += tools;
                    extra_sessions += 1;
                    extra_messages += msgs;
                }
            }
        }
    }

    let mut activities: Vec<DailyActivity> = daily_map
        .into_iter()
        .map(|(date, (msgs, sessions, tools))| DailyActivity {
            date,
            message_count: msgs,
            session_count: sessions,
            tool_call_count: tools,
        })
        .collect();
    activities.sort_by(|a, b| a.date.cmp(&b.date));

    (activities, extra_sessions, extra_messages)
}

fn parse_date_to_epoch(date: &str) -> u64 {
    // Simple YYYY-MM-DD to approximate epoch seconds
    let parts: Vec<&str> = date.split('-').collect();
    if parts.len() != 3 {
        return 0;
    }
    let year: u64 = parts[0].parse().unwrap_or(2026);
    let month: u64 = parts[1].parse().unwrap_or(1);
    let day: u64 = parts[2].parse().unwrap_or(1);

    // Rough calculation — doesn't need to be exact, just approximate
    let days = (year - 1970) * 365 + (year - 1970) / 4 + (month - 1) * 30 + day;
    days * 86400
}

#[tauri::command]
pub fn get_claude_usage_stats() -> Result<ClaudeUsageStats, String> {
    let stats_path = dirs::home_dir()
        .ok_or("No home dir")?
        .join(".claude")
        .join("stats-cache.json");

    if !stats_path.exists() {
        return Err("No stats-cache.json found".into());
    }

    let content = fs::read_to_string(&stats_path)
        .map_err(|e| format!("Failed to read stats: {}", e))?;
    let cache: StatsCache = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse stats: {}", e))?;

    let model_usage = cache.model_usage.unwrap_or_default()
        .into_iter()
        .filter_map(|(k, v)| {
            Some((k, ModelUsage {
                input_tokens: v.get("inputTokens")?.as_u64()?,
                output_tokens: v.get("outputTokens")?.as_u64()?,
                cache_read_input_tokens: v.get("cacheReadInputTokens")?.as_u64().unwrap_or(0),
                cache_creation_input_tokens: v.get("cacheCreationInputTokens")?.as_u64().unwrap_or(0),
            }))
        })
        .collect();

    let mut daily_activity = cache.daily_activity.unwrap_or_default();
    let mut total_sessions = cache.total_sessions.unwrap_or(0);
    let mut total_messages = cache.total_messages.unwrap_or(0);

    // Supplement with fresh data from JSONL files if cache is stale
    if let Some(ref cutoff) = cache.last_computed_date {
        let (recent_activity, extra_sessions, extra_messages) = scan_recent_activity(cutoff);
        if !recent_activity.is_empty() {
            // Merge: replace any overlapping dates, add new ones
            let cached_dates: std::collections::HashSet<String> =
                daily_activity.iter().map(|d| d.date.clone()).collect();
            for activity in recent_activity {
                if !cached_dates.contains(&activity.date) {
                    daily_activity.push(activity);
                }
            }
            daily_activity.sort_by(|a, b| a.date.cmp(&b.date));
            total_sessions += extra_sessions;
            total_messages += extra_messages;
        }
    }

    Ok(ClaudeUsageStats {
        total_sessions,
        total_messages,
        first_session_date: cache.first_session_date,
        daily_activity,
        model_usage,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    // --- sanitize_path ---

    #[test]
    fn sanitize_path_replaces_slashes_with_dashes() {
        assert_eq!(sanitize_path("/Users/me/project"), "-Users-me-project");
    }

    #[test]
    fn sanitize_path_empty_string() {
        assert_eq!(sanitize_path(""), "");
    }

    #[test]
    fn sanitize_path_no_slashes() {
        assert_eq!(sanitize_path("no-slashes-here"), "no-slashes-here");
    }

    // --- parse_date_to_epoch ---

    #[test]
    fn parse_date_to_epoch_valid_date() {
        let epoch = parse_date_to_epoch("2025-01-15");
        // Should be a positive number representing roughly Jan 15, 2025
        assert!(epoch > 0);
        // 2025 is 55 years after 1970, so roughly 55*365*86400 ≈ 1,735,689,600
        assert!(epoch > 1_700_000_000);
        assert!(epoch < 1_800_000_000);
    }

    #[test]
    fn parse_date_to_epoch_malformed_input() {
        // "not-a-date" has 3 hyphen-separated parts, so it passes the length check
        // but parse() fails, falling back to defaults (year=2026, month=1, day=1).
        // A truly malformed input with != 3 parts should return 0.
        assert_eq!(parse_date_to_epoch("garbage"), 0);
        // "not-a-date" uses defaults — just verify it returns *something* nonzero
        assert!(parse_date_to_epoch("not-a-date") > 0);
    }

    #[test]
    fn parse_date_to_epoch_partial_input() {
        // Only two parts — should return 0
        assert_eq!(parse_date_to_epoch("2025-01"), 0);
    }

    // --- parse_jsonl_session ---

    #[test]
    fn parse_jsonl_session_valid_multi_message() {
        let dir = tempfile::tempdir().unwrap();
        let file_path = dir.path().join("session.jsonl");
        let mut file = fs::File::create(&file_path).unwrap();

        // Write user message
        writeln!(file, r#"{{"type":"user","sessionId":"abc123","cwd":"/tmp","gitBranch":"main","timestamp":"2025-01-15T10:00:00Z","message":{{"role":"user","content":"Hello world"}}}}"#).unwrap();
        // Write assistant message
        writeln!(file, r#"{{"type":"assistant","sessionId":"abc123","timestamp":"2025-01-15T10:01:00Z","message":{{"role":"assistant","content":"Hi there"}}}}"#).unwrap();

        let path = PathBuf::from(&file_path);
        let result = parse_jsonl_session(&path);
        assert!(result.is_some());

        let session = result.unwrap();
        assert_eq!(session.session_id, Some("abc123".to_string()));
        assert_eq!(session.message_count, Some(2));
        assert_eq!(session.created, Some("2025-01-15T10:00:00Z".to_string()));
        assert_eq!(session.modified, Some("2025-01-15T10:01:00Z".to_string()));
        assert_eq!(session.git_branch, Some("main".to_string()));
    }

    #[test]
    fn parse_jsonl_session_less_than_two_messages_returns_none() {
        let dir = tempfile::tempdir().unwrap();
        let file_path = dir.path().join("session.jsonl");
        let mut file = fs::File::create(&file_path).unwrap();

        writeln!(file, r#"{{"type":"user","sessionId":"x","timestamp":"2025-01-01T00:00:00Z","message":{{"role":"user","content":"solo"}}}}"#).unwrap();

        let path = PathBuf::from(&file_path);
        assert!(parse_jsonl_session(&path).is_none());
    }

    #[test]
    fn parse_jsonl_session_empty_file_returns_none() {
        let dir = tempfile::tempdir().unwrap();
        let file_path = dir.path().join("session.jsonl");
        fs::File::create(&file_path).unwrap();

        let path = PathBuf::from(&file_path);
        assert!(parse_jsonl_session(&path).is_none());
    }

    #[test]
    fn parse_jsonl_session_malformed_json_lines_skipped() {
        let dir = tempfile::tempdir().unwrap();
        let file_path = dir.path().join("session.jsonl");
        let mut file = fs::File::create(&file_path).unwrap();

        writeln!(file, "not valid json").unwrap();
        writeln!(file, r#"{{"type":"user","sessionId":"s1","timestamp":"2025-01-01T00:00:00Z","message":{{"role":"user","content":"hello"}}}}"#).unwrap();
        writeln!(file, "{{broken").unwrap();
        writeln!(file, r#"{{"type":"assistant","sessionId":"s1","timestamp":"2025-01-01T00:01:00Z","message":{{"role":"assistant","content":"hi"}}}}"#).unwrap();

        let path = PathBuf::from(&file_path);
        let result = parse_jsonl_session(&path);
        assert!(result.is_some());
        assert_eq!(result.unwrap().message_count, Some(2));
    }

    // --- scan_jsonl_stats ---

    #[test]
    fn scan_jsonl_stats_counts_messages() {
        let dir = tempfile::tempdir().unwrap();
        let file_path = dir.path().join("stats.jsonl");
        let mut file = fs::File::create(&file_path).unwrap();

        writeln!(file, r#"{{"type":"user","timestamp":"2025-03-10T12:00:00Z","message":{{"role":"user","content":"hi"}}}}"#).unwrap();
        writeln!(file, r#"{{"type":"assistant","timestamp":"2025-03-10T12:01:00Z","message":{{"role":"assistant","content":"hello"}}}}"#).unwrap();
        writeln!(file, r#"{{"type":"user","timestamp":"2025-03-10T12:02:00Z","message":{{"role":"user","content":"bye"}}}}"#).unwrap();

        let path = PathBuf::from(&file_path);
        let result = scan_jsonl_stats(&path);
        assert!(result.is_some());
        let (date, msg_count, tool_count) = result.unwrap();
        assert_eq!(date, "2025-03-10");
        assert_eq!(msg_count, 3);
        assert_eq!(tool_count, 0);
    }

    #[test]
    fn scan_jsonl_stats_detects_tool_use_blocks() {
        let dir = tempfile::tempdir().unwrap();
        let file_path = dir.path().join("stats.jsonl");
        let mut file = fs::File::create(&file_path).unwrap();

        writeln!(file, r#"{{"type":"user","timestamp":"2025-06-01T00:00:00Z","message":{{"role":"user","content":"do something"}}}}"#).unwrap();
        writeln!(file, r#"{{"type":"assistant","timestamp":"2025-06-01T00:01:00Z","message":{{"role":"assistant","content":[{{"type":"text","text":"sure"}},{{"type":"tool_use","name":"bash","input":{{}}}}]}}}}"#).unwrap();

        let path = PathBuf::from(&file_path);
        let result = scan_jsonl_stats(&path);
        assert!(result.is_some());
        let (_date, msg_count, tool_count) = result.unwrap();
        assert_eq!(msg_count, 2);
        assert_eq!(tool_count, 1);
    }

    #[test]
    fn scan_jsonl_stats_extracts_date_from_timestamp() {
        let dir = tempfile::tempdir().unwrap();
        let file_path = dir.path().join("stats.jsonl");
        let mut file = fs::File::create(&file_path).unwrap();

        writeln!(file, r#"{{"type":"user","timestamp":"2024-12-25T08:30:00Z","message":{{"role":"user","content":"merry christmas"}}}}"#).unwrap();

        let path = PathBuf::from(&file_path);
        let result = scan_jsonl_stats(&path);
        assert!(result.is_some());
        assert_eq!(result.unwrap().0, "2024-12-25");
    }

    // --- get_candidate_sanitized_paths ---

    #[test]
    fn candidate_paths_always_includes_primary() {
        let candidates = get_candidate_sanitized_paths("/Users/me/project");
        assert!(!candidates.is_empty());
        assert_eq!(candidates[0], sanitize_path("/Users/me/project"));
    }

    #[test]
    fn candidate_paths_workspace_adds_desktop_variant() {
        let candidates = get_candidate_sanitized_paths("/Users/me/workspace/myapp");
        // Should have the primary sanitized path
        assert!(candidates.contains(&sanitize_path("/Users/me/workspace/myapp")));
        // Should also have Desktop variant
        assert!(candidates.contains(&sanitize_path("/Users/me/Desktop/myapp")));
    }

    #[test]
    fn candidate_paths_non_workspace_has_home_desktop_variant() {
        let candidates = get_candidate_sanitized_paths("/Users/me/projects/myapp");
        // Primary is always present
        assert!(candidates.contains(&sanitize_path("/Users/me/projects/myapp")));
        // No /workspace/ → /Desktop/ substitution variant
        assert!(!candidates.contains(&sanitize_path("/Users/me/Desktop/myapp")));
        // But the home_dir-based Desktop variant IS added (using the real home dir)
        if let Some(home) = dirs::home_dir() {
            let home_desktop = home.join("Desktop").join("myapp");
            assert!(candidates.contains(&sanitize_path(&home_desktop.to_string_lossy())));
        }
    }
}
