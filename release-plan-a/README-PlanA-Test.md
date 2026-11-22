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

控制通过向网易云窗口发送 `WM_APPCOMMAND`：

- 播放/暂停
- 上一首
- 下一首

## 已验证

- 网易云 3.1.23.0 窗口类：`OrpheusBrowserHost`
- 能读取当前播放歌曲、歌手、专辑
- 媒体面板显示“兼容模式”提示
- 进度、封面、精确播放状态不可用
- 未通过自动化点击播放/暂停，避免打断实际播放

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
