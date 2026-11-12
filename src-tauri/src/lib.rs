mod project;

use project::{
    ChapterRead, CreateChapterResult, DeleteChapterResult, HistoryEntry, OpenedProject,
    ProjectMeta, SaveChapterInput, SaveChapterResult,
};
use serde_json::Value;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

fn recent_file(app: &AppHandle) -> Result<PathBuf, String> {
    let directory = app
        .path()
        .app_config_dir()
        .map_err(|error| format!("无法定位应用数据目录：{error}"))?;
    fs::create_dir_all(&directory).map_err(|error| format!("创建应用数据目录失败：{error}"))?;
    Ok(directory.join("recent-projects.json"))
}

fn read_recent(app: &AppHandle) -> Vec<project::RecentProject> {
    let Ok(path) = recent_file(app) else {
        return Vec::new();
    };
    let Ok(bytes) = fs::read(path) else {
        return Vec::new();
    };
    let mut recent: Vec<project::RecentProject> =
        serde_json::from_slice(&bytes).unwrap_or_default();
    for item in &mut recent {
        let cleaned = {
            let path = item.path.as_str();
            path.strip_prefix(r"\\?\")
                .or_else(|| path.strip_prefix(r"//?/"))
                .unwrap_or(path)
                .to_string()
        };
        item.path = cleaned;
    }
    recent
}

fn write_recent(app: &AppHandle, recent: &[project::RecentProject]) -> Result<(), String> {
    let path = recent_file(app)?;
    let mut bytes = serde_json::to_vec_pretty(recent)
        .map_err(|error| format!("序列化最近项目失败：{error}"))?;
    bytes.push(b'\n');
    let temp = path.with_extension("json.tmp");
    fs::write(&temp, &bytes).map_err(|error| format!("写入最近项目失败：{error}"))?;
    fs::rename(&temp, &path).map_err(|error| format!("替换最近项目失败：{error}"))?;
    Ok(())
}

fn update_recent(app: &AppHandle, project_path: &Path) -> Result<(), String> {
    let summary = project::project_recent(project_path)?;
    let mut recent = read_recent(app);
    let normalized = summary.path.to_lowercase();
    recent.retain(|item| item.path.to_lowercase() != normalized);
    recent.insert(0, summary);
    recent.retain(|item| Path::new(&item.path).join("project.json").is_file());
    recent.truncate(12);
    write_recent(app, &recent)
}

#[tauri::command]
fn project_create(
    app: AppHandle,
    path: String,
    name: String,
    appearance: Value,
    settings: Value,
) -> Result<OpenedProject, String> {
    let opened = project::create_project(Path::new(&path), &name, appearance, settings)?;
    let _ = update_recent(&app, Path::new(&opened.path));
    Ok(opened)
}

#[tauri::command]
fn project_open(app: AppHandle, path: String) -> Result<OpenedProject, String> {
    let opened = project::open_project(Path::new(&path))?;
    let _ = update_recent(&app, Path::new(&opened.path));
    Ok(opened)
}

#[tauri::command]
fn project_list_recent(app: AppHandle) -> Vec<project::RecentProject> {
    let mut recent = read_recent(&app);
    recent.retain(|item| Path::new(&item.path).join("project.json").is_file());
    recent
}

#[tauri::command]
fn project_save_chapter(
    project_path: String,
    chapter: SaveChapterInput,
    reason: String,
) -> Result<SaveChapterResult, String> {
    project::save_chapter(Path::new(&project_path), chapter, &reason)
}

#[tauri::command]
fn project_load_chapter(project_path: String, chapter_id: String) -> Result<ChapterRead, String> {
    project::load_chapter(Path::new(&project_path), &chapter_id)
}

#[tauri::command]
fn project_save_preferences(
    project_path: String,
    appearance: Value,
    settings: Value,
    active_chapter_id: Option<String>,
) -> Result<ProjectMeta, String> {
    project::save_preferences(
        Path::new(&project_path),
        appearance,
        settings,
        active_chapter_id,
    )
}

#[tauri::command]
fn project_create_chapter(
    app: AppHandle,
    project_path: String,
    title: String,
) -> Result<CreateChapterResult, String> {
    let result = project::create_chapter(Path::new(&project_path), &title)?;
    let _ = update_recent(&app, Path::new(&project_path));
    Ok(result)
}

#[tauri::command]
fn project_rename_chapter(
    project_path: String,
    chapter_id: String,
    title: String,
) -> Result<ProjectMeta, String> {
    project::rename_chapter(Path::new(&project_path), &chapter_id, &title)
}

#[tauri::command]
fn project_reorder_chapters(
    project_path: String,
    ordered_ids: Vec<String>,
) -> Result<ProjectMeta, String> {
    project::reorder_chapters(Path::new(&project_path), ordered_ids)
}

#[tauri::command]
fn project_delete_chapter(
    app: AppHandle,
    project_path: String,
    chapter_id: String,
) -> Result<DeleteChapterResult, String> {
    let result = project::delete_chapter(Path::new(&project_path), &chapter_id)?;
    let _ = update_recent(&app, Path::new(&project_path));
    Ok(result)
}

#[tauri::command]
fn project_close(app: AppHandle, project_path: String) -> Result<ProjectMeta, String> {
    let meta = project::close_project(Path::new(&project_path))?;
    let _ = update_recent(&app, Path::new(&project_path));
    Ok(meta)
}

#[tauri::command]
fn project_list_history(
    project_path: String,
    chapter_id: String,
) -> Result<Vec<HistoryEntry>, String> {
    project::list_history(Path::new(&project_path), &chapter_id)
}

#[tauri::command]
fn project_restore_history(
    project_path: String,
    chapter_id: String,
    history_file: String,
) -> Result<ChapterRead, String> {
    project::restore_history(Path::new(&project_path), &chapter_id, &history_file)
}

#[tauri::command]
fn project_restore_recovery(
    project_path: String,
    chapter_id: String,
) -> Result<ChapterRead, String> {
    project::restore_recovery(Path::new(&project_path), &chapter_id)
}

#[tauri::command]
fn project_discard_recovery(project_path: String, chapter_id: String) -> Result<(), String> {
    project::discard_recovery(Path::new(&project_path), &chapter_id)
}

#[cfg(target_os = "windows")]
mod folder_picker {
    use std::ffi::{c_void, OsString};
    use std::os::windows::ffi::OsStringExt;
    use std::ptr;

    #[repr(C)]
    struct BrowseInfoW {
        hwnd_owner: isize,
        pidl_root: *const c_void,
        display_name: *mut u16,
        title: *const u16,
        flags: u32,
        callback: *const c_void,
        callback_param: isize,
        image: i32,
    }

    #[link(name = "shell32")]
    extern "system" {
        fn SHBrowseForFolderW(info: *const BrowseInfoW) -> *mut c_void;
        fn SHGetPathFromIDListW(pidl: *const c_void, path: *mut u16) -> i32;
    }

    #[link(name = "ole32")]
    extern "system" {
        fn CoTaskMemFree(pointer: *const c_void);
        fn CoInitializeEx(reserved: *mut c_void, coinit: u32) -> i32;
        fn CoUninitialize();
    }

    pub fn pick_folder(owner: isize, title: &str) -> Option<String> {
        const BIF_RETURNONLYFSDIRS: u32 = 0x0000_0001;
        const BIF_EDITBOX: u32 = 0x0000_0010;
        const BIF_NEWDIALOGSTYLE: u32 = 0x0000_0040;
        const COINIT_APARTMENTTHREADED: u32 = 0x2;

        let initialized = unsafe { CoInitializeEx(std::ptr::null_mut(), COINIT_APARTMENTTHREADED) };
        let result = pick_folder_inner(
            owner,
            title,
            BIF_RETURNONLYFSDIRS | BIF_EDITBOX | BIF_NEWDIALOGSTYLE,
        );
        if initialized >= 0 {
            unsafe { CoUninitialize() };
        }
        result
    }

    fn pick_folder_inner(owner: isize, title: &str, flags: u32) -> Option<String> {
        let title_wide: Vec<u16> = title.encode_utf16().chain(std::iter::once(0)).collect();
        let mut display = vec![0u16; 260];
        let info = BrowseInfoW {
            hwnd_owner: owner,
            pidl_root: ptr::null(),
            display_name: display.as_mut_ptr(),
            title: title_wide.as_ptr(),
            flags,
            callback: ptr::null(),
            callback_param: 0,
            image: 0,
        };
        unsafe {
            let pidl = SHBrowseForFolderW(&info);
            if pidl.is_null() {
                return None;
            }
            let mut path = vec![0u16; 32_768];
            let ok = SHGetPathFromIDListW(pidl, path.as_mut_ptr());
            CoTaskMemFree(pidl);
            if ok == 0 {
                return None;
            }
            let length = path.iter().position(|value| *value == 0).unwrap_or(0);
            if length == 0 {
                return None;
            }
            Some(
                OsString::from_wide(&path[..length])
                    .to_string_lossy()
                    .to_string(),
            )
        }
    }
}

#[cfg(target_os = "windows")]
#[tauri::command]
fn choose_folder(window: tauri::WebviewWindow, title: String) -> Result<Option<String>, String> {
    let handle = window
        .hwnd()
        .map_err(|error| format!("无法取得窗口句柄：{error}"))?;
    Ok(folder_picker::pick_folder(handle.0 as isize, &title))
}

#[cfg(not(target_os = "windows"))]
#[tauri::command]
fn choose_folder(_window: tauri::WebviewWindow, _title: String) -> Result<Option<String>, String> {
    Err("当前平台未实现原生文件夹选择".to_string())
}

#[tauri::command]
fn project_default_parent() -> Result<String, String> {
    let home = std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .map_err(|_| "无法定位用户目录".to_string())?;
    let path = Path::new(&home).join("Documents").join("PaperScape");
    fs::create_dir_all(&path).map_err(|error| format!("创建默认项目目录失败：{error}"))?;
    Ok(path.to_string_lossy().to_string())
}

#[cfg(target_os = "windows")]
mod save_dialog {
    use std::ffi::{c_void, OsString};
    use std::os::windows::ffi::OsStringExt;
    use std::ptr;

    #[repr(C)]
    struct OpenFileNameW {
        struct_size: u32,
        hwnd_owner: isize,
        instance: isize,
        filter: *const u16,
        custom_filter: *mut u16,
        max_custom_filter: u32,
        filter_index: u32,
        file: *mut u16,
        max_file: u32,
        file_title: *mut u16,
        max_file_title: u32,
        initial_dir: *const u16,
        title: *const u16,
        flags: u32,
        file_offset: u16,
        file_extension: u16,
        default_extension: *const u16,
        custom_data: isize,
        hook: *const c_void,
        template_name: *const u16,
        reserved: *mut c_void,
        reserved2: u32,
        flags_ex: u32,
    }

    #[link(name = "comdlg32")]
    extern "system" {
        fn GetSaveFileNameW(dialog: *mut OpenFileNameW) -> i32;
        fn GetOpenFileNameW(dialog: *mut OpenFileNameW) -> i32;
    }

    pub fn choose_open_path(owner: isize, title: &str) -> Option<String> {
        const OFN_FILEMUSTEXIST: u32 = 0x0000_1000;
        const OFN_NOCHANGEDIR: u32 = 0x0000_0008;
        const OFN_PATHMUSTEXIST: u32 = 0x0000_0800;
        const OFN_EXPLORER: u32 = 0x0008_0000;
        const OFN_ENABLESIZING: u32 = 0x0080_0000;

        let title_wide: Vec<u16> = title.encode_utf16().chain(std::iter::once(0)).collect();
        let filter: Vec<u16> = "Word 文档 (*.docx)\0*.docx\0所有文件 (*.*)\0*.*\0\0"
            .encode_utf16()
            .collect();
        let extension: Vec<u16> = "docx\0".encode_utf16().collect();
        let mut file = vec![0u16; 32_768];
        let mut dialog = OpenFileNameW {
            struct_size: std::mem::size_of::<OpenFileNameW>() as u32,
            hwnd_owner: owner,
            instance: 0,
            filter: filter.as_ptr(),
            custom_filter: ptr::null_mut(),
            max_custom_filter: 0,
            filter_index: 1,
            file: file.as_mut_ptr(),
            max_file: file.len() as u32,
            file_title: ptr::null_mut(),
            max_file_title: 0,
            initial_dir: ptr::null(),
            title: title_wide.as_ptr(),
            flags: OFN_FILEMUSTEXIST
                | OFN_NOCHANGEDIR
                | OFN_PATHMUSTEXIST
                | OFN_EXPLORER
                | OFN_ENABLESIZING,
            file_offset: 0,
            file_extension: 0,
            default_extension: extension.as_ptr(),
            custom_data: 0,
            hook: ptr::null(),
            template_name: ptr::null(),
            reserved: ptr::null_mut(),
            reserved2: 0,
            flags_ex: 0,
        };
        let opened = unsafe { GetOpenFileNameW(&mut dialog) };
        if opened == 0 {
            return None;
        }
        let length = file.iter().position(|value| *value == 0).unwrap_or(0);
        if length == 0 {
            return None;
        }
        Some(
            OsString::from_wide(&file[..length])
                .to_string_lossy()
                .to_string(),
        )
    }

    pub fn choose_save_path(owner: isize, title: &str, default_name: &str) -> Option<String> {
        const OFN_OVERWRITEPROMPT: u32 = 0x0000_0002;
        const OFN_NOCHANGEDIR: u32 = 0x0000_0008;
        const OFN_PATHMUSTEXIST: u32 = 0x0000_0800;
        const OFN_EXPLORER: u32 = 0x0008_0000;
        const OFN_ENABLESIZING: u32 = 0x0080_0000;

        let title_wide: Vec<u16> = title.encode_utf16().chain(std::iter::once(0)).collect();
        let filter: Vec<u16> = "Word 文档 (*.docx)\0*.docx\0所有文件 (*.*)\0*.*\0\0"
            .encode_utf16()
            .collect();
        let extension: Vec<u16> = "docx\0".encode_utf16().collect();
        let mut file = vec![0u16; 32_768];
        for (index, value) in default_name.encode_utf16().take(file.len() - 1).enumerate() {
            file[index] = value;
        }
        let mut dialog = OpenFileNameW {
            struct_size: std::mem::size_of::<OpenFileNameW>() as u32,
            hwnd_owner: owner,
            instance: 0,
            filter: filter.as_ptr(),
            custom_filter: ptr::null_mut(),
            max_custom_filter: 0,
            filter_index: 1,
            file: file.as_mut_ptr(),
            max_file: file.len() as u32,
            file_title: ptr::null_mut(),
            max_file_title: 0,
            initial_dir: ptr::null(),
            title: title_wide.as_ptr(),
            flags: OFN_OVERWRITEPROMPT
                | OFN_NOCHANGEDIR
                | OFN_PATHMUSTEXIST
                | OFN_EXPLORER
                | OFN_ENABLESIZING,
            file_offset: 0,
            file_extension: 0,
            default_extension: extension.as_ptr(),
            custom_data: 0,
            hook: ptr::null(),
            template_name: ptr::null(),
            reserved: ptr::null_mut(),
            reserved2: 0,
            flags_ex: 0,
        };
        let saved = unsafe { GetSaveFileNameW(&mut dialog) };
        if saved == 0 {
            return None;
        }
        let length = file.iter().position(|value| *value == 0).unwrap_or(0);
        if length == 0 {
            return None;
        }
        Some(
            OsString::from_wide(&file[..length])
                .to_string_lossy()
                .to_string(),
        )
    }
}

#[cfg(target_os = "windows")]
#[tauri::command]
fn choose_docx_open_path(window: tauri::WebviewWindow) -> Result<Option<String>, String> {
    let handle = window
        .hwnd()
        .map_err(|error| format!("无法取得窗口句柄：{error}"))?;
    Ok(save_dialog::choose_open_path(
        handle.0 as isize,
        "导入 Word 文档",
    ))
}

#[cfg(not(target_os = "windows"))]
#[tauri::command]
fn choose_docx_open_path(_window: tauri::WebviewWindow) -> Result<Option<String>, String> {
    Err("当前平台未实现原生打开对话框".to_string())
}

#[tauri::command]
fn read_docx_file(path: String) -> Result<Vec<u8>, String> {
    let target = Path::new(&path);
    if target
        .extension()
        .and_then(|value| value.to_str())
        .map(|value| value.to_ascii_lowercase())
        != Some("docx".to_string())
    {
        return Err("请选择 .docx 文件（不支持把 HTML 改扩展名）".to_string());
    }
    let metadata = fs::metadata(target).map_err(|error| format!("无法读取 DOCX：{error}"))?;
    if metadata.len() > 80 * 1024 * 1024 {
        return Err("DOCX 文件超过 80 MB，已拒绝导入".to_string());
    }
    fs::read(target).map_err(|error| format!("读取 DOCX 失败：{error}"))
}

#[cfg(target_os = "windows")]
#[tauri::command]
fn choose_docx_save_path(
    window: tauri::WebviewWindow,
    title: String,
    default_name: String,
) -> Result<Option<String>, String> {
    let handle = window
        .hwnd()
        .map_err(|error| format!("无法取得窗口句柄：{error}"))?;
    Ok(save_dialog::choose_save_path(
        handle.0 as isize,
        &title,
        &default_name,
    ))
}

#[cfg(not(target_os = "windows"))]
#[tauri::command]
fn choose_docx_save_path(
    _window: tauri::WebviewWindow,
    _title: String,
    _default_name: String,
) -> Result<Option<String>, String> {
    Err("当前平台未实现原生保存对话框".to_string())
}

#[tauri::command]
fn save_docx_export(path: String, bytes: Vec<u8>) -> Result<String, String> {
    let target = Path::new(&path);
    if target
        .extension()
        .and_then(|value| value.to_str())
        .map(|value| value.to_ascii_lowercase())
        != Some("docx".to_string())
    {
        return Err("导出文件必须使用 .docx 扩展名".to_string());
    }
    if bytes.is_empty() {
        return Err("导出内容为空".to_string());
    }
    project::atomic_write(target, &bytes)?;
    Ok(target.to_string_lossy().to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            project_create,
            project_open,
            project_list_recent,
            project_save_chapter,
            project_load_chapter,
            project_save_preferences,
            project_create_chapter,
            project_rename_chapter,
            project_reorder_chapters,
            project_delete_chapter,
            project_close,
            project_list_history,
            project_restore_history,
            project_restore_recovery,
            project_discard_recovery,
            choose_folder,
            project_default_parent,
            choose_docx_open_path,
            read_docx_file,
            choose_docx_save_path,
            save_docx_export
        ])
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                if let Ok(Some(monitor)) = window.current_monitor() {
                    let logical = monitor.size().to_logical::<f64>(monitor.scale_factor());
                    let width = (logical.width * 0.88).clamp(960.0, 1280.0);
                    let height = ((logical.height - 64.0) * 0.92).clamp(640.0, 820.0);
                    window.set_size(tauri::LogicalSize::new(width, height))?;
                    window.center()?;
                }
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("启动 PaperScape 失败");
}
