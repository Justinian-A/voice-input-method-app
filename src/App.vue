<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { createVoiceRecognitionManager, type VoiceRecognitionManager, SUPPORTED_LANGUAGES } from './services';

// 语音识别管理器
let recognitionManager: VoiceRecognitionManager | null = null;

// 状态
const isRecording = ref(false);
const recognizedText = ref('');
const interimText = ref('');
const errorMessage = ref('');
const isLoading = ref(false);
const currentMode = ref<'online' | 'offline'>('online');
const recognitionMode = ref<'online' | 'offline' | 'auto'>('auto');
const selectedLanguage = ref(15372); // 默认普通话（加强标点）

// 初始化语音识别管理器
onMounted(async () => {
  try {
    recognitionManager = createVoiceRecognitionManager({
      mode: recognitionMode.value,
      baiduASR: {
        devPid: selectedLanguage.value,
      },
    });
    console.log('语音识别管理器初始化成功');
    
    // 检查API配置
    const config = recognitionManager.getASRConfig();
    if (!config.apiKey || !config.secretKey) {
      errorMessage.value = '请先配置百度语音识别API密钥。在项目根目录的 .env 文件中填入 VITE_BAIDU_APP_ID、VITE_BAIDU_API_KEY 和 VITE_BAIDU_SECRET_KEY';
    }
  } catch (error) {
    console.error('初始化语音识别管理器失败:', error);
    errorMessage.value = `初始化失败: ${error instanceof Error ? error.message : String(error)}`;
  }
});

// 清理资源
onUnmounted(() => {
  if (recognitionManager) {
    recognitionManager.stop();
    recognitionManager = null;
  }
});

// 开始/停止录音
async function toggleRecording() {
  if (!recognitionManager) {
    errorMessage.value = '语音识别管理器未初始化';
    return;
  }

  if (isRecording.value) {
    // 停止录音
    recognitionManager.stop();
    isRecording.value = false;
    isLoading.value = false;
  } else {
    // 开始录音
    isLoading.value = true;
    errorMessage.value = '';
    interimText.value = '';

    try {
      await recognitionManager.start(
        (text, isFinal) => {
          if (isFinal) {
            // 最终结果
            recognizedText.value += text;
            interimText.value = '';
          } else {
            // 临时结果
            interimText.value = text;
          }
        },
        (error) => {
          console.error('识别错误:', error);
          errorMessage.value = `识别错误: ${error.message}`;
          isRecording.value = false;
          isLoading.value = false;
        }
      );

      isRecording.value = true;
      isLoading.value = false;
      currentMode.value = recognitionManager.getCurrentMode();
    } catch (error) {
      console.error('启动录音失败:', error);
      errorMessage.value = `启动录音失败: ${error instanceof Error ? error.message : String(error)}`;
      isLoading.value = false;
    }
  }
}

// 切换识别模式
function changeMode(mode: 'online' | 'offline' | 'auto') {
  recognitionMode.value = mode;
  if (recognitionManager) {
    recognitionManager.stop();
    isRecording.value = false;
    recognitionManager = createVoiceRecognitionManager({ 
      mode,
      baiduASR: {
        devPid: selectedLanguage.value,
      },
    });
  }
}

// 切换语言
function changeLanguage(langCode: number) {
  selectedLanguage.value = langCode;
  if (recognitionManager) {
    recognitionManager.stop();
    isRecording.value = false;
    recognitionManager = createVoiceRecognitionManager({ 
      mode: recognitionMode.value,
      baiduASR: {
        devPid: langCode,
      },
    });
  }
}

// 清空文本
function clearText() {
  recognizedText.value = '';
  interimText.value = '';
  errorMessage.value = '';
}

// 复制文本
async function copyText() {
  try {
    await navigator.clipboard.writeText(recognizedText.value);
    alert('文本已复制到剪贴板');
  } catch (error) {
    console.error('复制失败:', error);
    errorMessage.value = '复制失败，请手动复制';
  }
}
</script>

<template>
  <main class="container">
    <h1>语音输入法</h1>
    <p class="subtitle">实时语音转文字，提高输入效率</p>

    <!-- 控制按钮 -->
    <div class="controls">
      <!-- 模式选择 -->
      <div class="mode-selector">
        <button 
          class="mode-btn" 
          :class="{ active: recognitionMode === 'auto' }"
          @click="changeMode('auto')"
        >
          自动
        </button>
        <button 
          class="mode-btn" 
          :class="{ active: recognitionMode === 'online' }"
          @click="changeMode('online')"
        >
          在线
        </button>
        <button 
          class="mode-btn" 
          :class="{ active: recognitionMode === 'offline' }"
          @click="changeMode('offline')"
        >
          离线
        </button>
      </div>
      
      <!-- 语言选择 -->
      <div class="language-selector">
        <select 
          v-model="selectedLanguage" 
          @change="changeLanguage(selectedLanguage)"
          class="language-select"
        >
          <option 
            v-for="lang in SUPPORTED_LANGUAGES" 
            :key="lang.code" 
            :value="lang.code"
          >
            {{ lang.name }}
          </option>
        </select>
      </div>
      
      <button
        class="record-btn"
        :class="{ recording: isRecording, loading: isLoading }"
        :disabled="isLoading"
        @click="toggleRecording"
      >
        <span v-if="isLoading">初始化中...</span>
        <span v-else-if="isRecording">停止录音</span>
        <span v-else>开始录音</span>
      </button>
    </div>

    <!-- 状态提示 -->
    <div class="status" v-if="isRecording">
      <div class="pulse"></div>
      <span>正在录音... ({{ currentMode === 'online' ? '在线模式' : '离线模式' }})</span>
    </div>

    <!-- 错误提示 -->
    <div class="error" v-if="errorMessage">
      {{ errorMessage }}
    </div>

    <!-- 识别结果 -->
    <div class="result-container">
      <div class="result-header">
        <h2>识别结果</h2>
        <div class="result-actions">
          <button class="action-btn" @click="clearText" :disabled="!recognizedText">
            清空
          </button>
          <button class="action-btn" @click="copyText" :disabled="!recognizedText">
            复制
          </button>
        </div>
      </div>
      
      <div class="result-text">
        <span class="final-text">{{ recognizedText }}</span>
        <span class="interim-text" v-if="interimText">{{ interimText }}</span>
        <span class="placeholder" v-if="!recognizedText && !interimText && !isRecording">
          点击"开始录音"按钮，开始语音输入
        </span>
      </div>
    </div>

    <!-- 使用说明 -->
    <div class="instructions">
      <h3>使用说明</h3>
      <ul>
        <li>点击"开始录音"按钮开始语音输入</li>
        <li>再次点击停止录音</li>
        <li>支持普通话和英语识别</li>
        <li>识别结果可复制到剪贴板</li>
        <li><strong>模式说明：</strong></li>
        <li>• 自动：根据网络状态自动选择在线/离线模式</li>
        <li>• 在线：使用百度语音识别API（需要网络）</li>
        <li>• 离线：使用本地faster-whisper模型（无需网络）</li>
      </ul>
    </div>
  </main>
</template>

<style scoped>
.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
}

h1 {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
  color: #2c3e50;
}

.subtitle {
  color: #7f8c8d;
  margin-bottom: 2rem;
}

.controls {
  margin-bottom: 2rem;
}

.mode-selector {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.mode-btn {
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  border: 2px solid #3498db;
  border-radius: 20px;
  background-color: white;
  color: #3498db;
  cursor: pointer;
  transition: all 0.2s ease;
}

.mode-btn:hover {
  background-color: #e8f4fc;
}

.mode-btn.active {
  background-color: #3498db;
  color: white;
}

.language-selector {
  margin-bottom: 1rem;
}

.language-select {
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  border: 2px solid #3498db;
  border-radius: 20px;
  background-color: white;
  color: #3498db;
  cursor: pointer;
  min-width: 200px;
}

.language-select:focus {
  outline: none;
  border-color: #2980b9;
}

.record-btn {
  padding: 1rem 2rem;
  font-size: 1.2rem;
  border: none;
  border-radius: 50px;
  cursor: pointer;
  transition: all 0.3s ease;
  background-color: #3498db;
  color: white;
  min-width: 200px;
}

.record-btn:hover:not(:disabled) {
  background-color: #2980b9;
  transform: translateY(-2px);
}

.record-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.record-btn.recording {
  background-color: #e74c3c;
  animation: pulse 1.5s infinite;
}

.record-btn.loading {
  background-color: #f39c12;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(231, 76, 60, 0.7);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(231, 76, 60, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(231, 76, 60, 0);
  }
}

.status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  color: #e74c3c;
  font-weight: 500;
}

.pulse {
  width: 12px;
  height: 12px;
  background-color: #e74c3c;
  border-radius: 50%;
  animation: pulse-dot 1.5s infinite;
}

@keyframes pulse-dot {
  0% {
    transform: scale(0.8);
    opacity: 1;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.7;
  }
  100% {
    transform: scale(0.8);
    opacity: 1;
  }
}

.error {
  background-color: #fdecea;
  color: #d32f2f;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.result-container {
  background-color: #f8f9fa;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  text-align: left;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.result-header h2 {
  margin: 0;
  font-size: 1.5rem;
  color: #2c3e50;
}

.result-actions {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  background-color: white;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover:not(:disabled) {
  background-color: #e9ecef;
  border-color: #adb5bd;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.result-text {
  min-height: 150px;
  padding: 1rem;
  background-color: white;
  border-radius: 8px;
  border: 1px solid #e9ecef;
  font-size: 1.1rem;
  line-height: 1.6;
}

.final-text {
  color: #2c3e50;
}

.interim-text {
  color: #95a5a6;
  font-style: italic;
}

.placeholder {
  color: #bdc3c7;
}

.instructions {
  text-align: left;
  background-color: #f8f9fa;
  padding: 1.5rem;
  border-radius: 12px;
}

.instructions h3 {
  margin-top: 0;
  color: #2c3e50;
}

.instructions ul {
  margin: 0;
  padding-left: 1.5rem;
}

.instructions li {
  margin-bottom: 0.5rem;
  color: #555;
}

/* 暗色主题 */
@media (prefers-color-scheme: dark) {
  .container {
    color: #ecf0f1;
  }

  h1, h2, h3 {
    color: #ecf0f1;
  }

  .subtitle, .instructions li {
    color: #bdc3c7;
  }

  .result-container, .instructions {
    background-color: #2c3e50;
  }

  .result-text {
    background-color: #34495e;
    border-color: #4a6278;
  }

  .action-btn {
    background-color: #34495e;
    border-color: #4a6278;
    color: #ecf0f1;
  }

  .action-btn:hover:not(:disabled) {
    background-color: #4a6278;
  }

  .mode-btn {
    background-color: #34495e;
    border-color: #3498db;
    color: #3498db;
  }

  .mode-btn:hover {
    background-color: #4a6278;
  }

  .mode-btn.active {
    background-color: #3498db;
    color: white;
  }

  .language-select {
    background-color: #34495e;
    border-color: #3498db;
    color: #3498db;
  }

  .language-select:focus {
    border-color: #2980b9;
  }
}
</style>