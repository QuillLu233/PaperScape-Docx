# PaperScape 开发状态

- 更新时间：2026-11-12
- 阶段：第四阶段（本地项目管理与数据安全）
- 版本：0.4.0
- 结论：**第四阶段已完成。项目目录、独立章节 JSON、原子写入、历史备份、异常恢复、删除确认、章节按需加载与最近项目均已实现，并在真实 Tauri 窗口中验证。**

## 一、材料与规范检查

| 材料 | 结果 |
| --- | --- |
| `AGENTS.md` | 工作区中仍不存在；项目按 README/任务说明和现有代码推进 |
| `DEVELOPMENT_STATUS.md` | 已存在并读取，本文件更新为第四阶段状态 |
| `paperscape-dev` Skill | 当前会话仍不可用，`skill` 返回 unknown |

## 二、环境与基线

- Windows 10 Home China / 25H2 / Build 26200.9711 / x64；显示缩放 150%。
- Node.js 24.21.0、pnpm 11.28.5、Rust 1.100.0、MSVC 14.44、Windows SDK 10.0.26100 可用。
- 系统 PATH 未安装 Node/pnpm/Rust/Git；验证使用项目内用户级工具链。
- 当前 DSH 代理为低完整性令牌；真实 Tauri 验收通过中完整性计划任务启动。计划任务在测试命令结束后会被环境回收，应用本身正常。
- **没有新增通用文件系统插件权限**。文件操作全部走自定义 Tauri 命令，Rust 层校验项目根目录、章节 ID 和历史文件名。

## 三、第四阶段新增实现

### 项目格式

```text
我的长篇.paperscape/
  project.json
  project.json.bak
  chapters/<chapter-id>.json
  history/<chapter-id>/<timestamp>-<reason>.json
  history/project/<timestamp>.json
  recovery/<chapter-id>.json
  trash/<timestamp>-<chapter-id>.json
  assets/
```

- `project.json` 保存项目 ID、名称、创建/更新时间、`sessionClean`、当前章节、章节索引、外观和排版设置。
- 章节索引只保存标题、摘要、字数和更新时间；正文不在 `project.json`。
- 每章独立保存为 `chapters/<id>.json`，主字段 `doc` 是 Tiptap JSON。
- 项目 `.paperscape` 是本地目录；新建时拒绝非空目录，避免覆盖里面已有的 Word 或其他文件。

### 项目管理

- 启动页：新建项目、打开项目、最近项目列表、手动路径打开。
- 原生文件夹选择器：已验证“打开项目”能调起 Windows“浏览文件夹”对话框。
- 新建项目默认保存到 `Documents/PaperScape/<name>.paperscape`，也可输入其他父目录。
- 打开最近项目、关闭项目、再次打开最近项目均验证。
- 最近项目保存在应用配置目录，过滤已不存在的项目。
- 项目关闭时执行保存、标记 sessionClean、清理 recovery 草稿。
- 关闭窗口通过 `onCloseRequested` 拦截：先保存，再销毁窗口；保存失败不会关闭。

### 章节管理

- 左侧目录只渲染章节摘要，不加载所有章节正文。
- 新建章节、切换章节、按需加载当前章节。
- 重命名：左侧目录内联编辑、`F2` 弹窗、章节菜单；`F2` 已验证。
- 上移/下移：章节菜单和目录按钮；真实项目验证顺序从 `[1,2,3]` 变为 `[1,3,2]`。
- 删除：必须确认，章节文件移动到 `trash/`，不是立即永久删除。
- 删除当前章节后自动选择相邻章节；至少保留一个章节。
- 章节切换前保存当前章节；窗口关闭/项目关闭前保存当前章节和项目偏好。

### Tiptap JSON 与按需加载

- `ChapterFile.doc` 直接作为 Tiptap `content` 初始化。
- 编辑器 `onUpdate` 使用 `editor.getJSON()`，不再写 HTML。
- 章节字数/摘要仍缓存；目录和全文统计只累加索引，不读取所有正文。
- 恢复历史/异常草稿时通过 `documentRevision` 重新挂载编辑器，避免同一个 `chapter.id` 下 Tiptap 保留旧内容。
- 模式切换仍只改变包装样式，不重建编辑器实例。

### 数据安全

- **自动保存**：输入停止约 800ms 后保存当前章节；项目偏好 350ms 防抖保存。
- **切换/关闭保存**：章节切换、项目关闭、窗口关闭前强制 flush。
- **原子写入**：写同目录临时文件，`sync_all` 后再 rename；失败保留旧文件和临时文件。
- **历史备份**：覆盖前复制旧章节到 `history/<id>/`；自动保存备份限频，最多保留 40 个章节版本；项目元数据保留 30 个备份。
- **崩溃恢复**：保存时先写 `recovery/<id>.json`，再写章节；`sessionClean=false` 时打开项目会比较 recovery 与章节更新时间，发现更新的草稿则显示恢复条。
- **恢复前备份**：恢复历史或草稿时先把当前章节再写入历史，避免恢复动作覆盖当前内容。
- **元数据恢复**：`project.json` 损坏时优先使用 `project.json.bak`，再使用历史元数据；损坏原文件移动到 `trash/`。
- **章节损坏恢复**：章节 JSON 损坏时从最近可用历史版本读取，不静默覆盖原损坏文件。
- **删除保护**：章节移入 `trash/`；恢复草稿丢弃需要二次确认。
- **Word 安全**：不读写 `.docx`；新建项目要求空目录，不会覆盖原始 Word 文件。
- **路径限制**：章节 ID 只允许字母数字/`-`/`_`；历史文件名拒绝路径分隔、`..` 和隐藏文件名；项目根目录 canonicalize。

### 外观与正文独立

- 背景、纸张、阅读区、排版设置写入 `project.json`，正文写入独立章节文件。
- 真实测试中更换背景后，当前章节文件的 SHA256 保持不变，项目 `appearance.background.presetId` 改变。
- 背景图片仍使用本机 IndexedDB 和 object URL；图片不进入正文 JSON。

### 版本

- package / Cargo / Tauri / About / Settings 均升级为 `0.4.0`。
- 启动页、文件菜单、章节菜单、快捷键说明已更新为项目管理语义。

## 四、测试结果

### 4.1 Rust 存储层测试

执行：

```text
cargo test --offline --lib
```

结果：**12 个测试全部通过**。

覆盖：

- 创建/重新打开项目。
- 保存章节、历史文件、拒绝覆盖损坏文件。
- 原子替换已有 JSON。
- 元数据损坏后从 `project.json.bak`/历史恢复，损坏文件进 `trash`。
- recovery 草稿比章节新时被识别并恢复。
- 历史版本恢复，同时保存 `before-restore` 历史。
- 章节文件损坏时读取历史版本，且不覆盖损坏原文件。
- 正常关闭清理 recovery、sessionClean=true。
- 路径穿越和删除最后章节被拒绝。
- 偏好修改不触碰章节文件。
- 5 章 × 80,000 字 = **400,000 字**多章节项目保存/重新打开。

### 4.2 前端测试

执行 `pnpm test`：**5 个测试文件，33 个测试全部通过**。

测试文件：

- `src/App.test.tsx`：项目打开、三栏、章节新建、主题、双模式、专注、查找、关于；项目后端在测试中内存模拟。
- `src/App.window.test.tsx`：窗口控制与缩放热区。
- `src/editor/editor.test.ts`：富文本、查找替换、表格、图片、长文。
- `src/appearance/appearance.test.ts`：背景/纸张默认值、数值清洗、项目隔离、纸张对比。
- `src/lib/workspace.test.ts`：旧 localStorage 数据迁移与摘要。

### 4.3 真实 Tauri 窗口测试

真实项目：`C:\Users\20884\Documents\PaperScape\我的长篇.paperscape`。

| 验证 | 实际结果 |
| --- | --- |
| 新建项目 | 目录、`project.json`、`chapters/<id>.json`、`project.json.bak` 创建成功 |
| 章节 JSON | `doc` 为 `{type:"doc",content:[...]}`，正文文本在 JSON 中 |
| 输入保存 | 粘贴“第四阶段正文保存测试。”后自动保存；重新打开仍是该内容 |
| 关闭/重开 | `Ctrl+W` 关闭项目，最近项目出现；再次打开正文恢复 |
| 多章节 | 新建 3 章，分别写入“第二章正文。”“第三章正文。” |
| 切换章节 | 切换后编辑器只加载对应章节，正文正确 |
| 重命名 | F2 输入“河岸的清晨”/“风经过书桌”，项目索引和正文标题同步 |
| 排序 | 上移后项目索引顺序为 `第一章 → 第 3 章 → 第 2 章` |
| 删除 | 删除确认后章节进入 `trash/`；索引从 3 章变为 2 章 |
| 背景独立 | 更换背景前后章节文件 SHA256 相同；`appearance.background.presetId` 从 `ink-night` 更新为 `warm-paper`/`still-sage` |
| 异常恢复 | 手工构造较新的 recovery 草稿，打开后显示“检测到上次异常退出”，恢复后编辑器文本为草稿内容 |
| 窗口关闭 | Alt+F4 后 `sessionClean=true`，正文包含“窗口关闭前保存测试。” |
| 原生打开 | 点击“打开项目”弹出 Windows“浏览文件夹”，标题“打开 PaperScape 项目” |
| 最近项目 | 启动页显示项目名、章节数、字数、实际路径 |

真实窗口截图：

- `docs/screenshots/p4-launcher.png`
- `docs/screenshots/p4-project.png`
- `docs/screenshots/p3-paper.png`
- `docs/screenshots/p3-immersive.png`
- `docs/screenshots/p3-focus.png`

### 4.4 构建

| 命令 | 结果 |
| --- | --- |
| `pnpm check` | 通过 |
| `pnpm test` | 33/33 通过 |
| `pnpm build` | 通过；118 modules；JS 798.38 kB / CSS 45.22 kB |
| `cargo test --offline --lib` | 12/12 通过 |
| `cargo build --offline` | 通过；0.4.0 debug exe |
| `cargo fmt` | 通过 |

## 五、验收对照

| 要求 | 状态 | 说明 |
| --- | --- | --- |
| 新建/打开/保存/关闭项目 | ✅ | 真实 Tauri + 原生文件夹选择器 |
| 原生项目结构化 JSON | ✅ | `.paperscape` 目录 + JSON 文件 |
| Tiptap JSON 主存储 | ✅ | 章节文件 `doc`；编辑器 `getJSON()` |
| 每章独立保存 | ✅ | `chapters/<id>.json` |
| 章节新建/重命名/排序/删除 | ✅ | 目录、F2、菜单、确认删除 |
| 只加载当前章节 | ✅ | 索引摘要 + `loadChapter` |
| 恢复最近项目 | ✅ | 启动页最近项目 |
| 自动保存 | ✅ | 800ms |
| 切换/关闭前保存 | ✅ | 真实窗口验证 |
| 安全写入 | ✅ | 临时文件 + fsync + 原子 rename |
| 历史备份 | ✅ | 每章 40 个、项目元数 30 个 |
| 异常关闭恢复 | ✅ | recovery + sessionClean |
| 删除确认/不永久删除 | ✅ | 二次确认 + `trash/` |
| 不覆盖 Word | ✅ | 不读写 `.docx`；拒绝非空目录 |
| 最小文件权限 | ✅ | 自定义命令 + 路径校验；无通用 fs 权限 |
| 数十万字多章节 | ✅ | Rust 5×80,000=400,000 字 |
| 背景与正文独立 | ✅ | SHA256 验证 |
| 原子写入测试 | ✅ | Rust |
| 损坏/中断恢复测试 | ✅ | Rust + 真实 recovery UI |
| 历史恢复测试 | ✅ | Rust `before-restore` + 历史恢复 |

## 六、已知限制

- 项目没有任何“立即永久删除项目”的入口；这符合数据安全优先，但当前也没有项目级回收站界面。
- 项目名称在创建后没有重命名 UI；章节可重命名。
- 背景图片仍在应用 IndexedDB，而不是项目 `assets/`，因此仅复制项目文件夹不会复制背景图片；正文和项目 JSON 完整。
- 旧第三阶段 localStorage 草稿提供导入入口（保留原数据），但当前测试 profile 未检测到旧 key；未自动删除任何旧数据。
- 历史版本自动保留最近 40 个，超出后旧备份会被清理；不是无限版本库。
- 当前是连续滚动页面，不实现 Word 级分页。
- Vite 仍提示单个 JS chunk 约 800 kB；未做编辑器动态拆分。
- 没有实现 Word 导入/导出，也不会写入 `.docx`。

## 七、Git 检查点

第四阶段源码、测试、截图和本记录：

```text
feat: add reliable local project storage
```

前三阶段检查点：

```text
5e4a2c7 feat: add dual writing modes and backgrounds
92972ca feat: add Tiptap rich text editing
d8c4c8f feat: verify PaperScape phase 1 real desktop window
1878082 feat: establish PaperScape phase 1 desktop shell
```
