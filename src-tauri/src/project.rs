use serde::{de::DeserializeOwned, Deserialize, Serialize};
use serde_json::{json, Value};
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use uuid::Uuid;

const PROJECT_VERSION: u32 = 1;
const CHAPTER_VERSION: u32 = 1;
const HISTORY_LIMIT: usize = 40;
const META_HISTORY_LIMIT: usize = 30;
const HISTORY_INTERVAL_MS: u64 = 30_000;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChapterSummary {
    pub id: String,
    pub title: String,
    pub file: String,
    pub updated_at: u64,
    pub character_count: u64,
    pub excerpt: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChapterFile {
    pub version: u32,
    pub id: String,
    pub title: String,
    /// Primary storage is a Tiptap JSON document.
    pub doc: Value,
    pub updated_at: u64,
    pub character_count: u64,
    pub excerpt: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectMeta {
    pub version: u32,
    pub id: String,
    pub name: String,
    pub created_at: u64,
    pub updated_at: u64,
    pub session_clean: bool,
    pub active_chapter_id: Option<String>,
    pub chapters: Vec<ChapterSummary>,
    #[serde(default)]
    pub appearance: Value,
    #[serde(default)]
    pub settings: Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecoveryCandidate {
    pub chapter_id: String,
    pub title: String,
    pub updated_at: u64,
    pub character_count: u64,
    pub excerpt: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenedProject {
    pub path: String,
    pub meta: ProjectMeta,
    pub active_chapter: Option<ChapterFile>,
    pub recovery: Vec<RecoveryCandidate>,
    pub warnings: Vec<String>,
    pub meta_recovered: bool,
    pub active_recovered: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChapterRead {
    pub chapter: ChapterFile,
    pub recovered: bool,
    pub warning: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveChapterInput {
    pub id: String,
    pub title: String,
    pub doc: Value,
    pub updated_at: u64,
    pub character_count: u64,
    pub excerpt: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveChapterResult {
    pub chapter: ChapterFile,
    pub meta: ProjectMeta,
    pub history_file: Option<String>,
    pub recovered: bool,
    pub warning: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateChapterResult {
    pub chapter: ChapterFile,
    pub meta: ProjectMeta,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteChapterResult {
    pub meta: ProjectMeta,
    pub active_chapter: Option<ChapterFile>,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HistoryEntry {
    pub file: String,
    pub timestamp: u64,
    pub reason: String,
    pub character_count: u64,
    pub title: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecentProject {
    pub path: String,
    pub name: String,
    pub last_opened_at: u64,
    pub chapter_count: usize,
    pub character_count: u64,
}

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis() as u64)
        .unwrap_or(0)
}

fn create_id() -> String {
    Uuid::new_v4().to_string()
}

fn display_path(path: &Path) -> String {
    let text = path.to_string_lossy().to_string();
    text.strip_prefix(r"\\?\")
        .or_else(|| text.strip_prefix(r"//?/"))
        .unwrap_or(&text)
        .to_string()
}

fn empty_doc() -> Value {
    json!({ "type": "doc", "content": [{ "type": "paragraph" }] })
}

fn normalize_title(title: &str) -> String {
    let trimmed = title.trim();
    if trimmed.is_empty() {
        "未命名章节".to_string()
    } else {
        trimmed.chars().take(120).collect()
    }
}

fn validate_chapter_id(id: &str) -> Result<(), String> {
    if !id.is_empty()
        && id.len() <= 80
        && id.chars().all(|character| {
            character.is_ascii_alphanumeric() || character == '-' || character == '_'
        })
    {
        Ok(())
    } else {
        Err("章节 ID 不合法".to_string())
    }
}

fn safe_file_name(name: &str) -> Result<(), String> {
    if name.is_empty()
        || name.len() > 160
        || name.contains('/')
        || name.contains('\\')
        || name.contains("..")
        || name.starts_with('.')
    {
        return Err("历史文件名不合法".to_string());
    }
    Ok(())
}

fn canonical_project_root(path: &Path) -> Result<PathBuf, String> {
    let root = fs::canonicalize(path).map_err(|error| format!("无法访问项目目录：{error}"))?;
    if !root.is_dir() {
        return Err("项目路径不是目录".to_string());
    }
    if !root.join("project.json").is_file() {
        return Err("该目录不是 PaperScape 项目（缺少 project.json）".to_string());
    }
    Ok(root)
}

fn chapters_dir(root: &Path) -> PathBuf {
    root.join("chapters")
}

fn history_dir(root: &Path, chapter_id: &str) -> PathBuf {
    root.join("history").join(chapter_id)
}

fn project_history_dir(root: &Path) -> PathBuf {
    root.join("history").join("project")
}

fn recovery_dir(root: &Path) -> PathBuf {
    root.join("recovery")
}

fn chapter_path(root: &Path, id: &str) -> Result<PathBuf, String> {
    validate_chapter_id(id)?;
    Ok(chapters_dir(root).join(format!("{id}.json")))
}

fn atomic_write(path: &Path, bytes: &[u8]) -> Result<(), String> {
    let parent = path
        .parent()
        .ok_or_else(|| "保存路径没有父目录".to_string())?;
    fs::create_dir_all(parent).map_err(|error| format!("创建目录失败：{error}"))?;
    let file_name = path
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("data");
    let temp_path = parent.join(format!(
        ".{file_name}.{}.{}.tmp",
        std::process::id(),
        now_ms()
    ));
    let result = (|| -> Result<(), String> {
        let mut file = OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&temp_path)
            .map_err(|error| format!("创建临时文件失败：{error}"))?;
        file.write_all(bytes)
            .map_err(|error| format!("写入临时文件失败：{error}"))?;
        file.sync_all()
            .map_err(|error| format!("同步临时文件失败：{error}"))?;
        drop(file);
        fs::rename(&temp_path, path).map_err(|error| format!("原子替换失败：{error}"))?;
        Ok(())
    })();
    if result.is_err() {
        let _ = fs::remove_file(&temp_path);
    }
    result
}

fn write_json<T: Serialize>(path: &Path, value: &T) -> Result<(), String> {
    let mut bytes =
        serde_json::to_vec_pretty(value).map_err(|error| format!("序列化失败：{error}"))?;
    bytes.push(b'\n');
    atomic_write(path, &bytes)
}

fn read_json<T: DeserializeOwned>(path: &Path) -> Result<T, String> {
    let bytes = fs::read(path).map_err(|error| format!("读取文件失败：{error}"))?;
    serde_json::from_slice(&bytes).map_err(|error| format!("文件 JSON 损坏：{error}"))
}

fn upsert_summary(meta: &mut ProjectMeta, chapter: &ChapterFile) {
    let summary = ChapterSummary {
        id: chapter.id.clone(),
        title: chapter.title.clone(),
        file: format!("chapters/{}.json", chapter.id),
        updated_at: chapter.updated_at,
        character_count: chapter.character_count,
        excerpt: chapter.excerpt.clone(),
    };
    if let Some(existing) = meta
        .chapters
        .iter_mut()
        .find(|existing| existing.id == chapter.id)
    {
        *existing = summary;
    } else {
        meta.chapters.push(summary);
    }
}

fn prune_history(dir: &Path, limit: usize) -> Result<(), String> {
    if !dir.exists() {
        return Ok(());
    }
    let mut entries = fs::read_dir(dir)
        .map_err(|error| format!("读取历史目录失败：{error}"))?
        .filter_map(Result::ok)
        .filter(|entry| entry.path().is_file())
        .collect::<Vec<_>>();
    entries.sort_by_key(|entry| entry.file_name());
    if entries.len() <= limit {
        return Ok(());
    }
    for entry in entries.iter().take(entries.len() - limit) {
        let _ = fs::remove_file(entry.path());
    }
    Ok(())
}

fn backup_chapter_file(
    root: &Path,
    chapter_id: &str,
    reason: &str,
) -> Result<Option<String>, String> {
    let source = chapter_path(root, chapter_id)?;
    if !source.is_file() {
        return Ok(None);
    }
    let dir = history_dir(root, chapter_id);
    fs::create_dir_all(&dir).map_err(|error| format!("创建历史目录失败：{error}"))?;
    let safe_reason = reason
        .chars()
        .map(|character| {
            if character.is_ascii_alphanumeric() || character == '-' {
                character
            } else {
                '-'
            }
        })
        .collect::<String>();
    let file_name = format!("{}-{}.json", now_ms(), safe_reason);
    let bytes = fs::read(&source).map_err(|error| format!("读取旧章节失败：{error}"))?;
    let target = dir.join(&file_name);
    atomic_write(&target, &bytes)?;
    prune_history(&dir, HISTORY_LIMIT)?;
    Ok(Some(file_name))
}

fn newest_history_time(root: &Path, chapter_id: &str) -> Option<u64> {
    let dir = history_dir(root, chapter_id);
    let entries = fs::read_dir(dir).ok()?;
    entries
        .filter_map(Result::ok)
        .filter_map(|entry| entry.metadata().ok()?.modified().ok())
        .filter_map(|modified| modified.duration_since(UNIX_EPOCH).ok())
        .map(|duration| duration.as_millis() as u64)
        .max()
}

fn should_backup(root: &Path, chapter_id: &str, reason: &str) -> bool {
    if reason != "autosave" {
        return true;
    }
    match newest_history_time(root, chapter_id) {
        Some(time) => now_ms().saturating_sub(time) >= HISTORY_INTERVAL_MS,
        None => true,
    }
}

fn backup_project_meta(root: &Path) -> Result<(), String> {
    let source = root.join("project.json");
    if !source.is_file() {
        return Ok(());
    }
    let dir = project_history_dir(root);
    fs::create_dir_all(&dir).map_err(|error| format!("创建项目历史目录失败：{error}"))?;
    let target = dir.join(format!("{}.json", now_ms()));
    let bytes = fs::read(&source).map_err(|error| format!("读取项目元数据失败：{error}"))?;
    atomic_write(&target, &bytes)?;
    prune_history(&dir, META_HISTORY_LIMIT)
}

fn write_project_meta(root: &Path, meta: &mut ProjectMeta) -> Result<(), String> {
    meta.updated_at = now_ms();
    backup_project_meta(root)?;
    let path = root.join("project.json");
    let backup_path = root.join("project.json.bak");
    let mut bytes =
        serde_json::to_vec_pretty(meta).map_err(|error| format!("序列化项目失败：{error}"))?;
    bytes.push(b'\n');
    atomic_write(&path, &bytes)?;
    // Keep a latest-good copy next to the project metadata. History files can
    // lag one save behind; this copy must match the file we just committed.
    atomic_write(&backup_path, &bytes)
}

fn read_project_meta(root: &Path) -> Result<(ProjectMeta, bool, Option<String>), String> {
    let meta_path = root.join("project.json");
    match read_json::<ProjectMeta>(&meta_path) {
        Ok(meta) => Ok((meta, false, None)),
        Err(primary_error) => {
            let backup_path = root.join("project.json.bak");
            if let Ok(meta) = read_json::<ProjectMeta>(&backup_path) {
                let trash = root.join("trash");
                fs::create_dir_all(&trash).map_err(|error| format!("创建回收目录失败：{error}"))?;
                let corrupt = trash.join(format!("corrupt-project-{}.json", now_ms()));
                let _ = fs::copy(&meta_path, &corrupt);
                write_json(&meta_path, &meta)?;
                return Ok((
                    meta,
                    true,
                    Some(format!(
                        "project.json 损坏，已从 project.json.bak 恢复。原文件保留在 {}",
                        corrupt.display()
                    )),
                ));
            }
            let dir = project_history_dir(root);
            let mut candidates = fs::read_dir(&dir)
                .map_err(|_| primary_error.clone())?
                .filter_map(Result::ok)
                .filter(|entry| entry.path().is_file())
                .collect::<Vec<_>>();
            candidates.sort_by_key(|entry| entry.file_name());
            for entry in candidates.into_iter().rev() {
                let Ok(meta) = read_json::<ProjectMeta>(&entry.path()) else {
                    continue;
                };
                let trash = root.join("trash");
                fs::create_dir_all(&trash).map_err(|error| format!("创建回收目录失败：{error}"))?;
                let corrupt = trash.join(format!("corrupt-project-{}.json", now_ms()));
                let _ = fs::copy(&meta_path, &corrupt);
                write_json(&meta_path, &meta)?;
                return Ok((
                    meta,
                    true,
                    Some(format!(
                        "project.json 损坏，已从历史备份恢复。原文件保留在 {}",
                        corrupt.display()
                    )),
                ));
            }
            Err(format!("project.json 损坏且没有可用备份：{primary_error}"))
        }
    }
}

fn read_chapter(root: &Path, id: &str) -> Result<ChapterRead, String> {
    let path = chapter_path(root, id)?;
    match read_json::<ChapterFile>(&path) {
        Ok(chapter) => Ok(ChapterRead {
            chapter,
            recovered: false,
            warning: None,
        }),
        Err(primary_error) => {
            let dir = history_dir(root, id);
            let mut candidates = fs::read_dir(&dir)
                .map_err(|_| primary_error.clone())?
                .filter_map(Result::ok)
                .filter(|entry| entry.path().is_file())
                .collect::<Vec<_>>();
            candidates.sort_by_key(|entry| entry.file_name());
            for entry in candidates.into_iter().rev() {
                if let Ok(chapter) = read_json::<ChapterFile>(&entry.path()) {
                    if chapter.id == id {
                        return Ok(ChapterRead {
                            chapter,
                            recovered: true,
                            warning: Some(format!(
                                "章节文件损坏，已从历史版本 {} 读取。原文件未覆盖。",
                                entry.file_name().to_string_lossy()
                            )),
                        });
                    }
                }
            }
            Err(format!("章节文件损坏且没有可用历史版本：{primary_error}"))
        }
    }
}

fn recovery_candidates(root: &Path, meta: &ProjectMeta) -> Vec<RecoveryCandidate> {
    let dir = recovery_dir(root);
    let Ok(entries) = fs::read_dir(&dir) else {
        return Vec::new();
    };
    let mut candidates = Vec::new();
    for entry in entries.filter_map(Result::ok) {
        let path = entry.path();
        if !path.is_file() || path.extension().and_then(|value| value.to_str()) != Some("json") {
            continue;
        }
        let Ok(recovery) = read_json::<ChapterFile>(&path) else {
            continue;
        };
        if !meta
            .chapters
            .iter()
            .any(|chapter| chapter.id == recovery.id)
        {
            continue;
        }
        let existing = read_chapter(root, &recovery.id).ok();
        let newer = existing
            .as_ref()
            .map(|current| recovery.updated_at > current.chapter.updated_at)
            .unwrap_or(true);
        if newer {
            candidates.push(RecoveryCandidate {
                chapter_id: recovery.id,
                title: recovery.title,
                updated_at: recovery.updated_at,
                character_count: recovery.character_count,
                excerpt: recovery.excerpt,
            });
        }
    }
    candidates
}

pub fn create_project(
    path: &Path,
    name: &str,
    appearance: Value,
    settings: Value,
) -> Result<OpenedProject, String> {
    if path.exists() {
        if !path.is_dir() {
            return Err("目标路径已经存在且不是项目目录".to_string());
        }
        let mut entries =
            fs::read_dir(path).map_err(|error| format!("读取目标目录失败：{error}"))?;
        if entries.next().is_some() {
            return Err("目标目录不是空目录，不能在此创建项目".to_string());
        }
    }
    fs::create_dir_all(path).map_err(|error| format!("创建项目目录失败：{error}"))?;
    let root = fs::canonicalize(path).map_err(|error| format!("无法规范化项目路径：{error}"))?;
    for dir in ["chapters", "history", "recovery", "trash", "assets"] {
        fs::create_dir_all(root.join(dir))
            .map_err(|error| format!("创建项目子目录失败：{error}"))?;
    }

    let project_id = create_id();
    let chapter_id = create_id();
    let now = now_ms();
    let project_name = if name.trim().is_empty() {
        root.file_name()
            .and_then(|value| value.to_str())
            .unwrap_or("未命名项目")
            .trim_end_matches(".paperscape")
            .to_string()
    } else {
        name.trim().chars().take(120).collect()
    };
    let chapter = ChapterFile {
        version: CHAPTER_VERSION,
        id: chapter_id.clone(),
        title: "第一章".to_string(),
        doc: empty_doc(),
        updated_at: now,
        character_count: 0,
        excerpt: String::new(),
    };
    let mut meta = ProjectMeta {
        version: PROJECT_VERSION,
        id: project_id,
        name: project_name,
        created_at: now,
        updated_at: now,
        session_clean: false,
        active_chapter_id: Some(chapter_id.clone()),
        chapters: vec![ChapterSummary {
            id: chapter_id.clone(),
            title: chapter.title.clone(),
            file: format!("chapters/{chapter_id}.json"),
            updated_at: now,
            character_count: 0,
            excerpt: String::new(),
        }],
        appearance,
        settings,
    };
    write_json(&chapter_path(&root, &chapter_id)?, &chapter)?;
    write_project_meta(&root, &mut meta)?;
    Ok(OpenedProject {
        path: display_path(&root),
        meta,
        active_chapter: Some(chapter),
        recovery: Vec::new(),
        warnings: Vec::new(),
        meta_recovered: false,
        active_recovered: false,
    })
}

pub fn open_project(path: &Path) -> Result<OpenedProject, String> {
    let root = canonical_project_root(path)?;
    let (mut meta, meta_recovered, meta_warning) = read_project_meta(&root)?;
    let was_clean = meta.session_clean;
    let recovery = if was_clean {
        Vec::new()
    } else {
        recovery_candidates(&root, &meta)
    };
    let active_id = meta
        .active_chapter_id
        .clone()
        .or_else(|| meta.chapters.first().map(|chapter| chapter.id.clone()));
    let mut warnings = Vec::new();
    if let Some(warning) = meta_warning {
        warnings.push(warning);
    }
    let active = if let Some(id) = active_id.clone() {
        match read_chapter(&root, &id) {
            Ok(read) => {
                if let Some(warning) = read.warning.clone() {
                    warnings.push(warning);
                }
                upsert_summary(&mut meta, &read.chapter);
                Some(read)
            }
            Err(error) => {
                warnings.push(error);
                None
            }
        }
    } else {
        None
    };
    meta.session_clean = false;
    write_project_meta(&root, &mut meta)?;
    Ok(OpenedProject {
        path: display_path(&root),
        meta,
        active_recovered: active.as_ref().map(|read| read.recovered).unwrap_or(false),
        active_chapter: active.map(|read| read.chapter),
        recovery,
        warnings,
        meta_recovered,
    })
}

pub fn load_chapter(path: &Path, chapter_id: &str) -> Result<ChapterRead, String> {
    let root = canonical_project_root(path)?;
    read_chapter(&root, chapter_id)
}

pub fn save_chapter(
    path: &Path,
    input: SaveChapterInput,
    reason: &str,
) -> Result<SaveChapterResult, String> {
    let root = canonical_project_root(path)?;
    validate_chapter_id(&input.id)?;
    let (mut meta, _, _) = read_project_meta(&root)?;
    let title = normalize_title(&input.title);
    let now = now_ms();
    let chapter = ChapterFile {
        version: CHAPTER_VERSION,
        id: input.id.clone(),
        title,
        doc: input.doc,
        updated_at: if input.updated_at == 0 {
            now
        } else {
            input.updated_at
        },
        character_count: input.character_count,
        excerpt: input.excerpt,
    };
    let chapter_file = chapter_path(&root, &chapter.id)?;
    let had_existing = chapter_file.is_file();
    let history_file = if had_existing && should_backup(&root, &chapter.id, reason) {
        backup_chapter_file(&root, &chapter.id, reason)?
    } else {
        None
    };
    // Recovery is written before the chapter file. If the process dies during
    // the final replace, the newest draft is still recoverable.
    write_json(
        &recovery_dir(&root).join(format!("{}.json", chapter.id)),
        &chapter,
    )?;
    write_json(&chapter_file, &chapter)?;
    upsert_summary(&mut meta, &chapter);
    meta.active_chapter_id = Some(chapter.id.clone());
    meta.session_clean = false;
    write_project_meta(&root, &mut meta)?;
    Ok(SaveChapterResult {
        chapter,
        meta,
        history_file,
        recovered: false,
        warning: None,
    })
}

pub fn save_preferences(
    path: &Path,
    appearance: Value,
    settings: Value,
    active_chapter_id: Option<String>,
) -> Result<ProjectMeta, String> {
    let root = canonical_project_root(path)?;
    let (mut meta, _, _) = read_project_meta(&root)?;
    if let Some(active) = active_chapter_id {
        if meta.chapters.iter().any(|chapter| chapter.id == active) {
            meta.active_chapter_id = Some(active);
        }
    }
    meta.appearance = appearance;
    meta.settings = settings;
    write_project_meta(&root, &mut meta)?;
    Ok(meta)
}

pub fn create_chapter(path: &Path, title: &str) -> Result<CreateChapterResult, String> {
    let root = canonical_project_root(path)?;
    let (mut meta, _, _) = read_project_meta(&root)?;
    let id = create_id();
    let now = now_ms();
    let chapter = ChapterFile {
        version: CHAPTER_VERSION,
        id: id.clone(),
        title: normalize_title(title),
        doc: empty_doc(),
        updated_at: now,
        character_count: 0,
        excerpt: String::new(),
    };
    write_json(&chapter_path(&root, &id)?, &chapter)?;
    upsert_summary(&mut meta, &chapter);
    meta.active_chapter_id = Some(id);
    meta.session_clean = false;
    write_project_meta(&root, &mut meta)?;
    Ok(CreateChapterResult { chapter, meta })
}

pub fn rename_chapter(path: &Path, chapter_id: &str, title: &str) -> Result<ProjectMeta, String> {
    let root = canonical_project_root(path)?;
    let (mut meta, _, _) = read_project_meta(&root)?;
    let mut chapter = read_chapter(&root, chapter_id)?.chapter;
    chapter.title = normalize_title(title);
    chapter.updated_at = now_ms();
    backup_chapter_file(&root, chapter_id, "rename")?;
    write_json(&chapter_path(&root, chapter_id)?, &chapter)?;
    upsert_summary(&mut meta, &chapter);
    write_project_meta(&root, &mut meta)?;
    Ok(meta)
}

pub fn reorder_chapters(path: &Path, ordered_ids: Vec<String>) -> Result<ProjectMeta, String> {
    let root = canonical_project_root(path)?;
    let (mut meta, _, _) = read_project_meta(&root)?;
    if ordered_ids.len() != meta.chapters.len() {
        return Err("章节顺序与章节数量不一致".to_string());
    }
    let mut reordered = Vec::with_capacity(meta.chapters.len());
    for id in &ordered_ids {
        let summary = meta
            .chapters
            .iter()
            .find(|chapter| &chapter.id == id)
            .ok_or_else(|| "章节顺序包含未知章节".to_string())?;
        reordered.push(summary.clone());
    }
    meta.chapters = reordered;
    write_project_meta(&root, &mut meta)?;
    Ok(meta)
}

pub fn delete_chapter(path: &Path, chapter_id: &str) -> Result<DeleteChapterResult, String> {
    let root = canonical_project_root(path)?;
    let (mut meta, _, _) = read_project_meta(&root)?;
    if meta.chapters.len() <= 1 {
        return Err("至少保留一个章节；请新建章节后再删除".to_string());
    }
    let index = meta
        .chapters
        .iter()
        .position(|chapter| chapter.id == chapter_id)
        .ok_or_else(|| "找不到要删除的章节".to_string())?;
    let deleting_active = meta.active_chapter_id.as_deref() == Some(chapter_id);
    let source = chapter_path(&root, chapter_id)?;
    let trash = root.join("trash");
    fs::create_dir_all(&trash).map_err(|error| format!("创建回收目录失败：{error}"))?;
    let target = trash.join(format!("{}-{}.json", now_ms(), chapter_id));
    if source.is_file() {
        fs::rename(&source, &target)
            .or_else(|_| {
                fs::copy(&source, &target)
                    .map(|_| ())
                    .and_then(|_| fs::remove_file(&source))
            })
            .map_err(|error| format!("移入回收目录失败：{error}"))?;
    }
    meta.chapters.remove(index);
    if deleting_active {
        let next_id = meta
            .chapters
            .get(index.min(meta.chapters.len().saturating_sub(1)))
            .map(|chapter| chapter.id.clone());
        meta.active_chapter_id = next_id;
    }
    write_project_meta(&root, &mut meta)?;
    let mut warnings = Vec::new();
    let active_id = meta.active_chapter_id.clone();
    let active_chapter = if let Some(id) = active_id {
        match read_chapter(&root, &id) {
            Ok(read) => {
                if let Some(warning) = read.warning {
                    warnings.push(warning);
                }
                Some(read.chapter)
            }
            Err(error) => {
                warnings.push(error);
                None
            }
        }
    } else {
        None
    };
    Ok(DeleteChapterResult {
        meta,
        active_chapter,
        warnings,
    })
}

pub fn close_project(path: &Path) -> Result<ProjectMeta, String> {
    let root = canonical_project_root(path)?;
    let (mut meta, _, _) = read_project_meta(&root)?;
    let recovery = recovery_dir(&root);
    if let Ok(entries) = fs::read_dir(&recovery) {
        for entry in entries.filter_map(Result::ok) {
            if entry.path().is_file() {
                let _ = fs::remove_file(entry.path());
            }
        }
    }
    meta.session_clean = true;
    write_project_meta(&root, &mut meta)?;
    Ok(meta)
}

pub fn list_history(path: &Path, chapter_id: &str) -> Result<Vec<HistoryEntry>, String> {
    let root = canonical_project_root(path)?;
    validate_chapter_id(chapter_id)?;
    let dir = history_dir(&root, chapter_id);
    let Ok(entries) = fs::read_dir(dir) else {
        return Ok(Vec::new());
    };
    let mut history = Vec::new();
    for entry in entries.filter_map(Result::ok) {
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        let file = entry.file_name().to_string_lossy().to_string();
        if safe_file_name(&file).is_err() {
            continue;
        }
        let Ok(chapter) = read_json::<ChapterFile>(&path) else {
            continue;
        };
        let timestamp = file
            .split('-')
            .next()
            .and_then(|value| value.parse::<u64>().ok())
            .unwrap_or(0);
        let reason = file
            .trim_end_matches(".json")
            .split_once('-')
            .map(|(_, reason)| reason.to_string())
            .unwrap_or_else(|| "save".to_string());
        history.push(HistoryEntry {
            file,
            timestamp,
            reason,
            character_count: chapter.character_count,
            title: chapter.title,
        });
    }
    history.sort_by(|left, right| right.timestamp.cmp(&left.timestamp));
    Ok(history)
}

pub fn restore_history(
    path: &Path,
    chapter_id: &str,
    history_file: &str,
) -> Result<ChapterRead, String> {
    let root = canonical_project_root(path)?;
    validate_chapter_id(chapter_id)?;
    safe_file_name(history_file)?;
    let backup = history_dir(&root, chapter_id).join(history_file);
    let mut chapter = read_json::<ChapterFile>(&backup)?;
    if chapter.id != chapter_id {
        return Err("历史版本与章节不匹配".to_string());
    }
    let (mut meta, _, _) = read_project_meta(&root)?;
    backup_chapter_file(&root, chapter_id, "before-restore")?;
    chapter.updated_at = now_ms();
    write_json(&chapter_path(&root, chapter_id)?, &chapter)?;
    upsert_summary(&mut meta, &chapter);
    write_project_meta(&root, &mut meta)?;
    Ok(ChapterRead {
        chapter,
        recovered: true,
        warning: Some("已恢复历史版本；恢复前的章节也保存在历史中。".to_string()),
    })
}

pub fn restore_recovery(path: &Path, chapter_id: &str) -> Result<ChapterRead, String> {
    let root = canonical_project_root(path)?;
    validate_chapter_id(chapter_id)?;
    let recovery_path = recovery_dir(&root).join(format!("{chapter_id}.json"));
    let mut chapter = read_json::<ChapterFile>(&recovery_path)?;
    if chapter.id != chapter_id {
        return Err("恢复草稿与章节不匹配".to_string());
    }
    let (mut meta, _, _) = read_project_meta(&root)?;
    backup_chapter_file(&root, chapter_id, "before-recovery")?;
    chapter.updated_at = now_ms();
    write_json(&chapter_path(&root, chapter_id)?, &chapter)?;
    upsert_summary(&mut meta, &chapter);
    meta.active_chapter_id = Some(chapter.id.clone());
    write_project_meta(&root, &mut meta)?;
    let _ = fs::remove_file(&recovery_path);
    Ok(ChapterRead {
        chapter,
        recovered: true,
        warning: Some("已恢复异常关闭前的草稿".to_string()),
    })
}

pub fn discard_recovery(path: &Path, chapter_id: &str) -> Result<(), String> {
    let root = canonical_project_root(path)?;
    validate_chapter_id(chapter_id)?;
    let recovery_path = recovery_dir(&root).join(format!("{chapter_id}.json"));
    if recovery_path.is_file() {
        fs::remove_file(&recovery_path).map_err(|error| format!("删除恢复草稿失败：{error}"))?;
    }
    Ok(())
}

pub fn project_recent(path: &Path) -> Result<RecentProject, String> {
    let root = canonical_project_root(path)?;
    let (meta, _, _) = read_project_meta(&root)?;
    let character_count = meta
        .chapters
        .iter()
        .map(|chapter| chapter.character_count)
        .sum();
    Ok(RecentProject {
        path: display_path(&root),
        name: meta.name,
        last_opened_at: now_ms(),
        chapter_count: meta.chapters.len(),
        character_count,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Duration;

    struct TestDir(PathBuf);

    impl TestDir {
        fn new() -> Self {
            let path = std::env::temp_dir().join(format!(
                "paperscape-p4-{}-{}",
                std::process::id(),
                Uuid::new_v4()
            ));
            fs::create_dir_all(&path).expect("temp dir");
            Self(path)
        }
    }

    impl Drop for TestDir {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.0);
        }
    }

    fn project() -> (TestDir, PathBuf) {
        let directory = TestDir::new();
        let root = directory.0.join("novel.paperscape");
        create_project(
            &root,
            "长篇测试",
            json!({ "mode": "paper" }),
            json!({ "fontSize": 18 }),
        )
        .expect("create");
        (directory, root)
    }

    fn chapter(id: &str, text: &str) -> SaveChapterInput {
        SaveChapterInput {
            id: id.to_string(),
            title: "测试章节".to_string(),
            doc: json!({
                "type": "doc",
                "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": text }] }]
            }),
            updated_at: now_ms(),
            character_count: text.chars().count() as u64,
            excerpt: text.chars().take(80).collect(),
        }
    }

    #[test]
    fn creates_and_reopens_project() {
        let (_guard, root) = project();
        let opened = open_project(&root).expect("open");
        assert_eq!(opened.meta.name, "长篇测试");
        assert_eq!(opened.meta.chapters.len(), 1);
        assert!(opened.active_chapter.is_some());
    }

    #[test]
    fn saves_chapter_and_rejects_corrupt_overwrite() {
        let (_guard, root) = project();
        let opened = open_project(&root).expect("open");
        let id = opened.active_chapter.as_ref().unwrap().id.clone();
        let saved = save_chapter(&root, chapter(&id, "第一版正文"), "manual").expect("save");
        assert_eq!(saved.chapter.character_count, 5);
        let loaded = load_chapter(&root, &id).expect("load");
        assert_eq!(loaded.chapter.title, "测试章节");
        assert!(loaded.chapter.doc.to_string().contains("第一版正文"));
        let second = save_chapter(&root, chapter(&id, "第二版正文"), "manual").expect("save 2");
        assert!(second.history_file.is_some());
        let history = list_history(&root, &id).expect("history");
        assert!(!history.is_empty());
    }

    #[test]
    fn atomically_replaces_existing_json() {
        let directory = TestDir::new();
        let target = directory.0.join("data.json");
        atomic_write(&target, b"{\"one\":1}").expect("first");
        atomic_write(&target, b"{\"two\":2}").expect("second");
        assert_eq!(fs::read_to_string(&target).unwrap(), "{\"two\":2}");
    }

    #[test]
    fn recovers_corrupt_project_meta_from_history() {
        let (_guard, root) = project();
        let opened = open_project(&root).expect("open");
        let id = opened.active_chapter.as_ref().unwrap().id.clone();
        save_chapter(&root, chapter(&id, "会保留的正文"), "manual").expect("save");
        // Wait for a distinct millisecond filename.
        std::thread::sleep(Duration::from_millis(3));
        save_preferences(&root, json!({ "mode": "immersive" }), json!({}), None).expect("prefs");
        fs::write(root.join("project.json"), b"{ damaged").expect("damage");
        let recovered = open_project(&root).expect("recover");
        assert!(recovered.meta_recovered);
        assert_eq!(recovered.meta.appearance["mode"], "immersive");
        assert!(root.join("trash").read_dir().unwrap().next().is_some());
    }

    #[test]
    fn recovers_newer_recovery_draft_after_interruption() {
        let (_guard, root) = project();
        let opened = open_project(&root).expect("open");
        let id = opened.active_chapter.as_ref().unwrap().id.clone();
        // Simulate a process death after recovery was written but before chapter replace.
        let draft = ChapterFile {
            version: CHAPTER_VERSION,
            id: id.clone(),
            title: "草稿标题".to_string(),
            doc: empty_doc(),
            updated_at: now_ms() + 10_000,
            character_count: 999,
            excerpt: "草稿".to_string(),
        };
        write_json(&recovery_dir(&root).join(format!("{id}.json")), &draft).expect("draft");
        let reopened = open_project(&root).expect("open");
        assert!(reopened.recovery.iter().any(|item| item.chapter_id == id));
        let restored = restore_recovery(&root, &id).expect("restore");
        assert_eq!(restored.chapter.title, "草稿标题");
        assert!(!recovery_dir(&root).join(format!("{id}.json")).exists());
    }

    #[test]
    fn restores_history_without_losing_current_version() {
        let (_guard, root) = project();
        let opened = open_project(&root).expect("open");
        let id = opened.active_chapter.as_ref().unwrap().id.clone();
        save_chapter(&root, chapter(&id, "一"), "manual").expect("one");
        save_chapter(&root, chapter(&id, "二"), "manual").expect("two");
        let history = list_history(&root, &id).expect("history");
        let entry = history.first().expect("entry").file.clone();
        let before = fs::read(chapter_path(&root, &id).unwrap()).unwrap();
        restore_history(&root, &id, &entry).expect("restore");
        let after = fs::read(chapter_path(&root, &id).unwrap()).unwrap();
        assert_ne!(before, after);
        let history = list_history(&root, &id).expect("history");
        assert!(history.iter().any(|item| item.reason == "before-restore"));
    }

    #[test]
    fn falls_back_to_history_when_chapter_file_is_corrupt() {
        let (_guard, root) = project();
        let opened = open_project(&root).expect("open");
        let id = opened.active_chapter.as_ref().unwrap().id.clone();
        save_chapter(&root, chapter(&id, "历史内容"), "manual").expect("one");
        save_chapter(&root, chapter(&id, "新内容"), "manual").expect("two");
        let file = chapter_path(&root, &id).unwrap();
        let corrupt_bytes = fs::read(&file).unwrap();
        fs::write(&file, b"{ broken chapter").expect("damage");
        let loaded = load_chapter(&root, &id).expect("fallback");
        assert!(loaded.recovered);
        assert!(loaded.chapter.doc.to_string().contains("历史内容"));
        // The corrupt file is not silently overwritten by a read.
        assert_eq!(fs::read(&file).unwrap(), b"{ broken chapter");
        // And the old bytes are still reproducible after the test.
        assert!(!corrupt_bytes.is_empty());
    }

    #[test]
    fn closes_cleanly_and_removes_recovery_drafts() {
        let (_guard, root) = project();
        let opened = open_project(&root).expect("open");
        let id = opened.active_chapter.as_ref().unwrap().id.clone();
        save_chapter(&root, chapter(&id, "关闭前内容"), "manual").expect("save");
        assert!(recovery_dir(&root).join(format!("{id}.json")).is_file());
        let meta = close_project(&root).expect("close");
        assert!(meta.session_clean);
        assert!(fs::read_dir(recovery_dir(&root)).unwrap().next().is_none());
        let reopened = open_project(&root).expect("reopen");
        assert!(reopened.recovery.is_empty());
        assert!(reopened.active_chapter.is_some());
    }

    #[test]
    fn rejects_path_traversal_and_last_chapter_deletion() {
        let (_guard, root) = project();
        let opened = open_project(&root).expect("open");
        let first = opened.meta.chapters[0].id.clone();
        assert!(load_chapter(&root, "../../project").is_err());
        assert!(delete_chapter(&root, &first).is_err());
    }

    #[test]
    fn reorders_chapters_and_moves_deleted_chapter_to_trash() {
        let (_guard, root) = project();
        let opened = open_project(&root).expect("open");
        let first = opened.meta.chapters[0].id.clone();
        let created = create_chapter(&root, "第二章").expect("create");
        let second = created.chapter.id.clone();
        let reordered =
            reorder_chapters(&root, vec![second.clone(), first.clone()]).expect("order");
        assert_eq!(reordered.chapters[0].id, second);
        let deleted = delete_chapter(&root, &second).expect("delete");
        assert_eq!(deleted.meta.chapters.len(), 1);
        assert_eq!(deleted.meta.chapters[0].id, first);
        assert!(root.join("trash").read_dir().unwrap().next().is_some());
    }

    #[test]
    fn saves_and_opens_large_multi_chapter_project() {
        let (_guard, root) = project();
        let opened = open_project(&root).expect("open");
        let first = opened.meta.chapters[0].id.clone();
        let big = "长".repeat(80_000);
        save_chapter(&root, chapter(&first, &big), "manual").expect("big");
        let mut ids = vec![first];
        for index in 0..4 {
            let created = create_chapter(&root, &format!("第{}章", index + 2)).expect("create");
            let id = created.chapter.id.clone();
            save_chapter(&root, chapter(&id, &big), "manual").expect("big chapter");
            ids.push(id);
        }
        let reopened = open_project(&root).expect("reopen");
        assert_eq!(reopened.meta.chapters.len(), 5);
        assert!(reopened.active_chapter.is_some());
        let total: u64 = reopened
            .meta
            .chapters
            .iter()
            .map(|item| item.character_count)
            .sum();
        assert_eq!(total, 400_000);
        assert_eq!(reordered_total(&root), 400_000);
    }

    fn reordered_total(root: &Path) -> u64 {
        let opened = open_project(root).expect("open for total");
        opened
            .meta
            .chapters
            .iter()
            .map(|item| item.character_count)
            .sum()
    }

    #[test]
    fn preferences_do_not_touch_chapter_files() {
        let (_guard, root) = project();
        let opened = open_project(&root).expect("open");
        let id = opened.active_chapter.as_ref().unwrap().id.clone();
        save_chapter(&root, chapter(&id, "正文保持"), "manual").expect("save");
        let before = fs::read(chapter_path(&root, &id).unwrap()).unwrap();
        save_preferences(
            &root,
            json!({ "mode": "immersive", "background": { "kind": "image" } }),
            json!({}),
            None,
        )
        .expect("prefs");
        let after = fs::read(chapter_path(&root, &id).unwrap()).unwrap();
        assert_eq!(before, after);
        let reopened = open_project(&root).expect("reopen");
        assert_eq!(reopened.meta.appearance["mode"], "immersive");
    }
}
