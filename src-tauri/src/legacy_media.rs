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
    use windows::core::{Interface, GUID};
    use windows::Win32::Media::Audio::{
        eMultimedia, eRender, AudioSessionStateActive, IAudioSessionControl2,
        IAudioSessionManager2, IMMDeviceEnumerator,
    };
    use windows::Win32::System::Com::{
        CoCreateInstance, CoInitializeEx, CLSCTX_ALL, COINIT_MULTITHREADED,
    };
    use windows::Win32::UI::Input::KeyboardAndMouse::{
        keybd_event, KEYEVENTF_KEYUP, VK_LEFT, VK_RIGHT,
    };
    use windows::Win32::UI::WindowsAndMessaging::{
        EnumWindows, GetClassNameW, GetWindowTextW, GetWindowThreadProcessId,
    };

    const NETEASE_CLASS: &str = "OrpheusBrowserHost";
    const VK_CONTROL: u8 = 0x11;
    const VK_MENU: u8 = 0x12;
    const VK_P: u8 = 0x50;
    const CLSID_MM_DEVICE_ENUMERATOR: GUID =
        GUID::from_u128(0xBCDE0395_E52F_467C_8E3D_C4579291692E);

    #[derive(Clone)]
    struct PlayerWindow {
        title: String,
        process_id: u32,
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
        let mut process_id = 0u32;
        let _ = GetWindowThreadProcessId(hwnd, Some(&mut process_id));
        *found = Some(PlayerWindow { title, process_id });
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

    fn audio_status(process_id: u32) -> &'static str {
        unsafe {
            let _ = CoInitializeEx(None, COINIT_MULTITHREADED);
            let Ok(enumerator) = CoCreateInstance::<_, IMMDeviceEnumerator>(
                &CLSID_MM_DEVICE_ENUMERATOR,
                None,
                CLSCTX_ALL,
            ) else {
                return "unknown";
            };
            let Ok(device) = enumerator.GetDefaultAudioEndpoint(eRender, eMultimedia) else {
                return "unknown";
            };
            let Ok(manager) = device.Activate::<IAudioSessionManager2>(CLSCTX_ALL, None) else {
                return "unknown";
            };
            let Ok(sessions) = manager.GetSessionEnumerator() else {
                return "unknown";
            };
            let count = sessions.GetCount().unwrap_or(0);
            let mut found = false;
            for index in 0..count {
                let Ok(control) = sessions.GetSession(index) else {
                    continue;
                };
                let Ok(control) = control.cast::<IAudioSessionControl2>() else {
                    continue;
                };
                if control.GetProcessId().ok() != Some(process_id) {
                    continue;
                }
                found = true;
                if control.GetState().ok() == Some(AudioSessionStateActive) {
                    return "playing";
                }
            }
            if found { "paused" } else { "unknown" }
        }
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
            status: audio_status(window.process_id).into(),
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

    fn send_net_ease_hotkey(vk: u8) {
        unsafe {
            keybd_event(VK_CONTROL, 0, Default::default(), 0);
            keybd_event(VK_MENU, 0, Default::default(), 0);
            keybd_event(vk, 0, Default::default(), 0);
            keybd_event(vk, 0, KEYEVENTF_KEYUP, 0);
            keybd_event(VK_MENU, 0, KEYEVENTF_KEYUP, 0);
            keybd_event(VK_CONTROL, 0, KEYEVENTF_KEYUP, 0);
        }
    }

    pub fn control(action: &str) -> Result<bool, String> {
        let vk = match action {
            "play" | "pause" | "toggle" => VK_P,
            "next" => VK_RIGHT.0 as u8,
            "previous" => VK_LEFT.0 as u8,
            _ => return Err(format!("不支持的兼容媒体操作：{action}")),
        };
        send_net_ease_hotkey(vk);
        Ok(true)
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
