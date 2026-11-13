# PaperScape V1.0.0 备份清单

- 备份时间：2026-11-13
- 备份对象：升级到 V1.1 之前的完整 V1.0.0 基线
- 基线提交：`38d5d8ef048e85c5cf487f9d5f2ad6c33d6aac2e`
- 基线标签：`v1.0.0-baseline`
- 备份分支：`v1-baseline`
- 备份原因：补做升级前遗漏的备份步骤；不依赖当前 V1.1 工作区内容。

## 备份文件

| 文件 | 字节 | SHA256 |
| --- | ---: | --- |
| `backups/PaperScape-v1.0.0-source.zip` | 9,066,658 | `D6E2989E5D82FE45753C51690C6A9DF89680075788092AA0B5B9A6014B848631` |
| `backups/PaperScape-v1.0.0.bundle` | 17,057,092 | `242D2D5DB63FE0AB96E7CAA387E8C951FB8D65047C8C6C41BA80B030701AE062` |
| `release/PaperScape_1.0.0_x64-setup.exe` | 2,383,333 | `62776A5312EC135FBAA36D3DE944AC3422A63119E546C1A84E7C6A0F0F52B530` |
| `release/PaperScape-1.0.0-portable.zip` | 3,096,336 | `D7B327FF92E4F2A7C9D6B16E981A99534332D099D8BF433655073357DA865A71` |

## 内容

- `PaperScape-v1.0.0-source.zip`：从提交 `38d5d8e` 导出的完整受版本控制源码与资源，包含 `src/`、`src-tauri/`、`docs/`、`release/`、README、配置和测试样本；不包含 `.git`、`node_modules`、构建缓存。
- `PaperScape-v1.0.0.bundle`：完整 Git 历史 bundle，包含 `refs/tags/v1.0.0-baseline`；`git bundle verify` 已通过。
- V1.0 安装包和便携版仍在 `release/`，未覆盖、未删除。

## 恢复源码

```powershell
Expand-Archive backups\PaperScape-v1.0.0-source.zip -DestinationPath C:\PaperScape-v1-restore
```

解压后的 `package.json`、`src-tauri/tauri.conf.json` 均为 `1.0.0`，`release/PaperScape_1.0.0_x64-setup.exe` 的 SHA256 与当前 V1 安装包一致。

## 恢复完整 Git 历史

```powershell
git clone backups\PaperScape-v1.0.0.bundle PaperScape-v1-git
cd PaperScape-v1-git
git checkout v1.0.0-baseline
```

## 用户 V1 项目数据

本次扫描 `Documents` 和用户目录下的 `.paperscape` 文件夹，没有发现需要备份的 V1 用户项目；V1.1 也没有迁移、移动或删除任何用户 V1 项目。若你还有 V1 项目在其它磁盘/目录，请单独复制该 `.paperscape` 文件夹到备份位置，不要与源码备份混在一起。

## 验证记录

- 解压源码归档：`package.json` = `1.0.0`，Tauri 配置 = `1.0.0`。
- 归档内 V1 安装包 SHA256 与当前 V1 安装包一致。
- `git bundle verify`：包含完整历史，基线 tag 可读取。
- 未生成 NSIS，未改动 V1 文稿。
