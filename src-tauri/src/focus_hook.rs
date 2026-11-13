use std::sync::atomic::{AtomicIsize, Ordering};
use std::sync::OnceLock;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};
use windows::Win32::UI::Input::KeyboardAndMouse::{GetAsyncKeyState, VK_CONTROL, VK_F, VK_SHIFT};
use windows::Win32::UI::WindowsAndMessaging::GetForegroundWindow;

static APP: OnceLock<AppHandle> = OnceLock::new();
static WINDOW_HANDLE: AtomicIsize = AtomicIsize::new(0);

fn key_down(key: u16) -> bool {
    unsafe { GetAsyncKeyState(key as i32) < 0 }
}

/// The Microsoft Pinyin IME owns Ctrl+Shift+F, so WebView2 never receives a
/// keydown for it. Poll only while the PaperScape window is foreground and
/// detect an edge; the thread exits with the process.
pub fn install(app: &AppHandle) {
    let Some(window) = app.get_webview_window("main") else {
        return;
    };
    let Ok(handle) = window.hwnd() else {
        return;
    };
    if APP.set(app.clone()).is_err() {
        return;
    }
    WINDOW_HANDLE.store(handle.0 as isize, Ordering::Relaxed);
    std::thread::spawn(move || {
        let mut pressed = false;
        loop {
            let foreground = unsafe { GetForegroundWindow() }.0 as isize;
            let active = foreground == WINDOW_HANDLE.load(Ordering::Relaxed);
            let combo =
                active && key_down(VK_CONTROL.0) && key_down(VK_SHIFT.0) && key_down(VK_F.0);
            if combo && !pressed {
                if let Some(app) = APP.get() {
                    let _ = app.emit("toggle-focus-shortcut", ());
                }
            }
            pressed = combo;
            std::thread::sleep(Duration::from_millis(20));
        }
    });
}
