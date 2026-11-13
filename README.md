# PaperScape 纸境

PaperScape 是一个面向 Windows 的安静写作空间。V1.1 第一阶段把使用方式扩展为 **Word + VS Code 混合文件管理**：可以直接打开真实文件夹和 DOCX，也可以在旧版 `.paperscape` 项目中按章节写作。

> 当前开发版本：**1.1.0（V1.1 第一阶段：文件管理及保存系统升级）**
>
> 本阶段**没有生成新的 NSIS 安装包**。仓库中保留的 V1.0 安装包仍可安装旧版本；V1.1 请从源码构建 release 程序。

## V1.1 新增功能

### 文件管理

- 直接打开单个 `.docx`，不需要先创建专有项目。
- 通过 Windows 原生对话框打开已有文件夹。
- 左侧显示真实文件夹和文件树，支持子文件夹展开、刷新和文件切换。
- 支持把 DOCX 文件或文件夹拖入窗口。
- 不把用户文件夹转换成 `.paperscape` 项目，不迁移、不删除原文件。
- 保留 V1 `.paperscape` 项目的打开和编辑能力。
- 最近打开的文件、文件夹和 V1 项目。
- 在文档栏显示当前文件的真实路径。
- “在资源管理器中显示”。
- 后端对文件树路径做授权和规范化校验，拒绝未授权路径和路径穿越。

### 保存逻辑

| 快捷键 | 行为 |
| --- | --- |
| `Ctrl+N` | 新建文档 |
| `Ctrl+O` | 打开 Word 文档 |
| `Ctrl+Shift+O` | 打开文件夹 |
| `Ctrl+S` | 保存当前文档 / V1 项目 |
| `Ctrl+Shift+S` | 另存为 DOCX |
| `Ctrl+W` | 关闭当前文档 / 项目 |

- 新建文档首次保存时选择目录、文件名和 DOCX 格式。
- 已保存文档后续直接保存到对应路径。
- 自动恢复草稿继续保留；自动恢复失败会在文档栏显示错误，不静默丢失。
- 不弹常规“未保存是否退出”对话框；关闭时保存或留下可恢复草稿。

### 直接编辑 DOCX

- Mammoth 读取 DOCX，Tiptap 编辑，`docx` 库重新生成有效 OOXML。
- 支持范围内的标题、段落、粗体/斜体/下划线/删除线、列表、常规表格和图片。
- **第一次覆盖原 DOCX 前自动建立原件备份**，备份路径显示在文档栏。
- 覆盖前检查文件是否被外部程序修改；发现改动时阻止无提示覆盖。
- 对页眉页脚、批注、修订、公式、文本框、宏、嵌入对象、浮动图片、多分节等内容进行预检。
- 有格式风险时提供：只读查看、保存副本、明确授权覆盖。
- 安全文档可直接保存；自动写回原 DOCX 不默认启用，必须由用户手动保存。
- 使用临时文件 + 原子替换；保存失败时保留编辑内容与恢复草稿。

## 安装与构建

### 旧版安装包

V1.0 的 NSIS 安装包仍在：

[release/PaperScape_1.0.0_x64-setup.exe](release/PaperScape_1.0.0_x64-setup.exe)

它用于 V1.0，不包含 V1.1 文件管理功能。安装包未签名。

### 从源码构建 V1.1

要求：Windows 10/11 x64、Node.js 20+、pnpm 10+、Rust stable、MSVC x64、Windows SDK、WebView2 Runtime。

```powershell
pnpm install
pnpm check
pnpm test
pnpm build
pnpm tauri build --no-bundle
```

生成的主程序：

```text
src-tauri/target/release/paperscape.exe
```

本阶段按要求**不生成 NSIS 安装包**。

> 发行构建必须使用 `pnpm tauri build`。直接 `cargo build --release` 不会启用 Tauri `custom-protocol`，会得到连接 `localhost:1420` 的开发式程序。

## 基本使用

### 打开文件夹

启动页点击“打开文件夹”，选择任意 Windows 文件夹。左侧显示真实文件树：

- 文件夹可以逐级展开。
- `.docx` 可直接点击打开。
- 非 DOCX 文件会显示但不可编辑。
- 文件夹内如有 V1 `.paperscape` 项目，可直接点击打开。

### 编辑 DOCX

1. 打开 `.docx` 或从文件树选择文件。
2. 在编辑器中修改内容。
3. `Ctrl+S` 保存回原文件；首次覆盖会自动备份原件。
4. 需要保留原文件时使用 `Ctrl+Shift+S` 另存为。

### 新建文档

启动页点击“新建文档”，或按 `Ctrl+N`。首次 `Ctrl+S` 会询问保存位置和文件名。默认文稿目录建议为：

```text
Documents\PaperScape
```

可以在启动页或 V1 项目设置面板中更改默认文稿目录。

### V1 项目

- 启动页“打开项目”或菜单“打开 V1 项目…”继续打开 `.paperscape` 文件夹。
- V1 项目仍按章节保存 Tiptap JSON，历史、恢复和回收目录继续有效。
- V1.1 不会自动迁移旧项目，也不会修改原 DOCX 以外的方式移动用户文稿。

## 数据与安全

- 用户文件保留在原目录；只写入用户明确打开的 DOCX。
- 原生文件对话框和最近项目是路径授权入口；文件树命令只允许访问已授权目录。
- 路径会 canonicalize，拒绝路径穿越；符号链接/Windows reparse point 不进入文件树。
- DOCX 导入经 Mammoth + DOMPurify 清洗，不执行宏或脚本。
- 覆盖前备份在应用数据目录 `docx-backups`；恢复草稿在 `docx-recovery`。
- 最近文件/文件夹记录在应用配置目录，不影响用户文稿目录。

## 测试

```powershell
pnpm check
pnpm test
pnpm build
cd src-tauri
cargo fmt --check
cargo test --offline --lib
```

V1.1 第一阶段测试结果见 [DEVELOPMENT_STATUS.md](DEVELOPMENT_STATUS.md)。真实窗口验收覆盖：

- 从真实文件夹树打开 DOCX。
- 编辑并直接保存回 DOCX。
- 保存前原件备份。
- Microsoft Word 打开保存后的文件。
- 外部修改检测。
- 新建文档首次另存为。
- 最近文件夹与 V1 项目重新打开。
- 文件树路径安全。

## 已知问题

完整列表见 [KNOWN_ISSUES.md](KNOWN_ISSUES.md)。V1.1 当前重点：

- `V1.1_UPGRADE_PLAN.md` 在工作区中不存在，本次按任务消息实现。
- 拖入 DOCX/文件夹的自动化验收尚未完成，代码使用 Tauri 窗口拖放事件。
- 文件树中的文件夹行在不同 UI Automation 环境下可能不以 InvokePattern 暴露；人工鼠标点击路径正常。
- 格式风险预检是启发式检查，不覆盖所有 Word 扩展。
- 外部修改检测使用修改时间 + 文件大小，极少数同尺寸同时间的外部改动可能漏检。
- 自动写回原 DOCX 未默认启用；当前只做手动保存。
- 本阶段没有新 NSIS、没有自动更新。

## V1 备份

V1.0 基线已固定：

```text
git tag v1.0.0-baseline
git branch v1-baseline
commit 38d5d8e
```

另外已补做完整备份（从基线提交导出，不依赖 V1.1 工作区）：

- [源码 ZIP](backups/PaperScape-v1.0.0-source.zip)
- [完整 Git 历史 bundle](backups/PaperScape-v1.0.0.bundle)
- [备份清单与恢复说明](backups/V1_BACKUP_MANIFEST.md)
- [校验和](backups/SHA256SUMS.txt)

V1 原项目格式保留读取，不做自动迁移。
