# PaperScape Plan A 兼容模式测试副本

这是隔离测试副本，不是当前稳定版本，也不会写入稳定版配置。

## 隔离方式

- 源码分支：`test/plan-a-legacy-media`
- Tauri identifier：`com.paperscape.desktop.planatest`
- 配置目录：`%APPDATA%\com.paperscape.desktop.planatest`
- 缓存目录：`%LOCALAPPDATA%\com.paperscape.desktop.planatest`
- 可执行文件：`PaperScape-PlanA-Test.exe`

稳定版 `dev/2.0` 分支、`v2.0.0-phase4-dev.3` 标签和发布包均未改动。

## 方案 A

针对不注册 Windows GSMTC 的网易云音乐，通过 Win32 读取其主窗口标题：

```text
夜航星 (Night Voyager) - 蔡明希（不才）/三体宇宙
```

解析为：

```text
曲名：夜航星 (Night Voyager)
歌手：蔡明希（不才）
专辑：三体宇宙
来源：网易云音乐（兼容模式）
```

接口：

```text
legacy:cloudmusic
windows-legacy
```

控制通过网易云全局快捷键（默认 `Ctrl+Alt+P` / `Ctrl+Alt+←` / `Ctrl+Alt+→`）：

- 播放/暂停
- 上一首
- 下一首

## 已验证

- 网易云 3.1.23.0 窗口类：`OrpheusBrowserHost`
- 能读取当前播放歌曲、歌手、专辑
- 媒体面板显示“兼容模式”提示
- 播放状态通过网易云进程的 WASAPI 音频会话状态判断，可在播放/暂停之间切换
- 进度、封面不可用
- 已实测默认全局快捷键 `Ctrl+Alt+P`：系统音频峰值从约 0.1027 变为接近 0，再次发送后恢复播放
- 已实测 PaperScape 测试副本的 `media_control`：音频峰值从接近 0 变为约 0.10，确认实际控制网易云
- 上一首/下一首使用 `Ctrl+Alt+← / →`，需确认与网易云当前全局快捷键一致
- 按钮已验证：暂停时显示“播放”，点击切到播放后自动变为“暂停”，再次点击恢复

## 测试方法

1. 启动网易云并播放一首歌。
2. 启动 `PaperScape-PlanA-Test.exe`。
3. 打开或新建文稿。
4. 点击底部“系统音乐/网易云音乐”入口。
5. 查看曲名是否正确。
6. 点击播放/暂停、上一首、下一首，确认网易云是否响应。

## 不包含

- QQ 音乐、Spotify 等窗口标题适配
- 网易云进度、封面、播放状态读取
- CEF 调试接口
- BetterNCM 插件
- 内存读取或注入
