use tauri::{LogicalSize, Manager};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                if let Ok(Some(monitor)) = window.current_monitor() {
                    let logical = monitor.size().to_logical::<f64>(monitor.scale_factor());
                    let width = (logical.width * 0.88).clamp(960.0, 1280.0);
                    let height = ((logical.height - 64.0) * 0.92).clamp(640.0, 820.0);
                    window.set_size(LogicalSize::new(width, height))?;
                    window.center()?;
                }
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("启动 PaperScape 失败");
}
