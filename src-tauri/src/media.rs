use serde::Serialize;
use std::collections::HashMap;
use std::sync::{Mutex, OnceLock};

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaSessionSummary {
    pub id: String,
    pub source_app_id: String,
    pub source_name: String,
    pub title: String,
    pub artist: String,
    pub album: String,
    pub status: String,
    pub is_current: bool,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaState {
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

impl MediaState {
    #[cfg_attr(windows, allow(dead_code))]
    fn unavailable() -> Self {
        Self {
            available: false,
            platform: "windows-gsmtc".into(),
            session_id: String::new(),
            source_app_id: String::new(),
            source_name: String::new(),
            title: String::new(),
            artist: String::new(),
            album: String::new(),
            status: "unavailable".into(),
            position_ms: 0,
            duration_ms: 0,
            cover: String::new(),
            can_play: false,
            can_pause: false,
            can_next: false,
            can_previous: false,
            can_seek: false,
        }
    }
}

fn cover_cache() -> &'static Mutex<HashMap<String, String>> {
    static CACHE: OnceLock<Mutex<HashMap<String, String>>> = OnceLock::new();
    CACHE.get_or_init(|| Mutex::new(HashMap::new()))
}

#[cfg(windows)]
mod platform {
    use super::*;
    use base64::Engine;
    use windows_collections::IVectorView;
    use windows::Media::Control::{
        GlobalSystemMediaTransportControlsSession,
        GlobalSystemMediaTransportControlsSessionManager,
        GlobalSystemMediaTransportControlsSessionPlaybackStatus,
    };
    use windows::Storage::Streams::DataReader;
    use windows::Win32::System::WinRT::{RoInitialize, RO_INIT_MULTITHREADED};

    fn initialize() {
        let _ = unsafe { RoInitialize(RO_INIT_MULTITHREADED) };
    }

    fn manager() -> Result<GlobalSystemMediaTransportControlsSessionManager, String> {
        initialize();
        GlobalSystemMediaTransportControlsSessionManager::RequestAsync()
            .map_err(|error| error.to_string())?
            .join()
            .map_err(|error| error.to_string())
    }

    fn friendly_source(app_id: &str) -> String {
        let lower = app_id.to_lowercase();
        if lower.contains("qqmusic") {
            "QQ 音乐".into()
        } else if lower.contains("cloudmusic") || lower.contains("netease") {
            "网易云音乐".into()
        } else if lower.contains("spotify") {
            "Spotify".into()
        } else if lower.contains("msedge") {
            "Microsoft Edge".into()
        } else if lower.contains("chrome") {
            "Google Chrome".into()
        } else if lower.contains("zunemusic") || lower.contains("mediaplayer") {
            "Windows 媒体播放器".into()
        } else if app_id.is_empty() {
            "系统媒体".into()
        } else {
            app_id.to_string()
        }
    }

    fn app_id(session: &GlobalSystemMediaTransportControlsSession) -> String {
        session
            .SourceAppUserModelId()
            .map(|value| value.to_string())
            .unwrap_or_default()
    }

    fn status_text(status: GlobalSystemMediaTransportControlsSessionPlaybackStatus) -> &'static str {
        match status {
            GlobalSystemMediaTransportControlsSessionPlaybackStatus::Playing => "playing",
            GlobalSystemMediaTransportControlsSessionPlaybackStatus::Paused => "paused",
            GlobalSystemMediaTransportControlsSessionPlaybackStatus::Stopped => "stopped",
            GlobalSystemMediaTransportControlsSessionPlaybackStatus::Changing => "changing",
            GlobalSystemMediaTransportControlsSessionPlaybackStatus::Closed => "closed",
            _ => "opened",
        }
    }

    fn status_of(session: &GlobalSystemMediaTransportControlsSession) -> String {
        session
            .GetPlaybackInfo()
            .and_then(|info| info.PlaybackStatus())
            .map(status_text)
            .unwrap_or("opened")
            .to_string()
    }

    fn properties(
        session: &GlobalSystemMediaTransportControlsSession,
    ) -> (String, String, String, String) {
        let Ok(properties) = session.TryGetMediaPropertiesAsync().and_then(|value| value.join()) else {
            return (String::new(), String::new(), String::new(), String::new());
        };
        let title = properties.Title().map(|value| value.to_string()).unwrap_or_default();
        let artist = properties.Artist().map(|value| value.to_string()).unwrap_or_default();
        let album = properties.AlbumTitle().map(|value| value.to_string()).unwrap_or_default();
        let cover = media_cover(session)
            .unwrap_or_default();
        (title, artist, album, cover)
    }

    fn media_cover(
        session: &GlobalSystemMediaTransportControlsSession,
    ) -> Result<String, String> {
        let properties = session
            .TryGetMediaPropertiesAsync()
            .map_err(|error| error.to_string())?
            .join()
            .map_err(|error| error.to_string())?;
        let app = app_id(session);
        let title = properties.Title().map(|value| value.to_string()).unwrap_or_default();
        let artist = properties.Artist().map(|value| value.to_string()).unwrap_or_default();
        let cache_key = format!("{app}|{title}|{artist}");
        if let Ok(cache) = cover_cache().lock() {
            if let Some(value) = cache.get(&cache_key) {
                return Ok(value.clone());
            }
        }
        let thumbnail = properties.Thumbnail().map_err(|error| error.to_string())?;
        let stream = thumbnail
            .OpenReadAsync()
            .map_err(|error| error.to_string())?
            .join()
            .map_err(|error| error.to_string())?;
        let size = stream.Size().map_err(|error| error.to_string())? as u32;
        if size == 0 || size > 8 * 1024 * 1024 {
            return Ok(String::new());
        }
        let reader = DataReader::CreateDataReader(&stream).map_err(|error| error.to_string())?;
        reader
            .LoadAsync(size)
            .map_err(|error| error.to_string())?
            .join()
            .map_err(|error| error.to_string())?;
        let mut bytes = vec![0u8; size as usize];
        reader.ReadBytes(&mut bytes).map_err(|error| error.to_string())?;
        let encoded = base64::engine::general_purpose::STANDARD.encode(bytes);
        let data_url = format!("data:image/png;base64,{encoded}");
        if let Ok(mut cache) = cover_cache().lock() {
            if cache.len() > 40 {
                cache.clear();
            }
            cache.insert(cache_key, data_url.clone());
        }
        Ok(data_url)
    }

    fn sessions() -> Result<Vec<GlobalSystemMediaTransportControlsSession>, String> {
        let manager = manager()?;
        let list: IVectorView<GlobalSystemMediaTransportControlsSession> =
            manager.GetSessions().map_err(|error| error.to_string())?;
        let mut result = Vec::new();
        for index in 0..list.Size().unwrap_or(0) {
            if let Ok(session) = list.GetAt(index) {
                result.push(session);
            }
        }
        Ok(result)
    }

    pub fn available() -> bool {
        manager().is_ok()
    }

    pub fn list_sessions() -> Result<Vec<MediaSessionSummary>, String> {
        let manager = manager()?;
        let current = manager
            .GetCurrentSession()
            .ok()
            .map(|session| app_id(&session));
        let mut result = Vec::new();
        for session in sessions()? {
            let source_app_id = app_id(&session);
            let (title, artist, album, _) = properties(&session);
            result.push(MediaSessionSummary {
                id: if source_app_id.is_empty() {
                    format!("session-{}", result.len())
                } else {
                    source_app_id.clone()
                },
                source_name: friendly_source(&source_app_id),
                source_app_id: source_app_id.clone(),
                title,
                artist,
                album,
                status: status_of(&session),
                is_current: current.as_deref() == Some(source_app_id.as_str()),
            });
        }
        Ok(result)
    }

    fn find_session(id: &str) -> Result<GlobalSystemMediaTransportControlsSession, String> {
        let manager = manager()?;
        if id.is_empty() {
            return manager.GetCurrentSession().map_err(|error| error.to_string());
        }
        for session in sessions()? {
            if app_id(&session) == id {
                return Ok(session);
            }
        }
        manager.GetCurrentSession().map_err(|error| error.to_string())
    }

    pub fn state(session_id: &str) -> Result<MediaState, String> {
        let session = find_session(session_id)?;
        let source_app_id = app_id(&session);
        let (title, artist, album, cover) = properties(&session);
        let status = status_of(&session);
        let mut position_ms = 0;
        let mut duration_ms = 0;
        if let Ok(timeline) = session.GetTimelineProperties() {
            let position = timeline.Position().map(|value| value.Duration).unwrap_or(0);
            let end = timeline.EndTime().map(|value| value.Duration).unwrap_or(0);
            position_ms = (position / 10_000).max(0);
            duration_ms = (end / 10_000).max(0).max(position_ms);
        }
        let controls = session
            .GetPlaybackInfo()
            .ok()
            .and_then(|info| info.Controls().ok());
        let (can_play, can_pause, can_next, can_previous, can_seek) = controls
            .as_ref()
            .map(|controls| {
                (
                    controls.IsPlayEnabled().unwrap_or(false),
                    controls.IsPauseEnabled().unwrap_or(false),
                    controls.IsNextEnabled().unwrap_or(false),
                    controls.IsPreviousEnabled().unwrap_or(false),
                    controls.IsPlaybackPositionEnabled().unwrap_or(false),
                )
            })
            .unwrap_or((false, false, false, false, false));
        Ok(MediaState {
            available: true,
            platform: "windows-gsmtc".into(),
            session_id: if source_app_id.is_empty() {
                "system".into()
            } else {
                source_app_id.clone()
            },
            source_name: friendly_source(&source_app_id),
            source_app_id,
            title,
            artist,
            album,
            status,
            position_ms,
            duration_ms,
            cover,
            can_play,
            can_pause,
            can_next,
            can_previous,
            can_seek,
        })
    }

    pub fn control(session_id: &str, action: &str) -> Result<bool, String> {
        let session = find_session(session_id)?;
        let result = match action {
            "play" => session.TryPlayAsync(),
            "pause" => session.TryPauseAsync(),
            "next" => session.TrySkipNextAsync(),
            "previous" => session.TrySkipPreviousAsync(),
            _ => return Err(format!("不支持的媒体操作：{action}")),
        };
        result
            .map_err(|error| error.to_string())?
            .join()
            .map_err(|error| error.to_string())
    }

    pub fn seek(session_id: &str, position_ms: i64) -> Result<bool, String> {
        let session = find_session(session_id)?;
        session
            .TryChangePlaybackPositionAsync(position_ms.max(0) * 10_000)
            .map_err(|error| error.to_string())?
            .join()
            .map_err(|error| error.to_string())
    }
}

#[cfg(not(windows))]
mod platform {
    use super::*;

    pub fn available() -> bool {
        false
    }

    pub fn list_sessions() -> Result<Vec<MediaSessionSummary>, String> {
        Ok(Vec::new())
    }

    pub fn state(_session_id: &str) -> Result<MediaState, String> {
        Ok(MediaState::unavailable())
    }

    pub fn control(_session_id: &str, _action: &str) -> Result<bool, String> {
        Err("当前平台不支持系统媒体控制".into())
    }

    pub fn seek(_session_id: &str, _position_ms: i64) -> Result<bool, String> {
        Err("当前平台不支持系统媒体控制".into())
    }
}

pub fn available() -> bool {
    platform::available() || crate::legacy_media::available()
}

pub fn list_sessions() -> Result<Vec<MediaSessionSummary>, String> {
    let mut sessions = platform::list_sessions().unwrap_or_default();
    for legacy in crate::legacy_media::list_sessions() {
        sessions.push(MediaSessionSummary {
            id: legacy.id,
            source_app_id: legacy.source_app_id,
            source_name: legacy.source_name,
            title: legacy.title,
            artist: legacy.artist,
            album: legacy.album,
            status: legacy.status,
            is_current: false,
        });
    }
    Ok(sessions)
}

pub fn state(session_id: &str) -> Result<MediaState, String> {
    if session_id.starts_with("legacy:") {
        let legacy = crate::legacy_media::state(session_id)?;
        return Ok(MediaState {
            available: legacy.available,
            platform: legacy.platform,
            session_id: legacy.session_id,
            source_app_id: legacy.source_app_id,
            source_name: legacy.source_name,
            title: legacy.title,
            artist: legacy.artist,
            album: legacy.album,
            status: legacy.status,
            position_ms: legacy.position_ms,
            duration_ms: legacy.duration_ms,
            cover: legacy.cover,
            can_play: legacy.can_play,
            can_pause: legacy.can_pause,
            can_next: legacy.can_next,
            can_previous: legacy.can_previous,
            can_seek: legacy.can_seek,
        });
    }
    platform::state(session_id)
}

pub fn control(session_id: &str, action: &str) -> Result<bool, String> {
    if session_id.starts_with("legacy:") {
        return crate::legacy_media::control(action);
    }
    platform::control(session_id, action)
}

pub fn seek(session_id: &str, position_ms: i64) -> Result<bool, String> {
    if session_id.starts_with("legacy:") {
        return crate::legacy_media::seek(position_ms);
    }
    platform::seek(session_id, position_ms)
}
