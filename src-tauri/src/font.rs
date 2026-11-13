use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Manager};

const MAX_FONT_BYTES: u64 = 30 * 1024 * 1024;

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FontRecord {
    pub id: String,
    pub name: String,
    pub path: String,
    pub source: String,
}

fn now_ms() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|value| value.as_millis())
        .unwrap_or(0)
}

fn read_u16(bytes: &[u8], offset: usize) -> Result<u16, String> {
    let value = bytes
        .get(offset..offset + 2)
        .ok_or_else(|| "字体文件不完整".to_string())?;
    Ok(u16::from_be_bytes([value[0], value[1]]))
}

fn read_u32(bytes: &[u8], offset: usize) -> Result<u32, String> {
    let value = bytes
        .get(offset..offset + 4)
        .ok_or_else(|| "字体文件不完整".to_string())?;
    Ok(u32::from_be_bytes([value[0], value[1], value[2], value[3]]))
}

fn decode_name(platform: u16, bytes: &[u8]) -> Option<String> {
    if platform == 3 || platform == 0 {
        let units: Vec<u16> = bytes
            .chunks_exact(2)
            .map(|pair| u16::from_be_bytes([pair[0], pair[1]]))
            .collect();
        String::from_utf16(&units).ok()
    } else if platform == 1 {
        Some(bytes.iter().map(|value| *value as char).collect())
    } else {
        None
    }
}

/// Read the OpenType `name` table without loading or installing the font.
fn parse_font_family(bytes: &[u8]) -> Result<String, String> {
    if bytes.len() < 12 {
        return Err("字体文件太小或已损坏".to_string());
    }
    if &bytes[0..4] == b"ttcf" {
        return Err("暂不支持 TTC 字体集合，请选择单个 TTF/OTF 文件".to_string());
    }
    let signature = read_u32(bytes, 0)?;
    if !matches!(signature, 0x0001_0000 | 0x4F54_544F | 0x7472_7565) {
        return Err("不是有效的 TTF/OTF 字体文件".to_string());
    }
    let count = read_u16(bytes, 4)? as usize;
    if count == 0 || count > 512 {
        return Err("字体表数量异常".to_string());
    }
    let mut name_offset = None;
    let mut name_length = None;
    for index in 0..count {
        let record = 12 + index * 16;
        let tag = bytes
            .get(record..record + 4)
            .ok_or_else(|| "字体表目录不完整".to_string())?;
        if tag == b"name" {
            name_offset = Some(read_u32(bytes, record + 8)? as usize);
            name_length = Some(read_u32(bytes, record + 12)? as usize);
            break;
        }
    }
    let (offset, length) = match (name_offset, name_length) {
        (Some(offset), Some(length)) => (offset, length),
        _ => return Err("字体缺少名称表".to_string()),
    };
    let table = bytes
        .get(offset..offset.saturating_add(length))
        .ok_or_else(|| "字体名称表超出文件范围".to_string())?;
    let name_count = read_u16(table, 2)? as usize;
    let string_offset = read_u16(table, 4)? as usize;
    let mut candidates: Vec<(u16, String)> = Vec::new();
    for index in 0..name_count {
        let record = 6 + index * 12;
        if record + 12 > table.len() {
            break;
        }
        let platform = read_u16(table, record)?;
        let name_id = read_u16(table, record + 6)?;
        if name_id != 1 && name_id != 16 {
            continue;
        }
        let length = read_u16(table, record + 8)? as usize;
        let offset = string_offset + read_u16(table, record + 10)? as usize;
        let Some(raw) = table.get(offset..offset.saturating_add(length)) else {
            continue;
        };
        if let Some(value) = decode_name(platform, raw) {
            let cleaned = value.trim_matches('\0').trim().to_string();
            if !cleaned.is_empty() {
                candidates.push((name_id, cleaned));
            }
        }
    }
    candidates.sort_by_key(|(name_id, _)| if *name_id == 16 { 0 } else { 1 });
    candidates
        .into_iter()
        .map(|(_, value)| value)
        .next()
        .ok_or_else(|| "字体没有可读的家族名称".to_string())
}

fn system_fonts_dir() -> Result<PathBuf, String> {
    let windows = std::env::var("WINDIR").map_err(|_| "无法定位 Windows 字体目录".to_string())?;
    let path = Path::new(&windows).join("Fonts");
    if !path.is_dir() {
        return Err("Windows 字体目录不存在".to_string());
    }
    Ok(path)
}

fn imported_fonts_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let directory = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("无法定位字体目录：{error}"))?
        .join("fonts");
    fs::create_dir_all(&directory).map_err(|error| format!("创建字体目录失败：{error}"))?;
    Ok(directory)
}

fn imported_metadata_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(imported_fonts_dir(app)?.join("fonts.json"))
}

fn read_imported(app: &AppHandle) -> Vec<FontRecord> {
    let Ok(path) = imported_metadata_path(app) else {
        return Vec::new();
    };
    let Ok(bytes) = fs::read(path) else {
        return Vec::new();
    };
    let mut fonts: Vec<FontRecord> = serde_json::from_slice(&bytes).unwrap_or_default();
    fonts.retain(|font| Path::new(&font.path).is_file());
    fonts
}

fn write_imported(app: &AppHandle, fonts: &[FontRecord]) -> Result<(), String> {
    let path = imported_metadata_path(app)?;
    let mut bytes =
        serde_json::to_vec_pretty(fonts).map_err(|error| format!("序列化字体列表失败：{error}"))?;
    bytes.push(b'\n');
    let temp = path.with_extension("json.tmp");
    fs::write(&temp, &bytes).map_err(|error| format!("写入字体列表失败：{error}"))?;
    fs::rename(&temp, &path).map_err(|error| format!("替换字体列表失败：{error}"))?;
    Ok(())
}

fn validate_extension(path: &Path) -> Result<(), String> {
    let extension = path
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();
    if extension != "ttf" && extension != "otf" {
        return Err("只支持 TTF/OTF 字体文件".to_string());
    }
    Ok(())
}

fn read_font_file(path: &Path) -> Result<Vec<u8>, String> {
    validate_extension(path)?;
    let metadata = fs::metadata(path).map_err(|error| format!("读取字体失败：{error}"))?;
    if metadata.len() > MAX_FONT_BYTES {
        return Err("字体文件超过 30 MB，已拒绝导入".to_string());
    }
    fs::read(path).map_err(|error| format!("读取字体失败：{error}"))
}

#[tauri::command]
pub fn list_system_fonts() -> Result<Vec<FontRecord>, String> {
    let directory = system_fonts_dir()?;
    let mut fonts = Vec::new();
    let mut seen = std::collections::HashSet::new();
    for entry in fs::read_dir(directory).map_err(|error| format!("读取系统字体失败：{error}"))?
    {
        let Ok(entry) = entry else { continue };
        let path = entry.path();
        if validate_extension(&path).is_err() {
            continue;
        }
        let Ok(bytes) = read_font_file(&path) else {
            continue;
        };
        let Ok(name) = parse_font_family(&bytes) else {
            continue;
        };
        let key = name.to_lowercase();
        if !seen.insert(key) {
            continue;
        }
        fonts.push(FontRecord {
            id: format!("system:{}", path.to_string_lossy()),
            name,
            path: path.to_string_lossy().to_string(),
            source: "system".to_string(),
        });
    }
    fonts.sort_by(|left, right| left.name.to_lowercase().cmp(&right.name.to_lowercase()));
    Ok(fonts)
}

#[tauri::command]
pub fn list_imported_fonts(app: AppHandle) -> Vec<FontRecord> {
    read_imported(&app)
}

#[tauri::command]
pub fn import_font(
    app: AppHandle,
    window: tauri::WebviewWindow,
) -> Result<Option<FontRecord>, String> {
    let handle = window
        .hwnd()
        .map_err(|error| format!("无法取得窗口句柄：{error}"))?;
    let Some(selected) = crate::save_dialog::choose_font_path(handle.0 as isize, "导入字体")
    else {
        return Ok(None);
    };
    let source = Path::new(&selected);
    validate_extension(source)?;
    let bytes = read_font_file(source)?;
    let name = parse_font_family(&bytes)?;
    let directory = imported_fonts_dir(&app)?;
    let extension = source
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or("ttf")
        .to_ascii_lowercase();
    let id = format!("imported-{}", now_ms());
    let target = directory.join(format!("{id}.{extension}"));
    fs::write(&target, &bytes).map_err(|error| format!("保存导入字体失败：{error}"))?;
    let record = FontRecord {
        id,
        name,
        path: target.to_string_lossy().to_string(),
        source: "imported".to_string(),
    };
    let mut fonts = read_imported(&app);
    fonts.retain(|font| font.path != record.path);
    fonts.push(record.clone());
    write_imported(&app, &fonts)?;
    Ok(Some(record))
}

#[tauri::command]
pub fn remove_imported_font(app: AppHandle, id: String) -> Result<(), String> {
    let mut fonts = read_imported(&app);
    let Some(record) = fonts.iter().find(|font| font.id == id).cloned() else {
        return Err("找不到这个导入字体".to_string());
    };
    if record.source != "imported" {
        return Err("只能移除导入字体，不能修改系统字体".to_string());
    }
    let directory = imported_fonts_dir(&app)?;
    let target = Path::new(&record.path);
    if target.starts_with(&directory) && target.is_file() {
        fs::remove_file(target).map_err(|error| format!("删除字体文件失败：{error}"))?;
    }
    fonts.retain(|font| font.id != id);
    write_imported(&app, &fonts)
}

#[tauri::command]
pub fn read_font_bytes(app: AppHandle, path: String, source: String) -> Result<Vec<u8>, String> {
    let target =
        fs::canonicalize(Path::new(&path)).map_err(|error| format!("字体路径不可访问：{error}"))?;
    validate_extension(&target)?;
    let allowed = if source == "system" {
        let directory = fs::canonicalize(system_fonts_dir()?)
            .map_err(|error| format!("无法校验系统字体目录：{error}"))?;
        target.starts_with(directory)
    } else if source == "imported" {
        let directory = fs::canonicalize(imported_fonts_dir(&app)?)
            .map_err(|error| format!("无法校验导入字体目录：{error}"))?;
        target.starts_with(directory)
    } else {
        false
    };
    if !allowed {
        return Err("字体路径未被授权".to_string());
    }
    let metadata = fs::metadata(&target).map_err(|error| format!("读取字体失败：{error}"))?;
    if metadata.len() > MAX_FONT_BYTES {
        return Err("字体文件超过 30 MB".to_string());
    }
    fs::read(target).map_err(|error| format!("读取字体失败：{error}"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_broken_font_headers() {
        assert!(parse_font_family(b"not a font").is_err());
    }

    #[test]
    fn reads_a_real_windows_font_name() {
        let Ok(directory) = system_fonts_dir() else {
            return;
        };
        let Ok(entries) = fs::read_dir(directory) else {
            return;
        };
        for entry in entries.flatten() {
            let path = entry.path();
            if validate_extension(&path).is_err() {
                continue;
            }
            let Ok(bytes) = read_font_file(&path) else {
                continue;
            };
            if let Ok(name) = parse_font_family(&bytes) {
                assert!(!name.trim().is_empty());
                return;
            }
        }
    }
}
