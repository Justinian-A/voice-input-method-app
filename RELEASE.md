# 语音输入法 v0.1.0

## 🎉 首次发布

一款基于Tauri 2.0的桌面语音输入法应用，支持实时语音转文字，帮助用户提高文本输入效率。

## ✨ 功能特性

- 🎙️ **实时语音转文字** - 边说边转写，延迟低至1-2秒
- 🌐 **在线/离线双模式** - 在线使用百度语音API，离线使用faster-whisper
- 🌍 **多语言支持** - 普通话、英语、中英文混合识别
- ✍️ **智能纠错** - 自动修正标点符号和常见错误
- 🎨 **简洁界面** - 极简设计，易于使用
- 🖥️ **跨平台** - 支持 Windows、macOS、Linux

## 📦 下载

### Windows
- `语音输入法_0.1.0_x64-setup.exe` - Windows安装包

### macOS
- `语音输入法_0.1.0_x64.dmg` - macOS安装包

### Linux
- `语音-input-method_0.1.0_amd64.AppImage` - Linux便携版

## 🚀 快速开始

1. 下载并安装对应平台的安装包
2. 启动应用
3. 配置百度语音识别API密钥（设置 → 识别设置）
4. 点击录音按钮开始使用

## 📋 系统要求

- **Windows**: Windows 10 或更高版本
- **macOS**: macOS 10.15 或更高版本
- **Linux**: 支持主流发行版

## 🔧 技术栈

- **前端**: Vue 3 + TypeScript + Vite
- **后端**: Rust (Tauri 2.0)
- **在线识别**: 百度语音识别 API
- **离线识别**: faster-whisper (Python)

## 📝 更新日志

### v0.1.0 (2026-05-28)

#### 新增
- 实时语音转文字功能
- 在线/离线双模式识别
- 中英文混合识别支持
- 智能文本纠错功能
- 历史记录管理
- 个性化设置界面
- 系统托盘功能
- 快捷键支持

#### 优化
- 现代化UI界面设计
- 录音质量优化（降噪、回声消除）
- 性能优化和错误处理

## 📄 许可证

MIT License

## 🔗 链接

- [GitHub仓库](https://github.com/Justinian-A/voice-input-method-app)
- [用户手册](https://github.com/Justinian-A/voice-input-method-app/blob/main/docs/用户手册.md)
- [问题反馈](https://github.com/Justinian-A/voice-input-method-app/issues)