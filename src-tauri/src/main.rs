#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        // Autostart plugin: enabled by default on install
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--hidden"]), // enable at install/update by default
        ))
        // Filesystem plugin for desktop persistence
        .plugin(tauri_plugin_fs::init())
        .setup(|_app| {
            // Place any setup you need here. For now, nothing.
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}