use super::terminal::ensure_full_path;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::fs;
use std::path::PathBuf;
use std::process::Command;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitHubPr {
    pub number: u64,
    pub title: String,
    pub author: String,
    pub repo_name: String,
    pub project_path: String,
    pub url: String,
    pub created_at: String,
    pub draft: bool,
    pub review_decision: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitHubIssue {
    pub number: u64,
    pub title: String,
    pub repo_name: String,
    pub project_path: String,
    pub url: String,
    pub created_at: String,
    pub labels: Vec<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitHubData {
    pub prs: Vec<GitHubPr>,
    pub issues: Vec<GitHubIssue>,
    pub error: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct GhPrJson {
    number: u64,
    title: String,
    author: Option<GhAuthor>,
    url: Option<String>,
    created_at: Option<String>,
    is_draft: Option<bool>,
    review_decision: Option<String>,
}

#[derive(Debug, Deserialize)]
struct GhAuthor {
    login: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct GhIssueJson {
    number: u64,
    title: String,
    url: Option<String>,
    created_at: Option<String>,
    labels: Option<Vec<GhLabel>>,
}

#[derive(Debug, Deserialize)]
struct GhLabel {
    name: String,
}

/// Extract GitHub owner/repo from a git remote URL.
fn parse_github_remote(url: &str) -> Option<String> {
    // SSH: git@github.com:owner/repo.git
    if let Some(rest) = url.strip_prefix("git@github.com:") {
        let repo = rest.trim_end_matches(".git").trim();
        if repo.contains('/') {
            return Some(repo.to_string());
        }
    }
    // HTTPS: https://github.com/owner/repo.git
    if url.contains("github.com/") {
        if let Some(idx) = url.find("github.com/") {
            let rest = &url[idx + "github.com/".len()..];
            let repo = rest.trim_end_matches(".git").trim_end_matches('/');
            if repo.contains('/') && repo.matches('/').count() == 1 {
                return Some(repo.to_string());
            }
        }
    }
    None
}

/// Find GitHub owner/repo for a project by parsing .git/config
fn find_github_repo(project_path: &str) -> Option<String> {
    let git_config = PathBuf::from(project_path).join(".git/config");
    let content = fs::read_to_string(git_config).ok()?;

    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with("url = ") {
            let url = trimmed.strip_prefix("url = ")?;
            if let Some(repo) = parse_github_remote(url) {
                return Some(repo);
            }
        }
    }
    None
}

#[tauri::command]
pub async fn get_github_items(project_paths: Vec<String>) -> GitHubData {
    // Check if gh CLI is available
    let full_path = ensure_full_path();
    let gh_check = Command::new("gh").arg("--version").env("PATH", &full_path).output();
    if !matches!(gh_check, Ok(ref o) if o.status.success()) {
        return GitHubData {
            prs: vec![],
            issues: vec![],
            error: Some("gh CLI not found".to_string()),
        };
    }

    // Collect unique repos and map repo -> project path
    let mut seen_repos = HashSet::new();
    let mut repo_to_path: Vec<(String, String)> = Vec::new();

    for path in &project_paths {
        if let Some(repo) = find_github_repo(path) {
            if seen_repos.insert(repo.clone()) {
                repo_to_path.push((repo, path.clone()));
            }
        }
    }

    // Spawn all gh CLI calls in parallel
    let mut handles = Vec::new();

    for (repo, project_path) in repo_to_path {
        let repo_clone = repo.clone();
        let path_clone = project_path.clone();
        let task_path = full_path.clone();
        handles.push(tokio::task::spawn_blocking(move || {
            let repo_short = repo_clone.rsplit('/').next().unwrap_or(&repo_clone).to_string();
            let mut prs = Vec::new();
            let mut issues = Vec::new();

            // Fetch PRs authored by the current user
            if let Ok(output) = Command::new("gh")
                .args([
                    "pr", "list",
                    "--author", "@me",
                    "--json", "number,title,author,url,createdAt,isDraft,reviewDecision",
                    "--repo", &repo_clone,
                ])
                .env("PATH", &task_path)
                .output()
            {
                if output.status.success() {
                    if let Ok(raw_prs) = serde_json::from_slice::<Vec<GhPrJson>>(&output.stdout) {
                        for pr in raw_prs {
                            prs.push(GitHubPr {
                                number: pr.number,
                                title: pr.title,
                                author: pr.author
                                    .and_then(|a| a.login)
                                    .unwrap_or_default(),
                                repo_name: repo_short.clone(),
                                project_path: path_clone.clone(),
                                url: pr.url.unwrap_or_default(),
                                created_at: pr.created_at.unwrap_or_default(),
                                draft: pr.is_draft.unwrap_or(false),
                                review_decision: pr.review_decision,
                            });
                        }
                    }
                }
            }

            // Also fetch PRs where I'm requested as reviewer
            if let Ok(output) = Command::new("gh")
                .args([
                    "search", "prs",
                    "--review-requested", "@me",
                    "--state", "open",
                    "--json", "number,title,author,url,createdAt,isDraft,reviewDecision",
                    "--repo", &repo_clone,
                ])
                .env("PATH", &task_path)
                .output()
            {
                if output.status.success() {
                    if let Ok(raw_prs) = serde_json::from_slice::<Vec<GhPrJson>>(&output.stdout) {
                        let existing_numbers: HashSet<u64> = prs.iter().map(|p| p.number).collect();
                        for pr in raw_prs {
                            if !existing_numbers.contains(&pr.number) {
                                prs.push(GitHubPr {
                                    number: pr.number,
                                    title: pr.title,
                                    author: pr.author
                                        .and_then(|a| a.login)
                                        .unwrap_or_default(),
                                    repo_name: repo_short.clone(),
                                    project_path: path_clone.clone(),
                                    url: pr.url.unwrap_or_default(),
                                    created_at: pr.created_at.unwrap_or_default(),
                                    draft: pr.is_draft.unwrap_or(false),
                                    review_decision: pr.review_decision,
                                });
                            }
                        }
                    }
                }
            }

            // Fetch assigned issues
            if let Ok(output) = Command::new("gh")
                .args([
                    "issue", "list",
                    "--assignee", "@me",
                    "--json", "number,title,url,createdAt,labels",
                    "--repo", &repo_clone,
                ])
                .env("PATH", &task_path)
                .output()
            {
                if output.status.success() {
                    if let Ok(raw_issues) = serde_json::from_slice::<Vec<GhIssueJson>>(&output.stdout) {
                        for issue in raw_issues {
                            issues.push(GitHubIssue {
                                number: issue.number,
                                title: issue.title,
                                repo_name: repo_short.clone(),
                                project_path: path_clone.clone(),
                                url: issue.url.unwrap_or_default(),
                                created_at: issue.created_at.unwrap_or_default(),
                                labels: issue.labels
                                    .unwrap_or_default()
                                    .into_iter()
                                    .map(|l| l.name)
                                    .collect(),
                            });
                        }
                    }
                }
            }

            (prs, issues)
        }));
    }

    let mut all_prs: Vec<GitHubPr> = Vec::new();
    let mut all_issues: Vec<GitHubIssue> = Vec::new();

    for handle in handles {
        if let Ok((prs, issues)) = handle.await {
            all_prs.extend(prs);
            all_issues.extend(issues);
        }
    }

    GitHubData {
        prs: all_prs,
        issues: all_issues,
        error: None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_github_remote_ssh() {
        assert_eq!(
            parse_github_remote("git@github.com:owner/repo.git"),
            Some("owner/repo".to_string())
        );
    }

    #[test]
    fn parse_github_remote_https() {
        assert_eq!(
            parse_github_remote("https://github.com/owner/repo"),
            Some("owner/repo".to_string())
        );
    }

    #[test]
    fn parse_github_remote_https_with_git_suffix() {
        assert_eq!(
            parse_github_remote("https://github.com/owner/repo.git"),
            Some("owner/repo".to_string())
        );
    }

    #[test]
    fn parse_github_remote_trailing_slash() {
        assert_eq!(
            parse_github_remote("https://github.com/owner/repo/"),
            Some("owner/repo".to_string())
        );
    }

    #[test]
    fn parse_github_remote_invalid_url_returns_none() {
        assert_eq!(parse_github_remote("not-a-url"), None);
    }

    #[test]
    fn parse_github_remote_non_github_url_returns_none() {
        assert_eq!(
            parse_github_remote("https://gitlab.com/owner/repo"),
            None
        );
    }

    // --- find_github_repo ---

    #[test]
    fn find_github_repo_ssh_remote() {
        let dir = tempfile::tempdir().unwrap();
        let git_dir = dir.path().join(".git");
        std::fs::create_dir(&git_dir).unwrap();
        std::fs::write(
            git_dir.join("config"),
            "[remote \"origin\"]\n\turl = git@github.com:owner/repo.git\n\tfetch = +refs/heads/*:refs/remotes/origin/*\n",
        ).unwrap();

        let result = find_github_repo(&dir.path().to_string_lossy());
        assert_eq!(result, Some("owner/repo".to_string()));
    }

    #[test]
    fn find_github_repo_https_remote() {
        let dir = tempfile::tempdir().unwrap();
        let git_dir = dir.path().join(".git");
        std::fs::create_dir(&git_dir).unwrap();
        std::fs::write(
            git_dir.join("config"),
            "[remote \"origin\"]\n\turl = https://github.com/user/project.git\n",
        ).unwrap();

        let result = find_github_repo(&dir.path().to_string_lossy());
        assert_eq!(result, Some("user/project".to_string()));
    }

    #[test]
    fn find_github_repo_no_remote_returns_none() {
        let dir = tempfile::tempdir().unwrap();
        let git_dir = dir.path().join(".git");
        std::fs::create_dir(&git_dir).unwrap();
        std::fs::write(
            git_dir.join("config"),
            "[core]\n\trepositoryformatversion = 0\n",
        ).unwrap();

        let result = find_github_repo(&dir.path().to_string_lossy());
        assert_eq!(result, None);
    }

    #[test]
    fn find_github_repo_no_git_dir_returns_none() {
        let dir = tempfile::tempdir().unwrap();
        let result = find_github_repo(&dir.path().to_string_lossy());
        assert_eq!(result, None);
    }
}
