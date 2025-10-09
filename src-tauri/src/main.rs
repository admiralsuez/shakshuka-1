#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[tauri::command]
async fn open_in_browser() -> Result<(), String> {
    let url = "http://localhost:3000";
    
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(["/C", "start", url])
            .spawn()
            .map_err(|e| format!("Failed to open browser: {}", e))?;
    }
    
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(url)
            .spawn()
            .map_err(|e| format!("Failed to open browser: {}", e))?;
    }
    
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(url)
            .spawn()
            .map_err(|e| format!("Failed to open browser: {}", e))?;
    }
    
    Ok(())
}

fn main() {
    tauri::Builder::default()
        // Autostart plugin: enabled by default on install
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--hidden"]), // enable at install/update by default
        ))
        // Filesystem plugin for desktop persistence
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![open_in_browser])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}