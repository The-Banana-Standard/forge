use portable_pty::{Child, MasterPty};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::Write;
use std::sync::atomic::AtomicBool;
use std::sync::{Arc, Mutex};

pub struct TerminalInstance {
    pub master: Box<dyn MasterPty + Send>,
    pub writer: Box<dyn Write + Send>,
    pub child: Box<dyn Child + Send>,
    #[allow(dead_code)]
    pub project_path: String,
    #[allow(dead_code)]
    pub is_claude_session: bool,
    #[allow(dead_code)]
    pub has_output: Arc<AtomicBool>,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum Provider {
    #[default]
    Direct,
    Bedrock,
    Vertex,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderSettings {
    pub provider: Provider,
    pub aws_region: Option<String>,
    pub aws_profile: Option<String>,
    pub aws_access_key_id: Option<String>,
    pub aws_secret_access_key: Option<String>,
    pub aws_session_token: Option<String>,
    pub gcp_project_id: Option<String>,
    pub gcp_region: Option<String>,
    pub model_override: Option<String>,
}

pub struct AppState {
    pub terminals: Arc<Mutex<HashMap<String, TerminalInstance>>>,
    pub provider_settings: Arc<Mutex<Option<ProviderSettings>>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            terminals: Arc::new(Mutex::new(HashMap::new())),
            provider_settings: Arc::new(Mutex::new(None)),
        }
    }
}
