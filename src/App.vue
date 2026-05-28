<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { createVoiceRecognitionManager, type VoiceRecognitionManager, SUPPORTED_LANGUAGES, HistoryManager, createHistoryManager, SettingsManager, createSettingsManager } from './services';
import type { HistoryItem, AppSettings } from './services';

// 语音识别管理器
let recognitionManager: VoiceRecognitionManager | null = null;
let historyManager: HistoryManager | null = null;
let settingsManager: SettingsManager | null = null;

// 状态
const isRecording = ref(false);
const recognizedText = ref('');
const interimText = ref('');
const errorMessage = ref('');
const isLoading = ref(false);
const currentMode = ref<'online' | 'offline'>('online');
const recognitionMode = ref<'online' | 'offline' | 'auto'>('auto');
const selectedLanguage = ref(15372);
const recordingTime = ref(0);
let recordingTimer: number | null = null;

// 历史记录状态
const currentView = ref<'input' | 'history' | 'settings'>('input');
const historyItems = ref<HistoryItem[]>([]);
const historySearchQuery = ref('');

// 设置状态
const settings = ref<AppSettings | null>(null);

// 计算属性
const hasText = computed(() => recognizedText.value.length > 0 || interimText.value.length > 0);
const wordCount = computed(() => recognizedText.value.length);
const formattedTime = computed(() => {
  const minutes = Math.floor(recordingTime.value / 60);
  const seconds = recordingTime.value % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
});

// 历史记录计算属性
const filteredHistoryItems = computed(() => {
  if (!historySearchQuery.value) {
    return historyItems.value;
  }
  return historyManager?.search(historySearchQuery.value) || [];
});

// 初始化语音识别管理器
onMounted(async () => {
  try {
    // 初始化设置管理器
    settingsManager = createSettingsManager();
    settings.value = settingsManager.getSettings();
    
    // 初始化历史记录管理器
    historyManager = createHistoryManager(settings.value.history.maxItems);
    historyItems.value = historyManager.getAll();
    
    // 应用保存的设置
    recognitionMode.value = settings.value.recognition.mode;
    selectedLanguage.value = settings.value.recognition.language;
    
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
      errorMessage.value = '请先配置百度语音识别API密钥';
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
  if (recordingTimer) {
    clearInterval(recordingTimer);
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
    stopTimer();
  } else {
    // 开始录音
    isLoading.value = true;
    errorMessage.value = '';
    interimText.value = '';

    try {
      await recognitionManager.start(
        (text, isFinal) => {
          if (isFinal) {
            recognizedText.value += text;
            interimText.value = '';
          } else {
            interimText.value = text;
          }
        },
        (error) => {
          console.error('识别错误:', error);
          errorMessage.value = `识别错误: ${error.message}`;
          isRecording.value = false;
          isLoading.value = false;
          stopTimer();
        }
      );

      isRecording.value = true;
      isLoading.value = false;
      currentMode.value = recognitionManager.getCurrentMode();
      startTimer();
    } catch (error) {
      console.error('启动录音失败:', error);
      errorMessage.value = `启动录音失败: ${error instanceof Error ? error.message : String(error)}`;
      isLoading.value = false;
    }
  }
}

// 计时器
function startTimer() {
  recordingTime.value = 0;
  recordingTimer = window.setInterval(() => {
    recordingTime.value++;
  }, 1000);
}

function stopTimer() {
  if (recordingTimer) {
    clearInterval(recordingTimer);
    recordingTimer = null;
  }
  
  // 保存到历史记录
  if (recognizedText.value.trim() && historyManager) {
    const item = historyManager.add(
      recognizedText.value,
      currentMode.value,
      selectedLanguage.value.toString(),
      recordingTime.value
    );
    historyItems.value = historyManager.getAll();
    console.log('已保存到历史记录:', item.id);
  }
}

// 切换识别模式
function changeMode(mode: 'online' | 'offline' | 'auto') {
  recognitionMode.value = mode;
  if (recognitionManager) {
    recognitionManager.stop();
    isRecording.value = false;
    stopTimer();
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
    stopTimer();
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
    const btn = document.querySelector('.copy-btn');
    if (btn) {
      btn.textContent = '已复制!';
      setTimeout(() => {
        btn.textContent = '复制';
      }, 2000);
    }
  } catch (error) {
    console.error('复制失败:', error);
    errorMessage.value = '复制失败，请手动复制';
  }
}

// 切换视图
function switchView(view: 'input' | 'history' | 'settings') {
  currentView.value = view;
  if (view === 'history' && historyManager) {
    historyItems.value = historyManager.getAll();
  }
  if (view === 'settings' && settingsManager) {
    settings.value = settingsManager.getSettings();
  }
}

// 从历史记录加载文本
function loadFromHistory(item: HistoryItem) {
  recognizedText.value = item.text;
  currentView.value = 'input';
}

// 删除历史记录
function deleteHistoryItem(id: string) {
  if (historyManager) {
    historyManager.delete(id);
    historyItems.value = historyManager.getAll();
  }
}

// 清空历史记录
function clearHistory() {
  if (historyManager && confirm('确定要清空所有历史记录吗？')) {
    historyManager.clear();
    historyItems.value = [];
  }
}

// 复制历史记录文本
async function copyHistoryText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    alert('已复制到剪贴板');
  } catch (error) {
    console.error('复制失败:', error);
  }
}

// 更新设置
function updateSettings(category: keyof AppSettings, key: string, value: any) {
  if (!settingsManager) return;
  
  switch (category) {
    case 'recognition':
      settingsManager.updateRecognitionSettings({ [key]: value });
      break;
    case 'audio':
      settingsManager.updateAudioSettings({ [key]: value });
      break;
    case 'ui':
      settingsManager.updateUISettings({ [key]: value });
      break;
    case 'history':
      settingsManager.updateHistorySettings({ [key]: value });
      break;
  }
  
  settings.value = settingsManager.getSettings();
  
  // 应用某些设置的即时效果
  if (category === 'recognition' && key === 'mode') {
    changeMode(value);
  }
  if (category === 'recognition' && key === 'language') {
    changeLanguage(value);
  }
}

// 重置设置
function resetSettings(category?: keyof AppSettings) {
  if (!settingsManager) return;
  
  if (category) {
    if (confirm(`确定要重置${getCategoryName(category)}设置吗？`)) {
      settingsManager.resetCategoryToDefaults(category);
    }
  } else {
    if (confirm('确定要重置所有设置吗？')) {
      settingsManager.resetToDefaults();
    }
  }
  
  settings.value = settingsManager.getSettings();
}

// 获取分类名称
function getCategoryName(category: keyof AppSettings): string {
  const names: Record<string, string> = {
    recognition: '识别',
    audio: '录音',
    ui: '界面',
    history: '历史记录',
  };
  return names[category] || category;
}

// 键盘快捷键
onMounted(() => {
  document.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown);
});

function handleKeyDown(e: KeyboardEvent) {
  // Space: 开始/停止录音
  if (e.code === 'Space' && !e.ctrlKey && !e.metaKey) {
    e.preventDefault();
    toggleRecording();
  }
  // Ctrl+C: 复制文本
  if ((e.ctrlKey || e.metaKey) && e.code === 'KeyC' && !window.getSelection()?.toString()) {
    e.preventDefault();
    copyText();
  }
  // Ctrl+L: 清空文本
  if ((e.ctrlKey || e.metaKey) && e.code === 'KeyL') {
    e.preventDefault();
    clearText();
  }
}
</script>

<template>
  <div class="app">
    <!-- 侧边栏 -->
    <aside class="sidebar">
      <div class="logo">
        <span class="logo-icon">🎙️</span>
        <h1>语音输入法</h1>
      </div>
      
      <nav class="nav">
        <div 
          class="nav-item" 
          :class="{ active: currentView === 'input' }"
          @click="switchView('input')"
        >
          <span class="nav-icon">🎤</span>
          <span>语音输入</span>
        </div>
        <div 
          class="nav-item" 
          :class="{ active: currentView === 'history' }"
          @click="switchView('history')"
        >
          <span class="nav-icon">📋</span>
          <span>历史记录</span>
          <span class="nav-badge" v-if="historyItems.length > 0">{{ historyItems.length }}</span>
        </div>
        <div 
          class="nav-item" 
          :class="{ active: currentView === 'settings' }"
          @click="switchView('settings')"
        >
          <span class="nav-icon">⚙️</span>
          <span>设置</span>
        </div>
      </nav>
      
      <div class="sidebar-footer">
        <div class="version">v0.1.0</div>
      </div>
    </aside>

    <!-- 主内容区 -->
    <main class="main">
      <!-- 语音输入视图 -->
      <template v-if="currentView === 'input'">
        <!-- 顶部工具栏 -->
        <header class="toolbar">
          <div class="toolbar-left">
            <!-- 模式选择 -->
            <div class="mode-switcher">
              <button 
                class="mode-btn" 
                :class="{ active: recognitionMode === 'auto' }"
                @click="changeMode('auto')"
                title="自动选择模式"
              >
                <span class="mode-icon">⚡</span>
                <span>自动</span>
              </button>
              <button 
                class="mode-btn" 
                :class="{ active: recognitionMode === 'online' }"
                @click="changeMode('online')"
                title="在线识别（需要网络）"
              >
                <span class="mode-icon">☁️</span>
                <span>在线</span>
              </button>
              <button 
                class="mode-btn" 
                :class="{ active: recognitionMode === 'offline' }"
                @click="changeMode('offline')"
                title="离线识别（无需网络）"
              >
                <span class="mode-icon">💻</span>
                <span>离线</span>
              </button>
            </div>
          </div>
          
          <div class="toolbar-right">
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
          </div>
        </header>

        <!-- 录音区域 -->
        <section class="recording-section">
          <div class="recording-container">
            <!-- 录音按钮 -->
            <button
              class="record-btn"
              :class="{ 
                recording: isRecording, 
                loading: isLoading,
                'pulse-animation': isRecording 
              }"
              :disabled="isLoading"
              @click="toggleRecording"
            >
              <div class="record-btn-inner">
                <div class="record-icon">
                  <div v-if="isLoading" class="spinner"></div>
                  <div v-else-if="isRecording" class="stop-icon"></div>
                  <div v-else class="mic-icon"></div>
                </div>
              </div>
            </button>
            
            <!-- 状态信息 -->
            <div class="status-info">
              <div v-if="isLoading" class="status-text">正在初始化...</div>
              <div v-else-if="isRecording" class="status-text recording">
                <span class="recording-dot"></span>
                正在录音 {{ formattedTime }}
              </div>
              <div v-else class="status-text">点击开始录音</div>
              
              <div class="mode-indicator">
                <span class="mode-badge" :class="currentMode">
                  {{ currentMode === 'online' ? '在线模式' : '离线模式' }}
                </span>
              </div>
            </div>
          </div>
          
          <!-- 错误提示 -->
          <div class="error-message" v-if="errorMessage">
            <span class="error-icon">⚠️</span>
            {{ errorMessage }}
          </div>
        </section>

        <!-- 识别结果区域 -->
        <section class="result-section">
          <div class="result-header">
            <h2>识别结果</h2>
            <div class="result-actions">
              <span class="word-count" v-if="hasText">{{ wordCount }} 字</span>
              <button class="action-btn clear-btn" @click="clearText" :disabled="!hasText">
                清空
              </button>
              <button class="action-btn copy-btn" @click="copyText" :disabled="!hasText">
                复制
              </button>
            </div>
          </div>
          
          <div class="result-content">
            <div class="text-display">
              <span class="final-text">{{ recognizedText }}</span>
              <span class="interim-text" v-if="interimText">{{ interimText }}</span>
              <span class="cursor" v-if="isRecording">|</span>
              <span class="placeholder" v-if="!hasText && !isRecording">
                识别结果将显示在这里...
              </span>
            </div>
          </div>
        </section>

        <!-- 快捷键提示 -->
        <section class="shortcuts-section">
          <div class="shortcut-item">
            <kbd>Space</kbd>
            <span>开始/停止录音</span>
          </div>
          <div class="shortcut-item">
            <kbd>Ctrl</kbd> + <kbd>C</kbd>
            <span>复制文本</span>
          </div>
          <div class="shortcut-item">
            <kbd>Ctrl</kbd> + <kbd>L</kbd>
            <span>清空文本</span>
          </div>
        </section>
      </template>

      <!-- 历史记录视图 -->
      <template v-if="currentView === 'history'">
        <header class="toolbar">
          <div class="toolbar-left">
            <h2 class="history-title">历史记录</h2>
            <span class="history-count">{{ historyItems.length }} 条记录</span>
          </div>
          <div class="toolbar-right">
            <div class="history-search">
              <input 
                v-model="historySearchQuery"
                type="text"
                placeholder="搜索历史记录..."
                class="search-input"
              />
            </div>
            <button 
              class="action-btn danger-btn" 
              @click="clearHistory"
              :disabled="historyItems.length === 0"
            >
              清空
            </button>
          </div>
        </header>

        <div class="history-content">
          <div v-if="filteredHistoryItems.length === 0" class="history-empty">
            <span class="empty-icon">📋</span>
            <p v-if="historySearchQuery">没有找到匹配的记录</p>
            <p v-else>暂无历史记录</p>
            <p class="empty-hint" v-if="!historySearchQuery">开始录音后，识别结果将自动保存在这里</p>
          </div>
          
          <div v-else class="history-list">
            <div 
              v-for="item in filteredHistoryItems" 
              :key="item.id" 
              class="history-item"
            >
              <div class="history-item-header">
                <span class="history-time">{{ HistoryManager.formatTimestamp(item.timestamp) }}</span>
                <span class="history-mode" :class="item.mode">
                  {{ item.mode === 'online' ? '在线' : '离线' }}
                </span>
                <span class="history-duration">{{ HistoryManager.formatDuration(item.duration) }}</span>
              </div>
              <div class="history-item-text">{{ item.text }}</div>
              <div class="history-item-actions">
                <button class="action-btn small-btn" @click="loadFromHistory(item)">
                  使用
                </button>
                <button class="action-btn small-btn" @click="copyHistoryText(item.text)">
                  复制
                </button>
                <button class="action-btn small-btn danger-btn" @click="deleteHistoryItem(item.id)">
                  删除
                </button>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- 设置视图 -->
      <template v-if="currentView === 'settings' && settings">
        <header class="toolbar">
          <div class="toolbar-left">
            <h2 class="settings-title">设置</h2>
          </div>
          <div class="toolbar-right">
            <button class="action-btn" @click="resetSettings()">
              重置所有设置
            </button>
          </div>
        </header>

        <div class="settings-content">
          <!-- 识别设置 -->
          <section class="settings-section">
            <div class="settings-section-header">
              <h3>识别设置</h3>
              <button class="action-btn small-btn" @click="resetSettings('recognition')">重置</button>
            </div>
            <div class="settings-group">
              <div class="setting-item">
                <div class="setting-info">
                  <span class="setting-label">默认识别模式</span>
                  <span class="setting-desc">选择默认的语音识别方式</span>
                </div>
                <select 
                  :value="settings.recognition.mode"
                  @change="updateSettings('recognition', 'mode', ($event.target as HTMLSelectElement).value)"
                  class="setting-select"
                >
                  <option value="auto">自动</option>
                  <option value="online">在线</option>
                  <option value="offline">离线</option>
                </select>
              </div>
              <div class="setting-item">
                <div class="setting-info">
                  <span class="setting-label">默认语言</span>
                  <span class="setting-desc">选择默认的识别语言</span>
                </div>
                <select 
                  :value="settings.recognition.language"
                  @change="updateSettings('recognition', 'language', parseInt(($event.target as HTMLSelectElement).value))"
                  class="setting-select"
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
              <div class="setting-item">
                <div class="setting-info">
                  <span class="setting-label">智能纠错</span>
                  <span class="setting-desc">自动修正识别错误</span>
                </div>
                <label class="setting-toggle">
                  <input 
                    type="checkbox"
                    :checked="settings.recognition.enableSmartCorrection"
                    @change="updateSettings('recognition', 'enableSmartCorrection', ($event.target as HTMLInputElement).checked)"
                  />
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </div>
          </section>

          <!-- 录音设置 -->
          <section class="settings-section">
            <div class="settings-section-header">
              <h3>录音设置</h3>
              <button class="action-btn small-btn" @click="resetSettings('audio')">重置</button>
            </div>
            <div class="settings-group">
              <div class="setting-item">
                <div class="setting-info">
                  <span class="setting-label">噪音抑制</span>
                  <span class="setting-desc">减少背景噪音</span>
                </div>
                <label class="setting-toggle">
                  <input 
                    type="checkbox"
                    :checked="settings.audio.enableNoiseSuppression"
                    @change="updateSettings('audio', 'enableNoiseSuppression', ($event.target as HTMLInputElement).checked)"
                  />
                  <span class="toggle-slider"></span>
                </label>
              </div>
              <div class="setting-item">
                <div class="setting-info">
                  <span class="setting-label">回声消除</span>
                  <span class="setting-desc">消除回声干扰</span>
                </div>
                <label class="setting-toggle">
                  <input 
                    type="checkbox"
                    :checked="settings.audio.enableEchoCancellation"
                    @change="updateSettings('audio', 'enableEchoCancellation', ($event.target as HTMLInputElement).checked)"
                  />
                  <span class="toggle-slider"></span>
                </label>
              </div>
              <div class="setting-item">
                <div class="setting-info">
                  <span class="setting-label">自动增益</span>
                  <span class="setting-desc">自动调整音量</span>
                </div>
                <label class="setting-toggle">
                  <input 
                    type="checkbox"
                    :checked="settings.audio.enableAutoGainControl"
                    @change="updateSettings('audio', 'enableAutoGainControl', ($event.target as HTMLInputElement).checked)"
                  />
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </div>
          </section>

          <!-- 界面设置 -->
          <section class="settings-section">
            <div class="settings-section-header">
              <h3>界面设置</h3>
              <button class="action-btn small-btn" @click="resetSettings('ui')">重置</button>
            </div>
            <div class="settings-group">
              <div class="setting-item">
                <div class="setting-info">
                  <span class="setting-label">显示快捷键提示</span>
                  <span class="setting-desc">在界面上显示快捷键说明</span>
                </div>
                <label class="setting-toggle">
                  <input 
                    type="checkbox"
                    :checked="settings.ui.showShortcuts"
                    @change="updateSettings('ui', 'showShortcuts', ($event.target as HTMLInputElement).checked)"
                  />
                  <span class="toggle-slider"></span>
                </label>
              </div>
              <div class="setting-item">
                <div class="setting-info">
                  <span class="setting-label">显示字数统计</span>
                  <span class="setting-desc">显示识别文本的字数</span>
                </div>
                <label class="setting-toggle">
                  <input 
                    type="checkbox"
                    :checked="settings.ui.showWordCount"
                    @change="updateSettings('ui', 'showWordCount', ($event.target as HTMLInputElement).checked)"
                  />
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </div>
          </section>

          <!-- 历史记录设置 -->
          <section class="settings-section">
            <div class="settings-section-header">
              <h3>历史记录设置</h3>
              <button class="action-btn small-btn" @click="resetSettings('history')">重置</button>
            </div>
            <div class="settings-group">
              <div class="setting-item">
                <div class="setting-info">
                  <span class="setting-label">最大记录数</span>
                  <span class="setting-desc">保存的历史记录最大数量</span>
                </div>
                <input 
                  type="number"
                  :value="settings.history.maxItems"
                  @change="updateSettings('history', 'maxItems', parseInt(($event.target as HTMLInputElement).value))"
                  min="10"
                  max="1000"
                  class="setting-input"
                />
              </div>
              <div class="setting-item">
                <div class="setting-info">
                  <span class="setting-label">自动保存</span>
                  <span class="setting-desc">录音结束后自动保存到历史记录</span>
                </div>
                <label class="setting-toggle">
                  <input 
                    type="checkbox"
                    :checked="settings.history.autoSave"
                    @change="updateSettings('history', 'autoSave', ($event.target as HTMLInputElement).checked)"
                  />
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </div>
          </section>
        </div>
      </template>
    </main>
  </div>
</template>

<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

:root {
  --primary: #3b82f6;
  --primary-dark: #2563eb;
  --danger: #ef4444;
  --success: #10b981;
  --warning: #f59e0b;
  --bg: #f8fafc;
  --bg-secondary: #ffffff;
  --text: #1e293b;
  --text-secondary: #64748b;
  --border: #e2e8f0;
  --shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

.app {
  display: flex;
  height: 100vh;
  background: var(--bg);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

/* 侧边栏 */
.sidebar {
  width: 240px;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  padding: 20px 0;
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 20px;
  margin-bottom: 30px;
}

.logo-icon {
  font-size: 28px;
}

.logo h1 {
  font-size: 18px;
  font-weight: 600;
  color: var(--text);
}

.nav {
  flex: 1;
  padding: 0 12px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  color: var(--text-secondary);
}

.nav-item:hover {
  background: var(--bg);
}

.nav-item.active {
  background: var(--primary);
  color: white;
}

.nav-icon {
  font-size: 18px;
}

.nav-badge {
  margin-left: auto;
  background: rgba(255, 255, 255, 0.2);
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
}

.sidebar-footer {
  padding: 20px;
  border-top: 1px solid var(--border);
}

.version {
  font-size: 12px;
  color: var(--text-secondary);
  text-align: center;
}

/* 主内容区 */
.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 工具栏 */
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
}

.toolbar-left, .toolbar-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.mode-switcher {
  display: flex;
  background: var(--bg);
  border-radius: 8px;
  padding: 4px;
  gap: 4px;
}

.mode-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
}

.mode-btn:hover {
  background: var(--bg-secondary);
}

.mode-btn.active {
  background: var(--primary);
  color: white;
  box-shadow: var(--shadow);
}

.mode-icon {
  font-size: 16px;
}

.language-selector {
  position: relative;
}

.language-select {
  padding: 8px 32px 8px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-secondary);
  color: var(--text);
  font-size: 14px;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
}

.language-select:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* 录音区域 */
.recording-section {
  padding: 40px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.recording-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}

.record-btn {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  border: 4px solid rgba(255, 255, 255, 0.3);
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 8px 25px rgba(59, 130, 246, 0.4);
  position: relative;
  overflow: hidden;
}

.record-btn:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.record-btn:active:not(:disabled) {
  transform: scale(0.95);
}

.record-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.record-btn.recording {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  border-color: rgba(255, 255, 255, 0.4);
  box-shadow: 0 8px 25px rgba(239, 68, 68, 0.5);
}

.record-btn.loading {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  border-color: rgba(255, 255, 255, 0.4);
  box-shadow: 0 8px 25px rgba(245, 158, 11, 0.5);
}

.record-btn-inner {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.record-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mic-icon {
  width: 24px;
  height: 36px;
  background: white;
  border-radius: 12px 12px 0 0;
  position: relative;
}

.mic-icon::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  width: 32px;
  height: 16px;
  border: 3px solid white;
  border-top: none;
  border-radius: 0 0 16px 16px;
}

.stop-icon {
  width: 24px;
  height: 24px;
  background: white;
  border-radius: 4px;
}

.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.pulse-animation {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
  50% { box-shadow: 0 0 0 20px rgba(239, 68, 68, 0); }
}

.status-info {
  text-align: center;
}

.status-text {
  font-size: 16px;
  color: var(--text);
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.status-text.recording {
  color: var(--danger);
}

.recording-dot {
  width: 8px;
  height: 8px;
  background: var(--danger);
  border-radius: 50%;
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.mode-indicator {
  margin-top: 8px;
}

.mode-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.mode-badge.online {
  background: rgba(16, 185, 129, 0.1);
  color: var(--success);
}

.mode-badge.offline {
  background: rgba(59, 130, 246, 0.1);
  color: var(--primary);
}

.error-message {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: rgba(239, 68, 68, 0.1);
  border-radius: 8px;
  color: var(--danger);
  font-size: 14px;
  margin-top: 16px;
  max-width: 400px;
}

.error-icon {
  font-size: 16px;
}

/* 识别结果区域 */
.result-section {
  flex: 1;
  margin: 0 24px 24px;
  background: var(--bg-secondary);
  border-radius: 12px;
  border: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}

.result-header h2 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
}

.result-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.word-count {
  font-size: 13px;
  color: var(--text-secondary);
}

.action-btn {
  padding: 6px 16px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover:not(:disabled) {
  background: var(--bg);
  border-color: var(--primary);
  color: var(--primary);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.copy-btn:hover:not(:disabled) {
  background: var(--primary);
  border-color: var(--primary);
  color: white;
}

.result-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.text-display {
  min-height: 100%;
  font-size: 16px;
  line-height: 1.8;
  color: var(--text);
}

.final-text {
  white-space: pre-wrap;
}

.interim-text {
  color: var(--text-secondary);
  opacity: 0.7;
}

.cursor {
  color: var(--primary);
  animation: blink-cursor 1s infinite;
}

@keyframes blink-cursor {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.placeholder {
  color: var(--text-secondary);
  opacity: 0.5;
}

/* 快捷键提示 */
.shortcuts-section {
  display: flex;
  justify-content: center;
  gap: 24px;
  padding: 16px;
  background: var(--bg-secondary);
  border-top: 1px solid var(--border);
}

.shortcut-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-secondary);
}

kbd {
  display: inline-block;
  padding: 2px 8px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
  color: var(--text);
}

/* 暗色主题 */
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0f172a;
    --bg-secondary: #1e293b;
    --text: #f1f5f9;
    --text-secondary: #94a3b8;
    --border: #334155;
  }

  .language-select {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
  }

  .record-btn {
    border-color: rgba(255, 255, 255, 0.2);
    box-shadow: 0 8px 25px rgba(59, 130, 246, 0.3);
  }

  .record-btn.recording {
    box-shadow: 0 8px 25px rgba(239, 68, 68, 0.4);
  }

  .record-btn.loading {
    box-shadow: 0 8px 25px rgba(245, 158, 11, 0.4);
  }
}

/* 历史记录样式 */
.history-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
}

.history-count {
  font-size: 14px;
  color: var(--text-secondary);
  margin-left: 12px;
}

.history-search {
  flex: 1;
  max-width: 300px;
}

.search-input {
  width: 100%;
  padding: 8px 16px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-secondary);
  color: var(--text);
  font-size: 14px;
}

.search-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.search-input::placeholder {
  color: var(--text-secondary);
}

.danger-btn {
  color: var(--danger);
  border-color: var(--danger);
}

.danger-btn:hover:not(:disabled) {
  background: var(--danger);
  color: white;
}

.small-btn {
  padding: 4px 12px;
  font-size: 12px;
}

.history-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.history-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.history-empty p {
  margin: 4px 0;
}

.empty-hint {
  font-size: 14px;
  opacity: 0.7;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.history-item {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px;
  transition: all 0.2s;
}

.history-item:hover {
  border-color: var(--primary);
  box-shadow: var(--shadow);
}

.history-item-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  font-size: 13px;
}

.history-time {
  color: var(--text-secondary);
}

.history-mode {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}

.history-mode.online {
  background: rgba(16, 185, 129, 0.1);
  color: var(--success);
}

.history-mode.offline {
  background: rgba(59, 130, 246, 0.1);
  color: var(--primary);
}

.history-duration {
  color: var(--text-secondary);
  margin-left: auto;
}

.history-item-text {
  font-size: 15px;
  line-height: 1.6;
  color: var(--text);
  margin-bottom: 12px;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.history-item-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

/* 设置界面样式 */
.settings-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
}

.settings-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.settings-section {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 12px;
  margin-bottom: 24px;
  overflow: hidden;
}

.settings-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}

.settings-section-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
}

.settings-group {
  padding: 8px 0;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  transition: background 0.2s;
}

.setting-item:hover {
  background: var(--bg);
}

.setting-info {
  flex: 1;
  margin-right: 16px;
}

.setting-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--text);
  margin-bottom: 4px;
}

.setting-desc {
  display: block;
  font-size: 13px;
  color: var(--text-secondary);
}

.setting-select {
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-secondary);
  color: var(--text);
  font-size: 14px;
  min-width: 120px;
}

.setting-select:focus {
  outline: none;
  border-color: var(--primary);
}

.setting-input {
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-secondary);
  color: var(--text);
  font-size: 14px;
  width: 100px;
  text-align: center;
}

.setting-input:focus {
  outline: none;
  border-color: var(--primary);
}

.setting-toggle {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 24px;
  cursor: pointer;
}

.setting-toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--border);
  border-radius: 24px;
  transition: all 0.3s;
}

.toggle-slider::before {
  content: '';
  position: absolute;
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background: white;
  border-radius: 50%;
  transition: all 0.3s;
}

.setting-toggle input:checked + .toggle-slider {
  background: var(--primary);
}

.setting-toggle input:checked + .toggle-slider::before {
  transform: translateX(24px);
}
</style>