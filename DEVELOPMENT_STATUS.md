# PaperScape 开发状态

- 更新时间：2026-11-12
- 阶段：第一阶段（桌面窗口 + 三栏写作界面）
- 版本：0.1.0
- 结论：**代码与构建已完成，但当前机器的原生桌面验收被 WebView2 运行时崩溃阻塞**，不能宣称 Windows 窗口已实际启动。

## 一、启动前材料检查

| 材料 | 结果 |
| --- | --- |
| `AGENTS.md` | 工作区中不存在（初始目录为空） |
| `DEVELOPMENT_STATUS.md` | 不存在，本文件为首次创建 |
| `paperscape-dev` Skill | 当前会话不可用，`skill` 返回 unknown |

因此本阶段依据用户任务说明、Tauri 官方文档和实际环境检查推进。没有伪造上述文件或 Skill 的内容。

## 二、Windows 开发环境检查

检查日期：2026-11-12。系统：Windows 10 Home China / 版本 25H2 / Build 26200.9711 / x64。

| 项目 | 初始状态 | 实际处理 | 最终状态 |
| --- | --- | --- | --- |
| Node.js | PATH 中不存在 | 使用 DSH 内置 Node.js 24.21.0 | 项目可构建；系统 PATH 仍未安装 |
| npm | 不存在 | 未使用（项目使用 pnpm） | 仍缺失 |
| pnpm | 不存在 | DSH 内置 pnpm 11.28.5，通过 `.toolbin` 包装调用 | 构建可用；系统 PATH 仍未安装 |
| Rust / Cargo | 不存在 | rustup 用户级安装到 `.toolchain`，stable MSVC 1.100.0 | 可用；非系统级 |
| Visual Studio Build Tools | 不存在 | UAC 安装 17.14.37906.3 到 `.vs`，MSVC 14.44.35207，Windows SDK 10.0.26100 | 可用；非默认 Program Files 路径 |
| WebView2 Runtime | 已安装 157.0.4341.46 | 保留；另下载 Fixed Version 133 / 109 做对照 | 运行时存在但启动崩溃，见第五节 |
| Git | 不存在 | 下载便携版 MinGit 2.56.1 到 `.tools/git` | 可用于本次检查点 |

说明：这些工具安装在项目目录下是因为当前会话没有管理员权限且系统 PATH 未配置 Node/Rust/Git；它们被 `.gitignore` 排除，不属于应用源码。普通开发机请按 `README.md` 的安装命令配置系统级环境。

## 三、已实现内容

- Tauri 2 无边框 Windows 窗口：`decorations: false`、`shadow: true`、最小尺寸 960×640。
- 自绘标题栏：品牌、中文菜单、面板开关、最小化/最大化/还原/关闭按钮、双击标题栏切换最大化。
- 八方向透明缩放热区，调用 Tauri `startResizeDragging`，覆盖四边和四角。
- 三栏布局：左侧章节目录、中间正文编辑区、右侧设置面板。
- 左右面板折叠，状态持久化；`Ctrl+B` / `Ctrl+Shift+B` 快捷键。
- 中文优先菜单（文件、编辑、视图、帮助）与快捷键、关于对话框。
- 浅色 / 深色 / 跟随系统主题，暖纸色低对比配色。
- 章节新建、切换、标题/正文编辑、字数统计、本地自动保存。
- 字号、行距设置与恢复默认。
- TypeScript 严格检查、Vitest + Testing Library 测试、Vite 生产构建。
- 应用图标、NSIS 打包配置、`.gitignore`、中文 README。

## 四、实际执行结果

| 命令 | 结果 | 证据 |
| --- | --- | --- |
| `pnpm check` | 通过，退出码 0 | TypeScript 5.9.3，无错误 |
| `pnpm test` | 通过：2 个测试文件，9 个测试 | 约 2.6s |
| `pnpm build` | 通过 | 39 modules；JS 260.16 kB / CSS 19.75 kB |
| `cargo build` | 通过 | debug 可执行文件 `src-tauri/target/debug/paperscape.exe`，12.5 MB |
| Vite 开发服务器 | 通过 | `http://localhost:1420` 返回 HTTP 200 |
| 浅色三栏渲染 | 通过 | `docs/screenshots/paper-light.png` |
| 深色三栏渲染 | 通过 | `docs/screenshots/paper-dark.png` |
| 双面板折叠渲染 | 通过 | `docs/screenshots/paper-collapsed.png` |
| Tauri 窗口启动 | **失败（环境）** | WebView2 `0x8000FFFF`，见下节 |

测试覆盖包括：三栏初始渲染、添加/切换章节、正文编辑与本地持久化、浅深色切换、菜单与关于对话框、面板折叠与 `Ctrl+B`、窗口最小化/最大化/还原/关闭 API 调用、八方向缩放热区调用。

## 五、桌面启动阻塞详情

### 现象

运行 `src-tauri/target/debug/paperscape.exe` 时，Tauri 在创建窗口阶段失败：

```text
failed to create webview: WebView2 error:
WindowsError(Error { code: HRESULT(0x8000FFFF), message: "灾难性故障" })
```

应用进程随之以退出码 101 结束，窗口未出现。

### 排查过程

1. 先出现 `Io(os error 5)`，定位为 Tauri 需要在 `%LOCALAPPDATA%\com.paperscape.desktop` 创建 WebView2 数据目录；该目录在低完整性会话中无法创建。用中完整性进程创建目录后，错误变为 WebView2 `0x8000FFFF`。
2. 用官方 WebView2 SDK 1.0.4314.35 编写最小 C++ 探针，排除 Tauri/React 代码因素。探针能创建 WebView2 Environment，但 `CreateCoreWebView2Controller` 返回 `0x8000FFFF`。
3. 事件查看器显示 `msedgewebview2.exe` 每次都以 `0x80000003`（STATUS_BREAKPOINT）在 `msedge.dll` 中崩溃。
4. 分别测试系统 Evergreen 157.0.4341.46、Fixed Version 133.0.3065.92、Fixed Version 109.0.1518.78，三者均崩溃。
5. 测试低完整性与 `runas /trustlevel:0x20000` 中完整性、以及通过计划任务在 DSH 作业对象外运行，均失败。
6. 测试 `--no-sandbox`、`--disable-gpu`、关闭 GPU/音频沙箱等参数，未改变结果。

### 判断

这是当前 Windows 环境的 Chromium/WebView2 运行时缺陷，不是 PaperScape 的 TypeScript/React 或 Rust 编译错误。Build 26200 上存在同类 Chromium 崩溃报告（例如 Chromium issue 577213782、QwenPaw issue #6427）。需要更换到 WebView2 正常的 Windows 环境，或修复/升级系统 WebView2 后再做原生窗口验收。

参考：
- https://issues.chromium.org/issues/577213782
- https://github.com/agentscope-ai/QwenPaw/issues/6427

## 六、验收对照

| 验收标准 | 状态 | 说明 |
| --- | --- | --- |
| Windows 上能启动软件 | ❌ 当前机器未通过 | 编译成功；WebView2 运行时崩溃导致窗口无法创建 |
| 窗口可移动、缩放、最大化、最小化 | ⚠️ 仅代码与单元测试 | 已实现 Tauri API 调用与八方向热区；无法在本机做真实窗口级验证 |
| 三栏布局正常显示 | ✅ 通过 | Vite 实际渲染 + 截图 + 组件测试 |
| 无阻塞性编译/运行错误 | ⚠️ 编译无错误 | 前端/构建/测试通过；原生运行被系统 WebView2 阻塞 |

## 七、未纳入本阶段

- Word 导入 / 导出
- 复杂背景、纸张纹理系统
- 云同步、账号、富文本
- 自动更新与代码签名

## 八、后续建议

1. 在一台 WebView2 可正常工作的 Windows 10/11（非 Build 26200，或运行时已修复）上重新执行 `pnpm tauri:dev`，完成真实的移动/缩放/最大化/最小化验收。
2. 保持系统 WebView2 Evergreen 更新；若仍崩溃，尝试修复安装 WebView2 Runtime 或升级 Windows Build。
3. 本机已完成代码检查点；迁移环境不需要改业务代码。

## 九、Git 检查点

第一阶段源码、测试、文档与截图会作为独立提交保存，提交信息：

```text
feat: establish PaperScape phase 1 desktop shell
```
