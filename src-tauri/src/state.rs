use portable_pty::{Child, MasterPty};
use std::collections::HashMap;
use std::io::Write;
use std::sync::{Arc, Mutex};

pub struct TerminalInstance {
    pub master: Box<dyn MasterPty + Send>,
    pub writer: Box<dyn Write + Send>,
    pub child: Box<dyn Child + Send>,
    #[allow(dead_code)]
    pub project_path: String,
    #[allow(dead_code)]
    pub is_claude_session: bool,
}

pub struct AppState {
    pub terminals: Arc<Mutex<HashMap<String, TerminalInstance>>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            terminals: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}
