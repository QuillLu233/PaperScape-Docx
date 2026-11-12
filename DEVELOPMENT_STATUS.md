# PaperScape 开发状态

- 更新时间：2026-11-12
- 阶段：第二阶段（Tiptap 富文本编辑器）
- 版本：0.2.0
- 结论：**第二阶段已完成。Tiptap 富文本编辑、格式、查找替换、图片表格、字数、宽度调整与长文输入均已实现并测试；第一阶段窗口和三栏功能保留。**

## 一、材料与规范检查

| 材料 | 结果 |
| --- | --- |
| `AGENTS.md` | 工作区中仍不存在；项目按 README/任务说明和实际代码推进 |
| `DEVELOPMENT_STATUS.md` | 已存在并读取，本文件已更新为第二阶段状态 |
| `paperscape-dev` Skill | 当前会话仍不可用，`skill` 返回 unknown |

## 二、环境与基线

- Windows 10 Home China / 25H2 / Build 26200.9711 / x64；显示缩放 150%。
- Node.js 24.21.0、pnpm 11.28.5、Rust 1.100.0、MSVC 14.44、Windows SDK 10.0.26100 可用。
- 系统 PATH 仍未安装 Node/pnpm/Rust/Git；验证使用项目内用户级工具链，详见第一阶段记录。
- 当前 DSH 代理进程为低完整性令牌；真实 Tauri 验收继续通过计划任务直接启动中完整性进程完成。这是测试夹具限制，不是应用要求。

## 三、第二阶段新增实现

### 编辑器

- Tiptap 3 / ProseMirror 正式编辑器，不使用临时 `contenteditable` 实现。
- StarterKit 关闭代码块与分割线；启用标题 H1–H3、段落、列表、加粗、斜体、下划线、删除线、撤销/重做。
- TextStyleKit：字体、字号、文字颜色、行高基础能力。
- TextAlign：左/中/右/两端对齐。
- 自定义 BlockStyle：段落/标题行距、首行缩进。
- Image：本地图片读取、Data URL 嵌入、超过 900KB 时自动缩放至最大 1600px。
- TableKit：3×3 表格、可拖拽列宽、加行、加列、删除表格。
- 查找替换：自定义 ProseMirror 插件、装饰高亮、上一个/下一个、单项替换、全部替换；支持跨加粗/斜体等行内 mark 的短语。
- 中文标点与中英文混排换行：`line-break: strict`、`overflow-wrap: break-word`、`text-wrap: pretty`。

### 数据与状态

- 工作区升级为 `version: 2`，章节正文存 Tiptap HTML；旧的纯文本 workspace 自动迁移为段落，换行保留。
- 章节新增 `characterCount` 与 `excerpt` 缓存；侧栏/状态栏渲染不再反复解析 HTML。
- `key={chapter.id}` 隔离章节编辑器实例；正文更新不回灌 React state 到编辑器，避免光标丢失。
- 主题、面板、字号、行距、编辑宽度状态与编辑器实例隔离；主题切换不会重建编辑器。
- localStorage 保存改为 400 ms 防抖，并在 `beforeunload` 与工作区切换时 flush。
- 编辑宽度设置 640–980px 持久化，作用于文章排版宽度。
- 字数统计：状态栏同时显示本章与全文；全文为所有章节缓存计数之和。
- 快捷键：`Ctrl+B/I/U` 格式、`Ctrl+Z/Shift+Z` 历史、`Ctrl+F` 查找、`Ctrl+S` 保存、`Ctrl+N` 新建章节；编辑器外 `Ctrl+B` 仍可折叠目录，避免与加粗冲突。

### 版本

- package / Cargo / Tauri / About / Settings 均已升级为 `0.2.0`。
- About 增加 Tiptap 3 信息，阶段文案更新为第二阶段。

## 四、自动化测试

### 4.1 Vitest

执行 `pnpm test`：**4 个测试文件，26 个测试全部通过**。

测试文件：

- `src/App.test.tsx`：三栏、章节、主题、面板、快捷键、查找入口、关于。
- `src/App.window.test.tsx`：窗口控制 API 与八方向热区。
- `src/editor/editor.test.ts`：中国/英文混排、标题、格式、字体字号颜色、对齐/行距/缩进、列表、撤销重做、查找替换（含跨 mark）、表格、图片、2000 段长文。
- `src/lib/workspace.test.ts`：纯文本 → HTML 迁移、v2 往返、计数和摘要。

其他检查：

| 命令 | 结果 |
| --- | --- |
| `pnpm check` | 通过 |
| `pnpm build` | 通过；105 modules；JS 745.78 kB / CSS 26.86 kB |
| `cargo build` | 通过；0.2.0 debug exe |
| `cargo fmt --check` | 通过 |

### 4.2 Chromium/WebView2 引擎端到端

通过 Edge + CDP 对真实 Vite 页面执行输入与操作，结果：

| 验证 | 实际结果 |
| --- | --- |
| 中英混输 | `中文输入 English mixed 123，标点正常。` |
| 加粗 / 撤销 / 重做 | `<strong>` 正确添加、撤销移除、重做恢复 |
| 标题 | `h1` 正确生成 |
| 查找 | `1 / 1` |
| 全部替换 | `中文` → `汉语` 成功 |
| 表格 | 3×3 表格、表头与工具栏表格操作出现 |
| 字体/字号/颜色 | 输出 `font-family`、`font-size: 24px`、`color: rgb(154, 79, 67)` |
| 对齐/行距/缩进 | `text-align: center; line-height: 2.1; text-indent: 2em` |
| 编辑宽度 | 设置 900px 后文章 `max-width: 900px` |
| 图片 | 生成本地 Data URL `<img>` |
| IME composition | `Input.imeSetComposition` 后提交得到 `你好` |
| 连续输入 | 按字符逐字输入 22 个字符，内容完全一致 `typedExactly: true` |
| 主题隔离 | 切换深色后继续输入，前后文本均保留 |
| 章节切换 | 切到第二章再回来，内容保持 |
| 长文 | 75,000 字符输入约 870ms；本章 69,000 字 / 全文 69,082 字 |

说明：IME 测试使用 Chromium 的 `Input.imeSetComposition` 组合事件，覆盖 ProseMirror 的 composition 处理路径；没有拦截或改写输入法事件。

### 4.3 真实 Tauri 窗口

| 验证 | 实际结果 |
| --- | --- |
| 启动 | 0.2.0 debug 窗口正常显示，工具栏完整 |
| 系统剪贴板粘贴 | 137 字符正文粘贴后变为 160 字符 |
| 系统剪贴板复制 | `Get-Clipboard` 得到 162 字符完整正文 |
| 撤销 | 粘贴后 Ctrl+Z 恢复到 137 字符 |
| 真实 Ctrl+B | 工具栏“加粗”Toggle 状态变为 On，侧栏保持打开（未误触面板快捷键） |
| 真实 Ctrl+F | 查找输入框出现，关闭按钮可用 |
| 150% DPI | 真实窗口 1920×1230 物理像素，三栏完整 |
| 主题 | 浅色/深色均实际截图 |

真实窗口截图：

- `docs/screenshots/p2-light.png`
- `docs/screenshots/p2-dark.png`
- `docs/screenshots/phase2-table.png`（表格功能截图）

## 五、验收对照

| 要求 | 状态 | 说明 |
| --- | --- | --- |
| 中文、英文及混合输入 | ✅ | 连续输入与 IME composition 测试通过 |
| H1/H2/H3 与段落 | ✅ | 单元和端到端均覆盖 |
| 加粗/斜体/下划线/删除线 | ✅ | 单元与浏览器操作覆盖 |
| 字体/字号/颜色 | ✅ | 单元测试 + 工具栏端到端 |
| 对齐/行距/首行缩进 | ✅ | 输出样式验证 |
| 有序/无序列表 | ✅ | 单元测试 |
| 撤销/重做/快捷键 | ✅ | 工具栏、菜单、真实 Ctrl+B/Ctrl+Z |
| 本章/全文字数 | ✅ | 真实状态栏与长文数据 |
| 查找替换 | ✅ | 1/1 匹配、全部替换、跨 mark 匹配 |
| 图片和表格 | ✅ | 图片 Data URL；3×3 表格与行列操作 |
| 编辑宽度 | ✅ | 640–980px 设置与样式验证 |
| 中文标点和中英换行 | ✅ | CSS 行断规则 + 长文混排截图 |
| 微软拼音兼容 | ✅ | 不拦截 composition；Chromium composition 事件通过 |
| React 重渲染不丢输入 | ✅ | 逐字连续输入、主题切换、章节切换均保持 |
| 编辑器/主题状态隔离 | ✅ | 主题切换不重建编辑器 |
| 长文性能 | ✅ | 69,000 字可编辑；75,000 字符输入约 870ms |

## 六、已知限制

- 图片以 Data URL 存在 localStorage，图片数量和总大小受 WebView2 本地存储配额限制；本阶段不引入文件资源系统。
- 表格为简单表格，不支持合并单元格、跨页表头等复杂排版。
- 查找按段落/标题文本块匹配，不跨段落或表格单元格搜索。
- Word 导入导出、复杂背景、云同步、账号系统仍未实现。
- 自动化环境未模拟微软拼音候选词窗口的实际点击；通过 Chromium IME composition 事件验证了编辑器组合输入路径，代码未拦截或改写输入法事件。
- 系统级 Node/Rust/Git 尚未安装，普通开发前仍应按 README 配置环境。

## 七、Git 检查点

第二阶段源码、测试、真实窗口截图和本记录将作为独立提交保存：

```text
feat: add Tiptap rich text editing
```

第一阶段检查点：

```text
1878082 feat: establish PaperScape phase 1 desktop shell
d8c4c8f feat: verify PaperScape phase 1 real desktop window
```
