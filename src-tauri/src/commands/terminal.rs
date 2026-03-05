use crate::state::AppState;
use portable_pty::{CommandBuilder, NativePtySystem, PtySize, PtySystem};
use serde::Serialize;
use std::io::{Read, Write};
use std::sync::Arc;
use tauri::{ipc::Channel, State};

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ClaudeCliStatus {
    pub available: bool,
    pub path: Option<String>,
}

#[tauri::command]
pub fn check_claude_cli() -> ClaudeCliStatus {
    match std::process::Command::new("which").arg("claude").output() {
        Ok(output) if output.status.success() => {
            let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
            ClaudeCliStatus {
                available: true,
                path: Some(path),
            }
        }
        _ => ClaudeCliStatus {
            available: false,
            path: None,
        },
    }
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase", tag = "type")]
pub enum TerminalEvent {
    Output { data: Vec<u8> },
    Exit { code: Option<i32> },
}

#[tauri::command]
pub fn spawn_terminal(
    state: State<'_, AppState>,
    project_path: String,
    is_claude_session: bool,
    session_id: Option<String>,
    initial_command: Option<String>,
    system_prompt: Option<String>,
    on_event: Channel<TerminalEvent>,
) -> Result<String, String> {
    let terminal_id = uuid::Uuid::new_v4().to_string();

    let pty_system = NativePtySystem::default();

    let pair = pty_system
        .openpty(PtySize {
            rows: 24,
            cols: 80,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| format!("Failed to open PTY: {}", e))?;

    let mut cmd = if is_claude_session {
        let mut c = CommandBuilder::new("claude");
        if let Some(ref sid) = session_id {
            c.arg("--resume");
            c.arg(sid);
        }
        // Pass system prompt as CLI arg — invisible to the user
        if let Some(ref sp) = system_prompt {
            c.arg("--system-prompt");
            c.arg(sp);
        }
        c
    } else {
        let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string());
        CommandBuilder::new(shell)
    };

    cmd.cwd(&project_path);

    // Clear env and rebuild without Claude Code vars to avoid nested session errors
    cmd.env_clear();
    for (key, value) in std::env::vars() {
        if key.starts_with("CLAUDECODE") || key.starts_with("CLAUDE_CODE") {
            continue;
        }
        cmd.env(key, value);
    }
    cmd.env("TERM", "xterm-256color");

    let _child = pair
        .slave
        .spawn_command(cmd)
        .map_err(|e| format!("Failed to spawn: {}", e))?;

    // Drop slave immediately — we use master
    drop(pair.slave);

    let mut reader = pair
        .master
        .try_clone_reader()
        .map_err(|e| format!("Failed to clone reader: {}", e))?;

    let writer = pair
        .master
        .take_writer()
        .map_err(|e| format!("Failed to take writer: {}", e))?;

    // Store terminal instance
    {
        let mut terminals = state.terminals.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
        terminals.insert(
            terminal_id.clone(),
            crate::state::TerminalInstance {
                master: pair.master,
                writer,
                project_path: project_path.clone(),
                is_claude_session,
            },
        );
    }

    // Spawn reader thread
    let tid = terminal_id.clone();
    let terminals_ref = Arc::clone(&state.terminals);
    std::thread::spawn(move || {
        let mut buf = [0u8; 4096];
        loop {
            match reader.read(&mut buf) {
                Ok(0) => {
                    let _ = on_event.send(TerminalEvent::Exit { code: Some(0) });
                    break;
                }
                Ok(n) => {
                    let _ = on_event.send(TerminalEvent::Output {
                        data: buf[..n].to_vec(),
                    });
                }
                Err(_) => {
                    let _ = on_event.send(TerminalEvent::Exit { code: None });
                    break;
                }
            }
        }
        // Clean up
        if let Ok(mut terminals) = terminals_ref.lock() {
            terminals.remove(&tid);
        }
    });

    // Send initial command after a delay if provided
    if let Some(cmd) = initial_command {
        let tid2 = terminal_id.clone();
        let terminals_ref2 = Arc::clone(&state.terminals);
        std::thread::spawn(move || {
            std::thread::sleep(std::time::Duration::from_millis(2000));
            let Ok(mut terminals) = terminals_ref2.lock() else { return };
            if let Some(term) = terminals.get_mut(&tid2) {
                let _ = term.writer.write_all(cmd.as_bytes());
                let _ = term.writer.write_all(b"\n");
                let _ = term.writer.flush();
            }
        });
    }

    Ok(terminal_id)
}

#[tauri::command]
pub fn write_to_terminal(
    state: State<'_, AppState>,
    terminal_id: String,
    data: String,
) -> Result<(), String> {
    let mut terminals = state.terminals.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    if let Some(term) = terminals.get_mut(&terminal_id) {
        term.writer
            .write_all(data.as_bytes())
            .map_err(|e| format!("Write failed: {}", e))?;
        term.writer
            .flush()
            .map_err(|e| format!("Flush failed: {}", e))?;
        Ok(())
    } else {
        Err("Terminal not found".to_string())
    }
}

#[tauri::command]
pub fn resize_terminal(
    state: State<'_, AppState>,
    terminal_id: String,
    rows: u16,
    cols: u16,
) -> Result<(), String> {
    let terminals = state.terminals.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    if let Some(term) = terminals.get(&terminal_id) {
        term.master
            .resize(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| format!("Resize failed: {}", e))?;
        Ok(())
    } else {
        Err("Terminal not found".to_string())
    }
}

#[tauri::command]
pub fn close_terminal(state: State<'_, AppState>, terminal_id: String) -> Result<(), String> {
    let mut terminals = state.terminals.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    // Just removing it will drop the master PTY which signals the child
    terminals.remove(&terminal_id);
    Ok(())
}
