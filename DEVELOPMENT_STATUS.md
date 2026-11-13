# PaperScape 开发状态

- 更新时间：2026-11-12
- 版本：1.0.0（正式版）
- 阶段：最终优化、发布构建与安装包
- 结论：**源代码、NSIS 安装包、测试记录、性能报告和已知问题已完成。默认安装路径的安装验证在当前测试环境被系统策略阻止，已如实记录，未伪称通过。**

## 一、交付物

| 交付物 | 路径 |
| --- | --- |
| 完整源代码 | 本仓库 |
| 简体中文 README | `README.md` |
| NSIS 安装包 | `release/PaperScape_1.0.0_x64-setup.exe` |
| 便携版 | `release/PaperScape-1.0.0-portable.zip` |
| 安装包大小 | 2,378,595 bytes（2.269 MiB） |
| SHA256 | `F1F36296849C5B981B2629122C1608707C228683DD92F99A4187B19C3555CB61` |
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
- release 主程序：9,582,592 bytes，FileVersion 1.0.0。
- **生产构建修复**：最终阶段曾直接运行 `cargo build --release`，该命令没有启用 Tauri 的 `custom-protocol`，生成的二进制会连接 `localhost:1420`。已重新执行 `pnpm tauri build --bundles nsis`，重新生成受影响的安装包和便携版，并验证启动器可见。发行构建必须以 `pnpm tauri build` 为准。

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
| NSIS setup | 2,378,595 bytes / 2.269 MiB | ≤ 30 MB | 达到 |
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
