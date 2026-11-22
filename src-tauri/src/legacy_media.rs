use serde::Serialize;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LegacySession {
    pub id: String,
    pub source_app_id: String,
    pub source_name: String,
    pub title: String,
    pub artist: String,
    pub album: String,
    pub status: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LegacyState {
    pub available: bool,
    pub platform: String,
    pub session_id: String,
    pub source_app_id: String,
    pub source_name: String,
    pub title: String,
    pub artist: String,
    pub album: String,
    pub status: String,
    pub position_ms: i64,
    pub duration_ms: i64,
    pub cover: String,
    pub can_play: bool,
    pub can_pause: bool,
    pub can_next: bool,
    pub can_previous: bool,
    pub can_seek: bool,
}

#[cfg(windows)]
mod platform {
    use super::*;
    use windows::core::BOOL;
    use windows::Win32::Foundation::{HWND, LPARAM};
    use windows::Win32::UI::WindowsAndMessaging::{
        EnumWindows, GetClassNameW, GetWindowTextW,
    };

    const NETEASE_CLASS: &str = "OrpheusBrowserHost";
    const WM_APPCOMMAND: u32 = 0x0319;
    const APPCOMMAND_MEDIA_NEXTTRACK: usize = 11;
    const APPCOMMAND_MEDIA_PREVIOUSTRACK: usize = 12;
    const APPCOMMAND_MEDIA_PLAY_PAUSE: usize = 14;

    #[derive(Clone)]
    struct PlayerWindow {
        hwnd: HWND,
        title: String,
    }

    fn read_title(hwnd: HWND) -> String {
        let mut buffer = [0u16; 512];
        let length = unsafe { GetWindowTextW(hwnd, &mut buffer) };
        String::from_utf16_lossy(&buffer[..length.max(0) as usize])
    }

    fn read_class(hwnd: HWND) -> String {
        let mut buffer = [0u16; 256];
        let length = unsafe { GetClassNameW(hwnd, &mut buffer) };
        String::from_utf16_lossy(&buffer[..length.max(0) as usize])
    }

    unsafe extern "system" fn enum_window(hwnd: HWND, lparam: LPARAM) -> BOOL {
        let found = &mut *(lparam.0 as *mut Option<PlayerWindow>);
        if found.is_some() {
            return BOOL(0);
        }
        if read_class(hwnd) != NETEASE_CLASS {
            return BOOL(1);
        }
        let title = read_title(hwnd);
        if title.trim().is_empty() {
            return BOOL(1);
        }
        *found = Some(PlayerWindow { hwnd, title });
        BOOL(0)
    }

    fn find_window() -> Option<PlayerWindow> {
        let mut found: Option<PlayerWindow> = None;
        unsafe {
            let _ = EnumWindows(
                Some(enum_window),
                LPARAM(&mut found as *mut Option<PlayerWindow> as isize),
            );
        }
        found
    }

    fn parse_title(raw: &str) -> (String, String, String) {
        let raw = raw.trim();
        let (title, rest) = raw.rsplit_once(" - ").unwrap_or((raw, ""));
        let (artist, album) = rest.split_once('/').unwrap_or((rest, ""));
        (
            title.trim().to_string(),
            artist.trim().to_string(),
            album.trim().to_string(),
        )
    }

    fn session_id() -> &'static str {
        "legacy:cloudmusic"
    }

    pub fn available() -> bool {
        find_window().is_some()
    }

    pub fn session() -> Option<LegacySession> {
        let window = find_window()?;
        let (title, artist, album) = parse_title(&window.title);
        Some(LegacySession {
            id: session_id().into(),
            source_app_id: "cloudmusic.exe".into(),
            source_name: "网易云音乐（兼容模式）".into(),
            title,
            artist,
            album,
            status: "unknown".into(),
        })
    }

    pub fn state() -> Option<LegacyState> {
        let session = session()?;
        Some(LegacyState {
            available: true,
            platform: "windows-legacy".into(),
            session_id: session.id,
            source_app_id: session.source_app_id,
            source_name: session.source_name,
            title: session.title,
            artist: session.artist,
            album: session.album,
            status: session.status,
            position_ms: 0,
            duration_ms: 0,
            cover: String::new(),
            can_play: true,
            can_pause: true,
            can_next: true,
            can_previous: true,
            can_seek: false,
        })
    }

    fn send_app_command(command: usize) -> Result<bool, String> {
        let window = find_window().ok_or_else(|| "网易云音乐窗口不存在".to_string())?;
        let result = unsafe {
            windows::Win32::UI::WindowsAndMessaging::PostMessageW(
                Some(window.hwnd),
                WM_APPCOMMAND,
                windows::Win32::Foundation::WPARAM(0),
                LPARAM((command << 16) as isize),
            )
        };
        Ok(result.is_ok())
    }

    pub fn control(action: &str) -> Result<bool, String> {
        let command = match action {
            "play" | "pause" | "toggle" => APPCOMMAND_MEDIA_PLAY_PAUSE,
            "next" => APPCOMMAND_MEDIA_NEXTTRACK,
            "previous" => APPCOMMAND_MEDIA_PREVIOUSTRACK,
            _ => return Err(format!("不支持的兼容媒体操作：{action}")),
        };
        send_app_command(command)
    }

    pub fn seek(_position_ms: i64) -> Result<bool, String> {
        Err("兼容模式不支持播放进度调整".into())
    }
}

#[cfg(not(windows))]
mod platform {
    use super::*;

    pub fn available() -> bool {
        false
    }

    pub fn session() -> Option<LegacySession> {
        None
    }

    pub fn state() -> Option<LegacyState> {
        None
    }

    pub fn control(_action: &str) -> Result<bool, String> {
        Err("当前平台不支持兼容媒体控制".into())
    }

    pub fn seek(_position_ms: i64) -> Result<bool, String> {
        Err("当前平台不支持兼容媒体控制".into())
    }
}

pub fn available() -> bool {
    platform::available()
}

pub fn list_sessions() -> Vec<LegacySession> {
    platform::session().into_iter().collect()
}

pub fn state(session_id: &str) -> Result<LegacyState, String> {
    if session_id != "legacy:cloudmusic" {
        return Err("未知的兼容媒体会话".into());
    }
    platform::state().ok_or_else(|| "网易云音乐窗口不存在".into())
}

pub fn control(action: &str) -> Result<bool, String> {
    platform::control(action)
}

pub fn seek(position_ms: i64) -> Result<bool, String> {
    platform::seek(position_ms)
}
