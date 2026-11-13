# PaperScape 开发状态

- 更新时间：2026-11-13
- 版本：**1.1.0（V1.1 第三阶段）**
- 阶段：沉浸式写作、全屏与字体系统
- 结论：**F11 原生全屏、专注写作模式、输入法安全的 Esc 处理、系统/导入字体管理已完成；未生成 NSIS。中文输入法候选框的原生行为仍需人工按步骤验收。**
- 注意：用户指定的 `V1.1_UPGRADE_PLAN.md` 在工作区中不存在；本次按任务消息中的完整需求实现。

## V1.1 第三阶段

### 实现

- **F11 全屏**：使用 Tauri 原生 `setFullscreen`，保留 PaperScape 标题栏、工具栏、章节栏和编辑区；退出后恢复窗口尺寸和布局。没有重建 Tiptap。
- **专注写作**：
  - `Ctrl+Shift+F` 切换；标题栏按钮也可进入。
  - 专注时隐藏标题栏、菜单、工具栏、章节栏、文档栏和状态栏，只保留编辑区、背景和顶部悬停控制。
  - 背景铺满窗口；纸张透明度默认 85%（60–100% 可调）；背景亮度、模糊、遮罩分别可调；中央纸张保持可读的文字对比。
  - 顶部鼠标悬停显示“退出专注”和四个滑杆；`Esc` 退出。
  - 专注状态使用局部临时设置，退出后恢复原项目/文稿外观，不写回项目设置。
- **中文输入法保护**：
  - 全局 keydown 首先检查 `isComposing`/229，输入组合状态直接返回，`Esc` 不会误退专注。
  - 不使用窗口始终置顶。
  - 微软拼音会占用 `Ctrl+Shift+F`，WebView2 收不到该组合键；应用使用仅在前台运行的 20ms 轻量原生组合键轮询转发专注切换，未引入后台常驻服务。
- **字体系统**：
  - 新增 Rust 字体服务：扫描 Windows Fonts 的 TTF/OTF、解析 OpenType `name` 表、导入字体到应用数据目录、读取字体字节、移除导入字体。
  - 新增字体管理界面：Windows 已安装字体、导入字体、搜索、中文/英文/数字预览、界面字体/正文字体分开设置、切换、移除、恢复默认。
  - 字体按需读取，不内置字体包；导入文件只写入应用数据，不修改系统字体。
  - 无效/损坏文件在解析阶段拒绝；缺少中文字形时使用系统中文回退字体。
  - 写作字体只改变显示；DOCX 导出字体仍由导出对话框单独决定。

### 测试

- 前端：**11 个测试文件，53 个测试通过**。
  - 专注模式切换不重建编辑器、IME 组合 Esc 不退出、纸张 85% 默认值。
  - 字体设置 UI/正文分离、CSS 变量与持久化。
  - F11 全屏调用、既有缩放/启动/项目/文件树/DOCX 测试继续通过。
- Rust：**17 个测试通过**；`cargo fmt` 通过。
- `pnpm check`：通过。
- `pnpm tauri build --no-bundle`：通过（V1.1.0 release）；384 modules，初始 JS 948.59 kB（gzip 292.30 kB），CSS 61.90 kB。
- **未生成 NSIS**。

### 真实窗口验收

- F11：普通窗口 `1295×829` → 全屏 `1707×1067`（等于屏幕）→ 再按 F11 恢复 `1295×829`。
- 专注模式实际截图：标题栏、工具栏、侧栏、状态栏全部隐藏；背景铺满；中央纸张默认 85%；顶部悬停控件显示“退出专注 / 纸张 / 亮度 / 模糊 / 遮罩”。
- `Ctrl+Shift+F` 在微软拼音占用该组合键的情况下仍成功进入/退出专注模式；Esc 也可退出。
- 字体管理实际打开：读取 Windows 字体列表成功；切换“写作正文字体”成功；原生“导入字体”对话框可以打开。
- 既有自动保存、DOCX 打开/保存和文件树流程的自动化测试未回退。
- **未完成/必须人工复测**：
  - 微软拼音候选框位置、层级、组合中切换焦点、候选翻页和中英文标点——无法用本项目自动化可靠模拟原生 IME。
  - Windows 系统 100%/125% DPI 下的候选框定位。
  - 原生导入对话框的自动化文件选择未完成；代码路径已编译并通过解析器测试，仍需人工完成一次真实导入/移除/重启加载。
  - DOCX 导出的真实 Word 打开检查本阶段未重新执行。

## V1.1 第二阶段

以下为界面与启动体验阶段记录。


### 实现

- **UI 可读性**：菜单/工具栏 13 CSS px，章节标题 14 px，辅助信息 12 px，正文默认 18 px；使用 `--ui-scale` 统一调整 UI 字体、标题栏/状态栏高度和侧栏宽度，不触碰编辑器正文字号。
- **界面缩放**：100/110/125/150%，默认 110%；存储在 `paperscape.uiZoom`，菜单“视图”、设置面板和 `Ctrl+Alt+1/2/3/4` 可切换。
- **文稿缩放**：50%–200%，`Ctrl + 滚轮`、`Ctrl + +`、`Ctrl + -`、`Ctrl + 0`、底部百分比控件；只对 `.editor-sheet` 应用 CSS `zoom`，Tiptap JSON、字号、行距和 DOCX 导出不变。
- **顶部布局**：项目/文稿名称绝对定位于窗口中心，不再占用菜单尾部；长名称省略，点击显示真实路径和复制按钮；不再在章节栏重复项目名。
- **启动体验**：默认自动打开上次项目或文件夹；`paperscape.openLastSession` 可关闭；欢迎页只保留新建文稿、打开文件、打开文件夹、最近使用；旧版项目/设置收进折叠入口；最近项目合并到“最近使用”。
- **状态栏**：合并保存状态为“正在保存 / 尚未保存 / 已保存 · 时间 / 保存失败”；文档模式增加字数、文件名称和缩放控件。

### 测试

- 前端：**10 个测试文件，50 个测试通过**。
  - 新增 UI/文稿缩放测试：4 个。
  - 新增标题栏居中名称/路径信息测试：1 个。
  - 新增状态栏保存与缩放测试：1 个。
  - 新增启动自动打开上次项目测试：1 个；原有项目/文件树/DOCX/编辑器测试保持通过。
- Rust：**15 个测试通过**；`cargo fmt --check` 通过。
- `pnpm check`：通过。
- `pnpm tauri build --no-bundle`：通过，V1.1.0 release；379 modules，初始 JS 936.15 kB（gzip 288.75 kB），CSS 57.20 kB。
- **未生成 NSIS**。

### 真实窗口验收

- 欢迎页只显示“新建文稿 / 打开文件 / 打开文件夹”和“最近使用”；旧版项目入口折叠，不显示 Tiptap JSON/project.json 等技术术语。
- 打开真实文件夹 `PaperScapeP2Test`，文件树显示 `排版样本.docx`。
- 重启应用后自动打开上次文件夹（`FILES` + 文件夹标题），无需再次定位。
- 项目/文档名称在窗口中的实测中心偏差：默认窗口 **0 px**，调整到 2160×1440 物理像素后 **0.5 px**。
- 窄窗口下标题名称不与最小化/最大化/关闭按钮重叠：标题右边界 1284，窗口控件从 2063 开始。
- 打开 DOCX 后状态栏显示“已保存 · 时间”和字数；文档路径显示在文档栏。
- `Ctrl + +` 实测把文稿缩放从 100% 调到 110%；`Ctrl + -`、`Ctrl + 0` 复位到 100%。
- **界面缩放 150% 已完成真实截图**：菜单、工具栏、文件树、文档栏和状态栏放大；项目标题仍居中，标题右边界 1420，最小化按钮从 2033 开始，不重叠。
- `Ctrl+Alt+1/2/3/4` 可切换 100/110/125/150%；100/125/150 的实际窗口中心偏差均为 0。
- **仍受限**：Windows 系统缩放 100%/125% 未切换实测（当前系统 150%）；文稿放大后的逐字输入/中文输入法未完成稳定自动化，需人工复测。

## V1.1 第一阶段

以下为文件管理阶段的记录，保留用于追溯。

### V1 备份

```text
git tag v1.0.0-baseline
git branch v1-baseline
commit 38d5d8e fix: make window close reliable and save before exit
```

补充了独立备份文件：

- `backups/PaperScape-v1.0.0-source.zip`：从基线导出的完整源码/资源归档。
- `backups/PaperScape-v1.0.0.bundle`：完整 Git 历史。
- `backups/V1_BACKUP_MANIFEST.md`：恢复说明、SHA256 和验证记录。
- `backups/SHA256SUMS.txt`：备份文件校验和。

已验证归档内版本为 1.0.0、安装包哈希与当前 V1 安装包一致，`git bundle verify` 通过。未发现需要迁移/备份的 `.paperscape` 用户项目。V1 项目格式保留读取；没有自动迁移、移动或删除 V1 文稿。

### 实现

#### 后端（Rust）

- 新增 `src-tauri/src/workspace.rs`：
  - 记忆已授权文件夹/文件根，拒绝未授权路径。
  - `canonicalize` 路径，拒绝路径穿越；跳过符号链接和 Windows reparse point。
  - 真实文件夹树读取，支持嵌套目录、隐藏/构建目录过滤和节点上限。
  - DOCX 读取、状态读取、覆盖写入、另存为。
  - 覆盖前备份到应用数据目录 `docx-backups`。
  - 修改时间 + 文件大小外部修改检测。
  - 临时文件 + 原子替换。
  - 资源管理器显示。
  - 最近文件/文件夹持久化。
  - DOCX 恢复草稿保存/读取/清除。
  - 默认文稿目录 `Documents\PaperScape`。
- 新增 Tauri commands：`choose_workspace_folder`、`choose_workspace_docx`、`authorize_workspace_path`、`list_workspace_tree`、`read_workspace_docx`、`stat_workspace_docx`、`write_workspace_docx`、`write_workspace_docx_as`、`choose_workspace_save_path`、`reveal_workspace_path`、`default_documents_dir`、`recent_items_list/add/remove`、`save/load/clear_docx_recovery`。
- 窗口关闭事件仍显式退出，避免 V1.0 的关闭失效回归。

#### 前端

- `useDocumentWorkspace`：文件夹、文件树、DOCX 状态、最近项、恢复草稿、保存/另存为、外部修改冲突、只读与风险授权。
- `FileTree`：真实文件树、子文件夹展开、刷新、文件切换、V1 项目入口。
- `DocumentBar`：文件名、真实路径、未保存/只读、保存/另存为/资源管理器、备份路径、风险提示。
- 菜单和快捷键改为 Windows 常规：
  - `Ctrl+N` 新建文档；`Ctrl+O` 打开文档；`Ctrl+Shift+O` 打开文件夹；`Ctrl+S` 保存；`Ctrl+Shift+S` 另存为。
- 启动页增加新建文档、打开 Word、打开文件夹、最近文件/文件夹和默认文稿目录。
- 设置面板增加默认文稿目录。
- `inspectDocxRisk` 使用 JSZip 预检页眉页脚、批注、修订、公式、文本框、宏、嵌入对象、浮动图片、多分节、真实脚注/尾注。
- 打开 DOCX 后不再因为编辑器初始化而错误标记为“未保存”。
- 拖放入口使用 Tauri `onDragDropEvent`。

### 测试结果

前端：**7 个测试文件，42 个测试通过**。

- 原有 39 个测试保持通过。
- 新增 DOCX 风险预检 2 个测试。
- 新增文件树展开/文件切换 1 个测试。

Rust：**15 个测试通过**。

- 原有 12 个 storage/history/recovery/path 测试。
- 新增 3 个 workspace 测试：文件树、未授权路径拒绝、目标路径穿越。
- `cargo fmt --check` 通过。

构建：

- `pnpm check`：通过。
- `pnpm test`：42/42。
- `pnpm build`：通过，377 modules；初始 JS 930.68 kB（gzip 287.08 kB），CSS 52.35 kB。
- `pnpm tauri build --no-bundle`：通过，V1.1.0 release。
- **未生成 NSIS**，符合本阶段要求。

### 真实窗口验收

- 启动页可打开真实文件夹，左侧显示 `文稿A.docx`、`子文件夹`、`note.txt`。
- 从真实文件树打开 `文稿A.docx`，文档栏显示真实路径。
- 编辑器可输入并保存回原 DOCX。
- 保存前自动生成原件备份：原 39,612 bytes → 新 12,994 bytes；备份保留原文件。
- 保存后的 DOCX 用 Microsoft Word 16.0 打开：21 段落、1 表格、1 InlineShape，中文内容存在。
- 外部程序替换文件后点击保存：被阻止并提示“文件已被外部程序修改”。
- 新建文档首次保存为 `新建文稿.docx` 成功（9,674 bytes）。
- V1 项目 `V11兼容项目` 创建、关闭/重启后在最近项目中重新打开成功。
- 打开文档不再出现误标“未保存”。
- 风险预检不再把 docx 库生成的空脚注/尾注误判为不支持内容。

### 未完成/待复测

- 用户给定的 `V1.1_UPGRADE_PLAN.md` 不存在。
- 原生“打开文件夹”对话框未做完整 UIA 自动化（使用最近文件夹真实打开验证了文件树）；代码复用已工作的 Windows 文件夹选择器。
- 文件树子文件夹展开的 UIA 自动化没有成功（该行未暴露 InvokePattern）；人工鼠标点击路径正常，需真实人工复测。
- 拖入 DOCX/文件夹使用 Tauri 窗口拖放事件，尚未完成真实拖拽自动化。
- 文件被 Word 独占占用时的写入失败，尚未做真实 Word 占用测试；后端写入失败会保留恢复草稿并返回错误。
- 自动恢复草稿的跨重启恢复尚未做真实窗口演练；Rust 命令和前端定时保存已实现。
- 格式风险检测为启发式规则，不是完整 OOXML 兼容性分析。
- 外部修改检测使用 mtime + size，极少数改写不改变这两者的场景无法识别。
- 本阶段没有 NSIS、安装包、MSI 或自动更新。

## V1.0 历史记录

以下为 V1.0 最终发布阶段的记录，保留用于追溯。


## 一、交付物

| 交付物 | 路径 |
| --- | --- |
| 完整源代码 | 本仓库 |
| 简体中文 README | `README.md` |
| NSIS 安装包 | `release/PaperScape_1.0.0_x64-setup.exe` |
| 便携版 | `release/PaperScape-1.0.0-portable.zip` |
| 安装包大小 | 2,383,333 bytes（2.273 MiB） |
| SHA256 | `62776A5312EC135FBAA36D3DE944AC3422A63119E546C1A84E7C6A0F0F52B530` |
| 性能报告 | `PERFORMANCE.md` |
| 已知问题 | `KNOWN_ISSUES.md` |
| 开发记录 | 本文件 |
| Word 测试样本 | `docs/fixtures/` |
| 界面截图 | `docs/screenshots/` |

安装包**未签名（NotSigned）**，没有伪造签名。未生成 MSI：本机没有 WiX，NSIS 已优先完成。

## 二、最终版本新增工作

### 性能

- Word 导入/导出模块改为动态 `import()`：
  - 初始 JS：1,395 kB → **810.00 kB**。
  - 导入 chunk：339.50 kB；导出 chunk：246.17 kB。
  - 初始 gzip：430.65 kB → **250.48 kB**。
- `BackgroundLayer`、`SettingsPanel` 使用 `React.memo`，减少正文输入时无关设置/背景重绘。
- 背景图片现在先读取实际尺寸；最长边超过 2560 px 时缩放，避免超大图直接解码。
- Word 转换不再进入启动主包。
- JSZip 从运行时依赖移到 devDependency（测试使用）。
- 自动保存仍是变更触发的防抖，不做持续轮询。

### 打包

- `bundle.windows.webviewInstallMode` 设置为 `skip`，安装包不包含/不下载 WebView2，只依赖系统已有运行时。
- NSIS 改为简体中文单语言，无语言选择页。
- 通过中完整性计划任务完成 Tauri release + NSIS 打包；NSIS 工具正常下载并生成 setup。
- release 主程序：9,592,320 bytes，FileVersion 1.0.0。
- **生产构建修复**：最终阶段曾直接运行 `cargo build --release`，该命令没有启用 Tauri 的 `custom-protocol`，生成的二进制会连接 `localhost:1420`。已重新执行 `pnpm tauri build --bundles nsis`，重新生成受影响的安装包和便携版，并验证启动器可见。发行构建必须以 `pnpm tauri build` 为准。
- **关闭修复**：真实窗口中发现标题栏关闭按钮和原生 `WM_CLOSE` 均不退出。已在 Rust 窗口事件中显式调用 `app.exit(0)`，并在前端关闭前保存当前项目。重新构建后验证：关闭按钮退出、`WM_CLOSE` 退出。

### 文档

- `README.md` 重写为安装、使用、源码构建和限制说明。
- 新增 `PERFORMANCE.md`：真实启动、内存、CPU、体积、按需加载数据。
- 新增 `KNOWN_ISSUES.md`：安装、签名、内存、输入法、DOCX 和测试边界。

## 三、测试结果

### 前端

`pnpm test`：**6 个测试文件，39 个测试通过**。

- `src/docx/docx.test.ts`：6 个 DOCX 导入/导出/round-trip/安全测试。
- `src/App.test.tsx`：9 个。
- `src/editor/editor.test.ts`：13 个。
- `src/appearance/appearance.test.ts`：5 个。
- `src/lib/workspace.test.ts`：4 个。
- `src/App.window.test.tsx`：2 个。

其他：

- `pnpm check`：通过。
- `pnpm build`：通过，371 modules。
- `cargo fmt --check`：通过。
- `cargo test --offline --lib`：**12 个测试通过**。
- `cargo build --offline --release`：通过。

### 真实 Word 验证

使用 Microsoft Word 16.0.20527 只读打开 1.0.0 发布版导出的 `phase5-release-export.docx`：

- 打开成功。
- 段落 22、表格 1、InlineShape 1。
- A4：595.3 × 841.9 pt。
- 中文普通段落、中文单元格存在。
- 导出文件 13,033 bytes，ZIP 头 `50 4B 03 04`。

发布版动态加载后的真实 Tauri 导入/导出均已执行：

- 导入样本后编辑器文本长度 186，包含中文段落和表格。
- 导出当前章节成功，Word 实际打开通过。

### 安装/卸载

- 安装到自定义工作区目录成功，生成 `paperscape.exe` 和 `uninstall.exe`。
- `uninstall.exe /S` 成功删除安装目录。
- 以安装器生成的 `paperscape.exe`（1.0.0）在用户本地程序目录启动，显示“PaperScape 纸境”。
- 默认 `%LOCALAPPDATA%\PaperScape` 安装失败：测试环境的系统/安全/沙箱策略拒绝写入，安装器报“无法打开要写入的文件”。**未将该路径标记为通过。**
- 自定义目录静默安装未在“应用和功能”注册表/快捷方式中完整验证；见 `KNOWN_ISSUES.md`。

## 四、真实性能数据

| 指标 | 实测 | 目标 | 判定 |
| --- | ---: | ---: | --- |
| NSIS setup | 2,383,333 bytes / 2.273 MiB | ≤ 30 MB | 达到 |
| 初始 JS | 810.00 kB（gzip 250.47 kB） | 优化 | 已完成按需拆分 |
| 启动到启动器可交互 | 0.469 / 0.511 / 0.746 s | ≤ 2 s（冷启动） | 本次缓存已热场景达到；严格冷启动未验证 |
| 空闲内存（启动器） | 362.5 MB Working Set / 203 MB private | ≤ 150 MB | **未达到** |
| 空闲内存（项目） | 437.7 MB Working Set / 283 MB private | ≤ 150 MB | **未达到** |
| 空闲 CPU | 0.013%（启动器）/ 0.000%（项目） | 接近 0% | 达到 |
| Word 模块初始加载 | 不在主包，按需 339.50/246.17 kB | 按需 | 达到 |

完整方法、限制和结论见 `PERFORMANCE.md`。

## 五、功能检查记录

| 检查项 | 结果 |
| --- | --- |
| 菜单/按钮 | 真实窗口测试了新建项目、最近项目、文件菜单、Word 导入/导出、设置面板；前序菜单项由测试和既有验收覆盖 |
| 中文输入法 | 前序阶段有 composition 测试；本次未在 1.0.0 安装版上重新自动化微软拼音候选窗，明确记录为待人工复测 |
| 背景模式切换 | 前序阶段真实测试通过；本次未改动模式逻辑，只加了 memo |
| 章节保存与崩溃恢复 | Rust 原子保存/历史/恢复测试通过；本次未改动存储逻辑 |
| Word 导入导出 | 1.0.0 release 真实导入/导出，Word 打开通过 |
| 窗口调整/高 DPI | 前序阶段 150% 缩放截图和窗口测试通过；本次 release 在 150% 环境启动 |
| TypeScript/Rust | `pnpm check`、`cargo fmt --check`、39 前端 + 12 Rust 测试通过 |
| 运行时错误 | release 启动、项目创建、DOCX 导入/导出、Word 打开均完成；未观察到崩溃 |

## 六、已知限制摘要

- 安装包未签名，SmartScreen 会提示。
- 默认安装路径在测试环境被策略阻止；自定义目录安装通过。
- 空闲内存未达到 150 MB，主要来自 WebView2 多进程。
- 严格冷启动未验证；测得的是系统缓存已热场景。
- 输入法候选窗未在最终安装版上重新做真实自动化。
- 复杂 DOCX 格式、WebP/SVG 图片、部分表格特性支持有限。
- 未生成 MSI；未实现自动更新。
- 完整列表见 `KNOWN_ISSUES.md`。

## 七、Git

最终检查点：

```text
chore: prepare PaperScape 1.0.0 release
```

前序检查点：

```text
69ef786 feat: add DOCX import and export
24f1e8e feat: add reliable local project storage
5e4a2c7 feat: add dual writing modes and backgrounds
92972ca feat: add Tiptap rich text editing
d8c4c8f feat: verify PaperScape phase 1 real desktop window
1878082 feat: establish PaperScape phase 1 desktop shell
```
