# PaperScape 开发状态

- 更新时间：2026-11-12
- 阶段：第五阶段（Microsoft Word DOCX 导入与导出）
- 版本：0.5.0
- 结论：**第五阶段已完成。DOCX 导入、HTML 清洗、Tiptap JSON 中转、当前/全部章节导出、A4/Letter、标准/小说预设、图片与表格导出均已实现；导出文件已由本机 Microsoft Word 实际打开验证。**

## 一、材料与规范检查

| 材料 | 结果 |
| --- | --- |
| `AGENTS.md` | 工作区中仍不存在；项目按 README/任务说明和现有代码推进 |
| `DEVELOPMENT_STATUS.md` | 已存在并读取，本文件更新为第五阶段状态 |
| `paperscape-dev` Skill | 当前会话仍不可用，`skill` 返回 unknown |

## 二、环境与基线

- Windows 10 Home China / 25H2 / Build 26200.9711 / x64；显示缩放 150%。
- Node.js 24.21.0、pnpm 11.28.5、Rust 1.100.0、MSVC 14.44、Windows SDK 10.0.26100 可用。
- **Microsoft Word 16.0（Build 16.0.20527）已安装**，用于真实 DOCX 兼容性验证。
- 系统 PATH 未安装 Node/pnpm/Rust/Git；验证使用项目内用户级工具链。
- 真实 Tauri 验收通过中完整性计划任务启动。该测试环境的计划任务会在测试命令结束后被回收，应用本身正常。

## 三、第五阶段新增实现

### DOCX 导入

- 通过 Windows 原生文件对话框选择 `.docx`；后端只读用户选择的文件。
- 导入使用 **Mammoth.js**：
  - 默认语义样式映射 + 自定义 `Title`/Heading 映射。
  - 图片通过 Mammoth image converter 读取为 base64 data URI。
  - Mammoth 警告会进入导入提示。
- 解析后的 HTML 先经 **DOMPurify** 清洗，再由 Tiptap 扩展生成 JSON：
  - 禁止 script、style、iframe、object、embed、form、SVG/Math 等标签。
  - 禁止事件处理属性。
  - 移除外部图片，只允许白名单 base64 图片格式。
  - 只保留安全链接协议。
  - 内联 style 只保留有限的文本/段落属性，拒绝 `url()`、`expression`、`javascript:` 等。
- 不支持项明确提示：页眉页脚、批注、修订记录、公式、文本框、宏、嵌入对象、Word 页面背景等。
- 导入不会修改原 DOCX；始终创建新章节，不覆盖当前正文。
- 导入预览显示字数、图片数、表格数和兼容性提示。

### DOCX 导出

- 使用 `docx` 9.x 生成真正的 **Office Open XML**：
  - ZIP 包包含 `[Content_Types].xml`、`word/document.xml` 和 `word/media/*`。
  - 不是修改扩展名的 HTML。
- 支持导出当前章节和合并全部章节。
- 标准文档预设：A4、1 英寸页边距、1.15 行距。
- 小说稿件预设：A4、较宽页边距、1.5 行距、首行缩进。
- 页面规格：A4 / US Letter。
- 基本字体、字号、标题 H1–H3、列表、加粗/斜体/下划线/删除线、文字样式、对齐、行距、首行缩进。
- 表格导出为 Word Table；PNG/JPEG/GIF/BMP 图片导出为 InlineShape；不支持的图片类型会跳过并提示。
- 全部章节按顺序导出，章节之间分页。
- 软件背景、纸张颜色、暗角、遮罩和界面主题不写入 Word。
- 导出使用 Windows 原生保存对话框，Rust 原子写入目标文件。

### 测试样本

- `docs/fixtures/phase5-sample.docx`：包含中文/英文、标题、粗体/斜体、对齐段落、无序/有序列表、3 列 2 行表格和内嵌 PNG 图片。
- `docs/fixtures/phase5-export.docx`：当前章节真实导出样本。
- `docs/fixtures/phase5-all.docx`：合并全部章节真实导出样本。
- `docs/fixtures/phase5-sample-image.png`：样本图片源。
- `scripts/make-docx-fixture.py`：可重复生成样本。

### 版本

- package / Cargo / Tauri / About / Settings 均升级为 `0.5.0`。
- 菜单新增“导入 Word 文档…”“导出 Word 文档…”。

## 四、测试结果

### 4.1 前端测试

`pnpm test`：**6 个测试文件，39 个测试全部通过**。

- `src/docx/docx.test.ts`：6 个 DOCX 测试。
- `src/App.test.tsx`：项目 UI、双模式、专注、快捷键。
- `src/editor/editor.test.ts`：Tiptap 富文本、表格、图片、长文。
- `src/appearance/appearance.test.ts`：背景/纸张设置。
- `src/lib/workspace.test.ts`：旧数据迁移。
- `src/App.window.test.tsx`：窗口控制。

DOCX 测试覆盖：

- 真实 `phase5-sample.docx` 导入：标题、粗体、斜体、列表、表格、图片。
- HTML 清洗：`script`、`onclick`、外部图片、`javascript:` 链接、`style` 外部 URL。
- 导出 ZIP/OOXML 结构。
- A4 页面尺寸 `11906 × 16838` twips。
- US Letter 页面尺寸 `12240 × 15840` twips。
- 当前章节导出并再次导入的 round-trip。
- 合并全部章节、分页、标题、正文、表格、图片。
- 导出 XML 不包含软件背景。
- 原 DOCX 文件 SHA256 在导入前后未变化。
- 把 HTML 改名为 `.docx` 会被拒绝。

### 4.2 Rust 测试

`cargo test --offline --lib`：**12 个测试全部通过**。

保留第四阶段的数据安全测试：

- 原子替换已有 JSON。
- 项目创建/重开。
- 40 万字数多章节项目。
- 历史备份/恢复。
- 项目元数据和章节损坏恢复。
- recovery 草稿恢复。
- 正常关闭清理 recovery。
- 章节删除进 `trash`。
- 路径穿越拒绝。

### 4.3 真实 Tauri 导入测试

通过 Windows 原生打开对话框选择 `docs/fixtures/phase5-sample.docx`：

- 导入提示：153 字、1 张图片、1 个表格。
- 生成新章节 `phase5-sample`。
- 编辑器实际显示：
  - `PaperScape DOCX Roundtrip`
  - `第一章 中文标题`
  - `English Heading H2`
  - 中文普通段落、粗体内容、斜体内容、English mixed text
  - 无序/有序列表
  - 表格单元格
  - 图片
- 项目章节数从 1 变为 2（在原有测试项目上）。
- 原 DOCX 未被修改（自动化测试哈希相同）。

### 4.4 真实 Tauri 导出测试

| 导出 | 文件 | 结果 |
| --- | --- | --- |
| 当前章节 | `phase5-export.docx` | 13,031 字节，ZIP 头 `50 4B 03 04` |
| 合并全部 | `phase5-all.docx` | 13,064 字节，ZIP 头 `50 4B 03 04` |

**Microsoft Word 16.0.20527 只读打开验证：**

当前章节导出：

- 打开成功。
- 段落 22、表格 1、InlineShape 1。
- A4 页面 595.3 × 841.9 pt。
- 中文、英文、标题、表格内容均存在。

合并全部章节：

- 打开成功。
- 段落 24、表格 1、InlineShape 1。
- 第一、第二章节内容均存在。
- A4 页面 595.3 × 841.9 pt。

**真实往返：**

- 将 `phase5-export.docx` 再次通过原生打开对话框导入。
- 新章节 `phase5-export` 创建成功。
- 编辑器文本包含中文普通段落和中文单元格。
- 项目章节数变为 3；文本长度 200（含标题/列表/表格）。

### 4.5 构建

| 命令 | 结果 |
| --- | --- |
| `pnpm check` | 通过 |
| `pnpm test` | 39/39 通过 |
| `pnpm build` | 通过；370 modules；JS 1,395.02 kB / CSS 47.85 kB |
| `cargo test --offline --lib` | 12/12 通过 |
| `cargo build --offline` | 通过；0.5.0 debug exe |
| `cargo fmt --check` | 通过 |

## 五、验收对照

| 要求 | 状态 | 说明 |
| --- | --- | --- |
| Windows 原生对话框选择 DOCX | ✅ | GetOpenFileNameW 实际调起 |
| Mammoth.js 解析 | ✅ | 真实样本 |
| 转换 Tiptap 格式 | ✅ | 生成 JSON 并显示 |
| 段落/标题/粗体/斜体/列表 | ✅ | 导入与 Word 验证 |
| 常规表格/图片/段落样式 | ✅/部分 | 表格、图片；复杂段落样式有提示 |
| HTML 安全清洗 | ✅ | DOMPurify + 白名单 |
| 不执行脚本/宏/外部程序 | ✅ | 不运行 Word，不执行宏 |
| 不修改原文件 | ✅ | 只读；哈希测试 |
| 复杂格式明确提示 | ✅ | 导入兼容性面板 |
| docx 库生成 OOXML | ✅ | ZIP/OOXML |
| 当前章节导出 | ✅ | 真实文件 |
| 全部章节合并 | ✅ | 真实文件 + Word |
| 标准/小说预设 | ✅ | A4、边距、行距、缩进 |
| 字体/字号/标题/列表/段落 | ✅ | docx 属性 |
| A4 / US Letter | ✅ | 单测 XML + Word A4 |
| 图片/表格导出 | ✅ | Word InlineShape/Table |
| 背景不写入 Word | ✅ | XML 无 `w:background` |
| Word 可打开 | ✅ | Word 16.0.20527 实际打开 |
| 往返测试 | ✅ | 单测 + 真实导出再导入 |
| 中文/英文/标题/格式/图片/表格样本 | ✅ | `phase5-sample.docx` |
| 不把 HTML 冒充 DOCX | ✅ | ZIP/OOXML + 拒绝测试 |

## 六、已知限制

- Mammoth 不保留页眉页脚、批注、修订、公式、文本框、分节、页眉图片、艺术字、SmartArt、嵌入对象、宏等；导入时会显示通用兼容性提示。
- 导入对复杂字体、字号、颜色、精确段落对齐的保留有限；Mammoth 主要保留语义结构。
- 图片导出使用固定显示尺寸（最大 520px），不是原始像素尺寸；WebP/SVG 等不受 docx 图片类型支持的图片会跳过并提示。
- 表格合并单元格、跨页表头、复杂边框样式暂不完整支持。
- 导入始终创建新章节，不提供“替换当前章节”。
- 只支持 `.docx`，不支持旧 `.doc`；HTML 改扩展名会被后端/解析器拒绝。
- 没有导入页眉页脚、批注、修订等 UI 选择。
- 前端 bundle 因 Mammoth/docx 增至约 1.4 MB（gzip 430.65 kB）；未做按需动态加载。
- Word 兼容性验证是只读打开和结构检查，不等于所有复杂版式在 Word 中的逐像素一致。

## 七、Git 检查点

第五阶段源码、样本、真实截图、Word 验证结果和本记录：

```text
feat: add DOCX import and export
```

前四阶段检查点：

```text
24f1e8e feat: add reliable local project storage
5e4a2c7 feat: add dual writing modes and backgrounds
92972ca feat: add Tiptap rich text editing
d8c4c8f feat: verify PaperScape phase 1 real desktop window
1878082 feat: establish PaperScape phase 1 desktop shell
```
