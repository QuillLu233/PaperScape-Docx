use serde::{Deserialize, Serialize};
use std::collections::hash_map::DefaultHasher;
use std::fs;
use std::hash::{Hash, Hasher};
use std::path::{Component, Path, PathBuf};
use std::process::Command;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Manager, State};

const MAX_DOCX_BYTES: u64 = 80 * 1024 * 1024;
const MAX_TREE_DEPTH: usize = 8;
const MAX_TREE_NODES: usize = 2500;

#[derive(Default)]
pub struct WorkspaceAccess {
    roots: Mutex<Vec<PathBuf>>,
    files: Mutex<Vec<PathBuf>>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceNode {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub editable: bool,
    pub is_project: bool,
    pub extension: String,
    pub size: u64,
    pub modified: i64,
    pub children: Vec<WorkspaceNode>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceDocxPayload {
    pub path: String,
    pub name: String,
    pub bytes: Vec<u8>,
    pub modified: i64,
    pub size: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceSaveResult {
    pub path: String,
    pub modified: i64,
    pub size: u64,
    pub backup_path: Option<String>,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct RecentItem {
    pub kind: String,
    pub path: String,
    pub name: String,
    pub last_opened_at: i64,
}

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|value| value.as_millis() as i64)
        .unwrap_or(0)
}

fn modified_ms(metadata: &fs::Metadata) -> i64 {
    metadata
        .modified()
        .ok()
        .and_then(|value| value.duration_since(UNIX_EPOCH).ok())
        .map(|value| value.as_millis() as i64)
        .unwrap_or(0)
}

fn display_path(path: &Path) -> String {
    let text = path.to_string_lossy().to_string();
    text.strip_prefix(r"\\?\")
        .or_else(|| text.strip_prefix(r"//?/"))
        .unwrap_or(&text)
        .to_string()
}

fn canonical_existing(path: &Path) -> Result<PathBuf, String> {
    fs::canonicalize(path).map_err(|error| format!("路径不存在或不可访问：{error}"))
}

fn canonical_target(path: &Path) -> Result<PathBuf, String> {
    if path.exists() {
        return canonical_existing(path);
    }
    let parent = path
        .parent()
        .ok_or_else(|| "目标路径没有父目录".to_string())?;
    let parent = canonical_existing(parent)?;
    let name = path
        .file_name()
        .ok_or_else(|| "目标路径没有文件名".to_string())?;
    let candidate = parent.join(name);
    if candidate
        .components()
        .any(|part| matches!(part, Component::ParentDir))
    {
        return Err("目标路径包含上级目录跳转".to_string());
    }
    Ok(candidate)
}

fn is_docx(path: &Path) -> bool {
    path.extension()
        .and_then(|value| value.to_str())
        .map(|value| value.eq_ignore_ascii_case("docx"))
        .unwrap_or(false)
}

fn is_within(path: &Path, root: &Path) -> bool {
    path == root || path.starts_with(root)
}

fn authorize_root(state: &WorkspaceAccess, path: &Path) -> Result<PathBuf, String> {
    let canonical = canonical_existing(path)?;
    if !canonical.is_dir() {
        return Err("选择的路径不是文件夹".to_string());
    }
    let mut roots = state
        .roots
        .lock()
        .map_err(|_| "目录授权状态不可用".to_string())?;
    if !roots.iter().any(|item| item == &canonical) {
        roots.push(canonical.clone());
    }
    roots.sort();
    roots.dedup();
    Ok(canonical)
}

fn authorize_file(state: &WorkspaceAccess, path: &Path) -> Result<PathBuf, String> {
    let canonical = canonical_existing(path)?;
    if !canonical.is_file() {
        return Err("选择的路径不是文件".to_string());
    }
    let parent = canonical
        .parent()
        .ok_or_else(|| "文件没有父目录".to_string())?;
    let mut roots = state
        .roots
        .lock()
        .map_err(|_| "目录授权状态不可用".to_string())?;
    if !roots.iter().any(|item| item == parent) {
        roots.push(parent.to_path_buf());
    }
    let mut files = state
        .files
        .lock()
        .map_err(|_| "文件授权状态不可用".to_string())?;
    if !files.iter().any(|item| item == &canonical) {
        files.push(canonical.clone());
    }
    Ok(canonical)
}

fn is_authorized(state: &WorkspaceAccess, path: &Path) -> bool {
    let canonical = fs::canonicalize(path).unwrap_or_else(|_| path.to_path_buf());
    let files = state.files.lock().ok();
    if files
        .as_ref()
        .map(|items| items.iter().any(|item| item == &canonical))
        .unwrap_or(false)
    {
        return true;
    }
    let roots = state.roots.lock().ok();
    roots
        .as_ref()
        .map(|items| items.iter().any(|root| is_within(&canonical, root)))
        .unwrap_or(false)
}

fn ensure_authorized_file(state: &WorkspaceAccess, path: &Path) -> Result<PathBuf, String> {
    if !is_docx(path) {
        return Err("只允许访问 .docx 文稿".to_string());
    }
    let canonical = canonical_existing(path)?;
    if !canonical.is_file() {
        return Err("目标不是文件".to_string());
    }
    if !is_authorized(state, &canonical) {
        return Err("路径未被用户授权，已拒绝访问".to_string());
    }
    Ok(canonical)
}

fn is_reparse_point(metadata: &fs::Metadata) -> bool {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::fs::MetadataExt;
        metadata.file_attributes() & 0x0400 != 0
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = metadata;
        false
    }
}

fn read_dir_entries(path: &Path) -> Result<Vec<fs::DirEntry>, String> {
    let mut entries: Vec<_> = fs::read_dir(path)
        .map_err(|error| format!("读取文件夹失败：{error}"))?
        .filter_map(|entry| entry.ok())
        .collect();
    entries.sort_by(|left, right| {
        let left_dir = left
            .file_type()
            .map(|value| value.is_dir())
            .unwrap_or(false);
        let right_dir = right
            .file_type()
            .map(|value| value.is_dir())
            .unwrap_or(false);
        right_dir.cmp(&left_dir).then_with(|| {
            left.file_name()
                .to_string_lossy()
                .to_lowercase()
                .cmp(&right.file_name().to_string_lossy().to_lowercase())
        })
    });
    Ok(entries)
}

fn walk_tree(
    path: &Path,
    depth: usize,
    count: &mut usize,
    include_children: bool,
) -> Result<Vec<WorkspaceNode>, String> {
    if depth > MAX_TREE_DEPTH || *count >= MAX_TREE_NODES {
        return Ok(Vec::new());
    }
    let mut nodes = Vec::new();
    for entry in read_dir_entries(path)? {
        if *count >= MAX_TREE_NODES {
            break;
        }
        let name = entry.file_name().to_string_lossy().to_string();
        if name.starts_with('.')
            || name.eq_ignore_ascii_case("node_modules")
            || name.eq_ignore_ascii_case("target")
        {
            continue;
        }
        let entry_path = entry.path();
        let file_type = match entry.file_type() {
            Ok(value) => value,
            Err(_) => continue,
        };
        if file_type.is_symlink() {
            continue;
        }
        let metadata = match entry.metadata() {
            Ok(value) => value,
            Err(_) => continue,
        };
        if is_reparse_point(&metadata) {
            continue;
        }
        let is_dir = metadata.is_dir();
        let extension = entry_path
            .extension()
            .and_then(|value| value.to_str())
            .unwrap_or("")
            .to_ascii_lowercase();
        let is_project =
            is_dir && extension == "paperscape" && entry_path.join("project.json").is_file();
        let editable = !is_dir && extension == "docx";
        *count += 1;
        let children = if is_dir && include_children {
            walk_tree(&entry_path, depth + 1, count, include_children)?
        } else {
            Vec::new()
        };
        nodes.push(WorkspaceNode {
            name,
            path: display_path(&entry_path),
            is_dir,
            editable,
            is_project,
            extension,
            size: if is_dir { 0 } else { metadata.len() },
            modified: modified_ms(&metadata),
            children,
        });
    }
    Ok(nodes)
}

#[tauri::command]
pub fn choose_workspace_folder(
    window: tauri::WebviewWindow,
    state: State<'_, WorkspaceAccess>,
) -> Result<Option<String>, String> {
    let handle = window
        .hwnd()
        .map_err(|error| format!("无法取得窗口句柄：{error}"))?;
    let selected = crate::folder_picker::pick_folder(handle.0 as isize, "打开文件夹");
    if let Some(path) = &selected {
        authorize_root(&state, Path::new(path))?;
    }
    Ok(selected)
}

#[tauri::command]
pub fn choose_workspace_docx(
    window: tauri::WebviewWindow,
    state: State<'_, WorkspaceAccess>,
) -> Result<Option<String>, String> {
    let handle = window
        .hwnd()
        .map_err(|error| format!("无法取得窗口句柄：{error}"))?;
    let selected = crate::save_dialog::choose_open_path(handle.0 as isize, "打开 Word 文档");
    if let Some(path) = &selected {
        authorize_file(&state, Path::new(path))?;
    }
    Ok(selected)
}

#[tauri::command]
pub fn authorize_workspace_path(
    state: State<'_, WorkspaceAccess>,
    path: String,
) -> Result<String, String> {
    let target = Path::new(&path);
    if target.is_dir() {
        return Ok(display_path(&authorize_root(&state, target)?));
    }
    if is_docx(target) {
        return Ok(display_path(&authorize_file(&state, target)?));
    }
    Err("只允许授权文件夹或 DOCX 文稿".to_string())
}

#[tauri::command]
pub fn list_workspace_tree(
    state: State<'_, WorkspaceAccess>,
    root: String,
) -> Result<Vec<WorkspaceNode>, String> {
    let canonical = canonical_existing(Path::new(&root))?;
    if !canonical.is_dir() || !is_authorized(&state, &canonical) {
        return Err("文件夹未授权，已拒绝读取".to_string());
    }
    let mut count = 0;
    walk_tree(&canonical, 0, &mut count, true)
}

#[tauri::command]
pub fn read_workspace_docx(
    state: State<'_, WorkspaceAccess>,
    path: String,
) -> Result<WorkspaceDocxPayload, String> {
    let canonical = ensure_authorized_file(&state, Path::new(&path))?;
    let metadata = fs::metadata(&canonical).map_err(|error| format!("无法读取文稿：{error}"))?;
    if metadata.len() > MAX_DOCX_BYTES {
        return Err("DOCX 文件超过 80 MB，已拒绝打开".to_string());
    }
    let bytes = fs::read(&canonical).map_err(|error| format!("读取 DOCX 失败：{error}"))?;
    Ok(WorkspaceDocxPayload {
        path: display_path(&canonical),
        name: canonical
            .file_name()
            .and_then(|value| value.to_str())
            .unwrap_or("未命名.docx")
            .to_string(),
        bytes,
        modified: modified_ms(&metadata),
        size: metadata.len(),
    })
}

#[tauri::command]
pub fn stat_workspace_docx(
    state: State<'_, WorkspaceAccess>,
    path: String,
) -> Result<(i64, u64), String> {
    let canonical = ensure_authorized_file(&state, Path::new(&path))?;
    let metadata =
        fs::metadata(&canonical).map_err(|error| format!("无法读取文稿状态：{error}"))?;
    Ok((modified_ms(&metadata), metadata.len()))
}

fn backup_docx(app: &AppHandle, path: &Path) -> Result<PathBuf, String> {
    let directory = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("无法定位备份目录：{error}"))?
        .join("docx-backups");
    let mut hasher = DefaultHasher::new();
    path.to_string_lossy().hash(&mut hasher);
    let bucket = directory.join(format!("{:016x}", hasher.finish()));
    fs::create_dir_all(&bucket).map_err(|error| format!("创建备份目录失败：{error}"))?;
    let name = path
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or("document.docx");
    let backup = bucket.join(format!("{}-{name}", now_ms()));
    fs::copy(path, &backup).map_err(|error| format!("创建原件备份失败：{error}"))?;
    Ok(backup)
}

fn save_bytes(
    app: &AppHandle,
    state: &WorkspaceAccess,
    path: &Path,
    bytes: &[u8],
    expected: Option<(i64, u64)>,
) -> Result<WorkspaceSaveResult, String> {
    if bytes.is_empty() {
        return Err("DOCX 内容为空，已取消保存".to_string());
    }
    if bytes.len() as u64 > MAX_DOCX_BYTES {
        return Err("导出 DOCX 超过 80 MB，已拒绝保存".to_string());
    }
    let target = canonical_target(path)?;
    let existed = target.is_file();
    if existed {
        if !is_authorized(state, &target) {
            return Err("路径未被用户授权，已拒绝写入".to_string());
        }
        if let Some((mtime, size)) = expected {
            let metadata =
                fs::metadata(&target).map_err(|error| format!("无法读取文稿：{error}"))?;
            if modified_ms(&metadata) != mtime || metadata.len() != size {
                return Err("EXTERNAL_MODIFIED|文件已被外部程序修改".to_string());
            }
        }
    }
    let backup = if existed {
        Some(backup_docx(app, &target)?)
    } else {
        None
    };
    let result = crate::project::atomic_write(&target, bytes);
    if let Err(error) = result {
        return Err(format!(
            "保存失败：{error}。编辑内容已保留在恢复草稿中，原文件未被替换。"
        ));
    }
    let metadata = fs::metadata(&target).map_err(|error| format!("保存后无法读取文稿：{error}"))?;
    Ok(WorkspaceSaveResult {
        path: display_path(&target),
        modified: modified_ms(&metadata),
        size: metadata.len(),
        backup_path: backup.as_ref().map(|value| display_path(value)),
    })
}

#[tauri::command]
pub fn write_workspace_docx(
    app: AppHandle,
    state: State<'_, WorkspaceAccess>,
    path: String,
    bytes: Vec<u8>,
    expected_modified: i64,
    expected_size: u64,
) -> Result<WorkspaceSaveResult, String> {
    let target = ensure_authorized_file(&state, Path::new(&path))?;
    save_bytes(
        &app,
        &state,
        &target,
        &bytes,
        Some((expected_modified, expected_size)),
    )
}

#[tauri::command]
pub fn write_workspace_docx_as(
    app: AppHandle,
    state: State<'_, WorkspaceAccess>,
    path: String,
    bytes: Vec<u8>,
) -> Result<WorkspaceSaveResult, String> {
    if !is_docx(Path::new(&path)) {
        return Err("另存为必须使用 .docx 扩展名".to_string());
    }
    let target = canonical_target(Path::new(&path))?;
    let parent = target
        .parent()
        .ok_or_else(|| "保存路径没有父目录".to_string())?;
    let canonical_parent = canonical_existing(parent)?;
    {
        let mut roots = state
            .roots
            .lock()
            .map_err(|_| "目录授权状态不可用".to_string())?;
        if !roots.iter().any(|item| item == &canonical_parent) {
            roots.push(canonical_parent.clone());
        }
    }
    save_bytes(&app, &state, &target, &bytes, None)
}

#[tauri::command]
pub fn choose_workspace_save_path(
    window: tauri::WebviewWindow,
    state: State<'_, WorkspaceAccess>,
    title: String,
    default_name: String,
    initial_dir: String,
) -> Result<Option<String>, String> {
    let handle = window
        .hwnd()
        .map_err(|error| format!("无法取得窗口句柄：{error}"))?;
    let selected = crate::save_dialog::choose_save_path_in(
        handle.0 as isize,
        &title,
        &default_name,
        Some(Path::new(&initial_dir)),
    );
    if let Some(path) = &selected {
        let target = Path::new(path);
        let parent = target
            .parent()
            .ok_or_else(|| "保存路径没有父目录".to_string())?;
        authorize_root(&state, parent)?;
    }
    Ok(selected)
}

#[tauri::command]
pub fn reveal_workspace_path(
    state: State<'_, WorkspaceAccess>,
    path: String,
) -> Result<(), String> {
    let target = Path::new(&path);
    let canonical = if target.is_dir() {
        let value = canonical_existing(target)?;
        if !is_authorized(&state, &value) {
            return Err("路径未被授权".to_string());
        }
        value
    } else {
        ensure_authorized_file(&state, target)?
    };
    #[cfg(target_os = "windows")]
    {
        Command::new("explorer.exe")
            .arg("/select,")
            .arg(&canonical)
            .spawn()
            .map_err(|error| format!("无法打开资源管理器：{error}"))?;
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = canonical;
        return Err("当前平台未实现资源管理器显示".to_string());
    }
    Ok(())
}

#[tauri::command]
pub fn default_documents_dir() -> Result<String, String> {
    let home = std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .map_err(|_| "无法定位用户目录".to_string())?;
    let path = Path::new(&home).join("Documents").join("PaperScape");
    fs::create_dir_all(&path).map_err(|error| format!("创建默认文稿目录失败：{error}"))?;
    Ok(display_path(&path))
}

fn recent_items_file(app: &AppHandle) -> Result<PathBuf, String> {
    let directory = app
        .path()
        .app_config_dir()
        .map_err(|error| format!("无法定位应用数据目录：{error}"))?;
    fs::create_dir_all(&directory).map_err(|error| format!("创建应用数据目录失败：{error}"))?;
    Ok(directory.join("recent-items.json"))
}

#[tauri::command]
pub fn recent_items_list(app: AppHandle) -> Vec<RecentItem> {
    let Ok(path) = recent_items_file(&app) else {
        return Vec::new();
    };
    let Ok(bytes) = fs::read(path) else {
        return Vec::new();
    };
    let mut items: Vec<RecentItem> = serde_json::from_slice(&bytes).unwrap_or_default();
    items.retain(|item| {
        let path = Path::new(&item.path);
        if item.kind == "folder" {
            path.is_dir()
        } else if item.kind == "docx" {
            path.is_file()
        } else {
            path.join("project.json").is_file()
        }
    });
    items
}

fn write_recent_items(app: &AppHandle, items: &[RecentItem]) -> Result<(), String> {
    let path = recent_items_file(app)?;
    let mut bytes =
        serde_json::to_vec_pretty(items).map_err(|error| format!("序列化最近项目失败：{error}"))?;
    bytes.push(b'\n');
    let temp = path.with_extension("json.tmp");
    fs::write(&temp, &bytes).map_err(|error| format!("写入最近项目失败：{error}"))?;
    fs::rename(&temp, &path).map_err(|error| format!("替换最近项目失败：{error}"))?;
    Ok(())
}

#[tauri::command]
pub fn recent_item_add(app: AppHandle, kind: String, path: String) -> Result<(), String> {
    if !matches!(kind.as_str(), "docx" | "folder" | "project") {
        return Err("未知的最近项目类型".to_string());
    }
    let canonical = canonical_existing(Path::new(&path))?;
    let mut items = recent_items_list(app.clone());
    items.retain(|item| item.path.to_lowercase() != display_path(&canonical).to_lowercase());
    items.insert(
        0,
        RecentItem {
            kind,
            path: display_path(&canonical),
            name: canonical
                .file_name()
                .and_then(|value| value.to_str())
                .unwrap_or("PaperScape")
                .to_string(),
            last_opened_at: now_ms(),
        },
    );
    items.truncate(20);
    write_recent_items(&app, &items)
}

#[tauri::command]
pub fn recent_item_remove(app: AppHandle, path: String) -> Result<(), String> {
    let mut items = recent_items_list(app.clone());
    items.retain(|item| item.path.to_lowercase() != path.to_lowercase());
    write_recent_items(&app, &items)
}

#[tauri::command]
pub fn save_docx_recovery(
    app: AppHandle,
    key: String,
    payload: serde_json::Value,
) -> Result<String, String> {
    let directory = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("无法定位恢复目录：{error}"))?
        .join("docx-recovery");
    fs::create_dir_all(&directory).map_err(|error| format!("创建恢复目录失败：{error}"))?;
    let mut hasher = DefaultHasher::new();
    key.hash(&mut hasher);
    let path = directory.join(format!("{:016x}.json", hasher.finish()));
    let mut bytes = serde_json::to_vec_pretty(&payload)
        .map_err(|error| format!("序列化恢复草稿失败：{error}"))?;
    bytes.push(b'\n');
    crate::project::atomic_write(&path, &bytes)?;
    Ok(display_path(&path))
}

#[tauri::command]
pub fn load_docx_recovery(
    app: AppHandle,
    key: String,
) -> Result<Option<serde_json::Value>, String> {
    let directory = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("无法定位恢复目录：{error}"))?
        .join("docx-recovery");
    let mut hasher = DefaultHasher::new();
    key.hash(&mut hasher);
    let path = directory.join(format!("{:016x}.json", hasher.finish()));
    if !path.is_file() {
        return Ok(None);
    }
    let bytes = fs::read(path).map_err(|error| format!("读取恢复草稿失败：{error}"))?;
    serde_json::from_slice(&bytes)
        .map(Some)
        .map_err(|error| format!("恢复草稿损坏：{error}"))
}

#[tauri::command]
pub fn clear_docx_recovery(app: AppHandle, key: String) -> Result<(), String> {
    let directory = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("无法定位恢复目录：{error}"))?
        .join("docx-recovery");
    let mut hasher = DefaultHasher::new();
    key.hash(&mut hasher);
    let path = directory.join(format!("{:016x}.json", hasher.finish()));
    if path.exists() {
        fs::remove_file(path).map_err(|error| format!("删除恢复草稿失败：{error}"))?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    fn temp_root(name: &str) -> PathBuf {
        let root = std::env::temp_dir().join(format!("paperscape-workspace-{name}-{}", now_ms()));
        fs::create_dir_all(root.join("sub")).expect("create temp");
        fs::write(root.join("a.docx"), b"docx").expect("write a");
        fs::write(root.join("note.txt"), b"note").expect("write note");
        fs::write(root.join("sub").join("b.docx"), b"docx").expect("write b");
        root
    }

    #[test]
    fn tree_lists_docx_and_folders() {
        let root = temp_root("tree");
        let mut count = 0;
        let tree = walk_tree(&root, 0, &mut count, true).expect("tree");
        assert!(tree
            .iter()
            .any(|node| node.name == "a.docx" && node.editable));
        assert!(tree.iter().any(|node| node.name == "sub" && node.is_dir));
        assert!(tree.iter().all(|node| node.name != ".hidden"));
        fs::remove_dir_all(root).expect("cleanup");
    }

    #[test]
    fn rejects_unauthorized_and_traversal_paths() {
        let root = temp_root("auth");
        let access = WorkspaceAccess::default();
        authorize_root(&access, &root).expect("authorize");
        assert!(is_authorized(&access, &root.join("a.docx")));
        let outside = root.parent().expect("parent").join("outside.docx");
        let mut file = fs::File::create(&outside).expect("outside");
        file.write_all(b"x").expect("write outside");
        assert!(!is_authorized(&access, &outside));
        let error = ensure_authorized_file(&access, &outside).expect_err("must reject");
        assert!(!error.is_empty());
        fs::remove_file(outside).expect("cleanup outside");
        fs::remove_dir_all(root).expect("cleanup");
    }

    #[test]
    fn canonical_target_rejects_parent_segments() {
        let root = temp_root("target");
        let target = root.join("..").join("escaped.docx");
        assert!(
            canonical_target(&target).is_err()
                || !canonical_target(&target)
                    .expect("target")
                    .starts_with(&root)
        );
        fs::remove_dir_all(root).expect("cleanup");
    }
}
