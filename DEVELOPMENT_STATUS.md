# PaperScape 开发状态

- 更新时间：2026-11-12
- 阶段：第一阶段（Windows 桌面窗口 + 三栏中文写作界面）
- 版本：0.1.0
- 结论：**第一阶段开发完成，真实 Windows 桌面窗口已启动并通过窗口/布局/主题/折叠验收。**

## 一、启动前材料检查

| 材料 | 结果 |
| --- | --- |
| `AGENTS.md` | 工作区中不存在（初始目录为空） |
| `DEVELOPMENT_STATUS.md` | 不存在，本文件为首次创建 |
| `paperscape-dev` Skill | 当前会话不可用，`skill` 返回 unknown |

因此本阶段依据用户任务说明、Tauri 官方文档和实际环境检查推进。没有伪造上述文件或 Skill 的内容。

## 二、Windows 开发环境

检查日期：2026-11-12。系统：Windows 10 Home China / 版本 25H2 / Build 26200.9711 / x64，显示缩放 150%。

| 项目 | 初始状态 | 实际处理 | 最终状态 |
| --- | --- | --- | --- |
| Node.js | PATH 中不存在 | 使用 DSH 内置 Node.js 24.21.0 | 构建可用；系统 PATH 仍未安装 |
| npm | 不存在 | 未使用（项目使用 pnpm） | 仍缺失 |
| pnpm | 不存在 | DSH 内置 pnpm 11.28.5，通过 `.toolbin` 包装调用 | 构建可用；系统 PATH 仍未安装 |
| Rust / Cargo | 不存在 | rustup 用户级安装到 `.toolchain`，stable MSVC 1.100.0 + rustfmt | 可用；非系统级 |
| Visual Studio Build Tools | 不存在 | UAC 安装 17.14.37906.3 到 `.vs`，MSVC 14.44.35207，Windows SDK 10.0.26100 | 可用；非默认 Program Files 路径 |
| WebView2 Runtime | 已安装 157.0.4341.46 | 使用系统 Evergreen 稳定版 | 真实窗口运行成功 |
| Git | 不存在 | 便携版 MinGit 2.56.1 到 `.tools/git` | 已创建检查点 |

这些工具安装在项目目录下是因为当前会话没有管理员权限且系统 PATH 未配置 Node/Rust/Git；它们被 `.gitignore` 排除，不属于应用源码。普通开发机请按 `README.md` 的安装命令配置系统级环境。

## 三、已实现内容

- Tauri 2 无边框 Windows 窗口：`decorations: false`、`shadow: true`、最小尺寸 960×640。
- 启动时读取显示器物理尺寸与缩放比，自适应窗口尺寸并居中；限制在 960–1280 × 640–820 逻辑像素，兼容高 DPI 小屏。
- 自绘标题栏：品牌、中文菜单、面板开关、最小化/最大化/还原/关闭按钮、双击标题栏切换最大化。
- 八方向透明缩放热区，调用 Tauri `startResizeDragging`，覆盖四边和四角。
- 三栏布局：左侧章节目录、中间正文编辑区、右侧设置面板。
- 左右面板折叠，状态持久化；`Ctrl+B` / `Ctrl+Shift+B` 快捷键。
- 中文优先菜单（文件、编辑、视图、帮助）与快捷键、关于对话框。
- 浅色 / 深色 / 跟随系统主题，暖纸色低对比配色，主题跨重启持久化。
- 章节新建、切换、标题/正文编辑、字数统计、本地自动保存。
- 字号、行距设置与恢复默认。
- TypeScript 严格检查、Vitest + Testing Library 测试、Vite 生产构建。
- 应用图标、NSIS 打包配置、`.gitignore`、中文 README。

最终 `tauri.conf.json` 不包含 `--no-sandbox` 或其他降低 WebView2 安全性的启动参数。

## 四、实际测试结果

| 命令 | 结果 | 证据 |
| --- | --- | --- |
| `pnpm check` | 通过，退出码 0 | TypeScript 5.9.3，无错误 |
| `pnpm test` | 通过：2 个测试文件，9 个测试 | 约 2.6s |
| `pnpm build` | 通过 | 39 modules；JS 260.16 kB / CSS 19.75 kB |
| `cargo build` | 通过 | debug 可执行文件 `src-tauri/target/debug/paperscape.exe`，12.5 MB |
| `cargo fmt --check` | 通过 | Rust 格式一致 |
| Vite 开发服务器 | 通过 | `http://localhost:1420` 返回 HTTP 200 |
| 真实 Tauri 窗口 | 通过 | 进程响应正常，窗口标题 `PaperScape 纸境` |

### 4.1 真实桌面窗口验收

使用 Windows UI Automation 与 Win32 API 对真实运行中的窗口执行操作：

| 验收项 | 实测结果 |
| --- | --- |
| 窗口启动 | 进程运行，`MainWindowHandle` 有效，`Responding=True` |
| 三栏布局 | 左侧目录、中间编辑器、右侧设置同时完整显示 |
| 最大化 | 点击自绘“最大化”按钮后 `IsZoomed=True`，按钮变为“还原” |
| 还原 | 点击“还原”后 `IsZoomed=False` |
| 最小化 | 点击“最小化”后 `IsIconic=True`；恢复后 `False` |
| 关闭 | 点击自绘“关闭”后进程正常退出 |
| 标题栏拖动 | 窗口从 `(200,120)` 移动到 `(350,199)` |
| 右下角缩放 | 窗口从 `1600×1000` 调整到 `1720×1090` |
| 左侧面板 | 折叠后“新建章节”从可访问树消失；展开后恢复 |
| 右侧面板 | 折叠后“外观主题”从可访问树消失；展开后恢复 |
| `Ctrl+B` | 折叠/展开左侧目录均生效 |
| 深色主题 | 真实生效，重启应用后仍保持 |
| 中文菜单 | “帮助”菜单展开，打开并关闭“关于 PaperScape”对话框 |
| 150% DPI | 窗口客户区 1920×1230 物理像素，对应 1280×820 逻辑像素，三栏完整 |

真实窗口截图：

- `docs/screenshots/tauri-light.png`
- `docs/screenshots/tauri-dark.png`
- `docs/screenshots/tauri-collapsed.png`

### 4.2 测试覆盖

- 三栏初始渲染
- 添加/切换章节
- 正文编辑与本地持久化
- 浅色/深色切换
- 中文菜单与关于对话框
- 面板折叠与 `Ctrl+B`
- 窗口最小化/最大化/还原/关闭 API 调用
- 八方向缩放热区调用

## 五、验证环境的 WebView2 说明

本次验证发现并解决了一个**测试环境特有问题**，不是应用代码缺陷：

1. 当前 DSH 代理进程为 **低完整性（Low Integrity，SID 4096）**。直接从代理 shell 启动 Tauri 时，子进程继承低完整性，WebView2 无法初始化，Tauri 报 `0x8000FFFF`。
2. 用 `runas /trustlevel:0x20000` 或经 `cmd.exe` 的计划任务启动，实测仍得到低完整性令牌。
3. 改为**计划任务直接启动 ASCII 路径下的可执行文件**后，令牌为 **中完整性（Medium Integrity，SID 8192）**，WebView2 正常创建控制器，窗口成功显示。
4. 最终验收使用 debug 版 `paperscape.exe` + Vite 开发服务器，通过上述中完整性方式真实运行。
5. 正常 Windows 用户双击应用或在普通终端执行 `pnpm tauri:dev` 时，进程本身就是中完整性，不需要该测试夹具。

排查过程中曾验证系统 WebView2 与 Fixed Version、预览通道；最终稳定运行使用的是系统 WebView2 `157.0.4341.46`，未依赖降低安全性的沙箱参数。

## 六、验收对照

| 验收标准 | 状态 | 说明 |
| --- | --- | --- |
| Windows 上能启动软件 | ✅ 通过 | 真实 Tauri 窗口运行，进程响应正常 |
| 窗口可移动、缩放、最大化、最小化 | ✅ 通过 | 鼠标拖动/缩放、UI Automation 按钮操作均实测 |
| 三栏布局正常显示 | ✅ 通过 | 真实窗口 150% DPI 下完整显示 |
| 无阻塞性编译/运行错误 | ✅ 通过 | TypeScript、测试、Vite、Cargo 全部通过 |

## 七、未纳入本阶段

- Word 导入 / 导出
- 复杂背景、纸张纹理系统
- 云同步、账号、富文本
- 自动更新与代码签名

## 八、后续建议

1. 下一阶段先做文档模型与 Word 导入导出，保持当前窗口与布局不变。
2. 在 100% / 125% / 150% / 200% 缩放下各做一次视觉回归；当前启动尺寸已按显示器逻辑尺寸限制。
3. 打包安装包时补充代码签名，避免 Windows SmartScreen 提示。

## 九、Git 检查点

第一阶段源码、测试、文档与真实窗口截图已保存。检查点提交信息：

```text
feat: verify PaperScape phase 1 real desktop window
```

初始工程检查点：

```text
1878082 feat: establish PaperScape phase 1 desktop shell
```
