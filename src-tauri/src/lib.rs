mod commands;
mod state;

use state::AppState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .build(),
        )
        .plugin(tauri_plugin_shell::init())
        .manage(AppState::new())
        .invoke_handler(tauri::generate_handler![
            commands::terminal::spawn_terminal,
            commands::terminal::write_to_terminal,
            commands::terminal::resize_terminal,
            commands::terminal::close_terminal,
            commands::terminal::check_claude_cli,
            commands::claude_data::get_sessions_for_project,
            commands::claude_data::read_claude_md,
            commands::projects::scan_workspace,
            commands::projects::get_project_info,
            commands::projects::get_workspace_context,
            commands::claude_data::get_claude_usage_stats,
            commands::skills::get_skills,
            commands::skills::install_skill,
            commands::skills::uninstall_skill,
            commands::skills::check_skills_installed,
            commands::github::get_github_items,
        ])
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                // Kill all PTY processes on window close
                if let Some(state) = window.try_state::<AppState>() {
                    if let Ok(mut terminals) = state.terminals.lock() {
                        terminals.clear();
                    }
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
