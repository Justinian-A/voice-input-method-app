# 语音输入法 (Voice Input Method)

一款基于 Tauri 2.0 + Vue 3 的桌面语音输入法应用，支持实时语音转文字，帮助用户提高文本输入效率。

## ✨ 功能特性

- 🎙️ **实时语音转文字** - 边说边转写，延迟低至1-2秒
- 🌐 **在线/离线双模式** - 在线使用百度语音API，离线使用 faster-whisper
- 🌍 **多语言支持** - 普通话、英语、中英文混合识别
- ✍️ **智能纠错** - 自动修正标点符号和常见错误
- 🎨 **简洁界面** - 极简设计，易于使用
- 🖥️ **跨平台** - 支持 Windows、macOS、Linux

## 🛠️ 技术栈

- **前端**: Vue 3 + TypeScript + Vite
- **后端**: Rust (Tauri 2.0)
- **在线识别**: 百度语音识别 API
- **离线识别**: faster-whisper (Python)

## 📦 安装使用

### 前置要求

- Node.js >= 18
- Rust >= 1.70
- Python >= 3.8 (离线识别需要)

### 安装依赖

```bash
# 安装前端依赖
npm install

# 安装离线识别依赖 (可选)
cd python
pip install -r requirements.txt
```

### 配置 API

在项目根目录创建 `.env` 文件：

```env
VITE_BAIDU_APP_ID=你的应用ID
VITE_BAIDU_API_KEY=你的API Key
VITE_BAIDU_SECRET_KEY=你的Secret Key
```

### 运行开发环境

```bash
npm run tauri dev
```

### 构建安装包

```bash
npm run tauri build
```

## 📁 项目结构

```
voice-input-method/
├── src/                    # Vue 3 前端
│   ├── App.vue            # 主组件
│   └── services/          # 服务模块
│       ├── baidu-asr.ts   # 百度语音API封装
│       ├── offline-asr.ts # 离线识别封装
│       ├── audio-recorder.ts # 录音模块
│       └── text-corrector.ts # 文本纠错
├── src-tauri/             # Rust 后端
│   └── src/
│       └── lib.rs         # Tauri 命令
├── python/                # Python 离线识别
│   └── offline_asr.py     # faster-whisper 脚本
└── package.json
```

## 📝 使用说明

1. 点击"开始录音"按钮开始语音输入
2. 选择识别模式（自动/在线/离线）
3. 选择语言（普通话/英语/多方言）
4. 识别结果会实时显示，支持复制和清空

## 📄 许可证

MIT License

## 🙏 致谢

- [Tauri](https://tauri.app/) - 桌面应用框架
- [Vue.js](https://vuejs.org/) - 前端框架
- [百度语音识别](https://ai.baidu.com/tech/speech) - 在线语音识别 API
- [faster-whisper](https://github.com/SYSTRAN/faster-whisper) - 离线语音识别