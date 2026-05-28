// 设置管理模块

export interface AppSettings {
  // 识别设置
  recognition: {
    mode: 'online' | 'offline' | 'auto';
    language: number;
    enableAutoSave: boolean;
    enableSmartCorrection: boolean;
  };
  
  // 录音设置
  audio: {
    enableNoiseSuppression: boolean;
    enableEchoCancellation: boolean;
    enableAutoGainControl: boolean;
    sampleRate: number;
  };
  
  // 界面设置
  ui: {
    theme: 'light' | 'dark' | 'auto';
    showShortcuts: boolean;
    showWordCount: boolean;
  };
  
  // 历史记录设置
  history: {
    maxItems: number;
    autoSave: boolean;
  };
}

const STORAGE_KEY = 'voice-input-settings';

const DEFAULT_SETTINGS: AppSettings = {
  recognition: {
    mode: 'auto',
    language: 15372,
    enableAutoSave: true,
    enableSmartCorrection: true,
  },
  audio: {
    enableNoiseSuppression: true,
    enableEchoCancellation: true,
    enableAutoGainControl: true,
    sampleRate: 16000,
  },
  ui: {
    theme: 'auto',
    showShortcuts: true,
    showWordCount: true,
  },
  history: {
    maxItems: 100,
    autoSave: true,
  },
};

export class SettingsManager {
  private settings: AppSettings;

  constructor() {
    this.settings = this.loadFromStorage();
  }

  /**
   * 从本地存储加载设置
   */
  private loadFromStorage(): AppSettings {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        // 合并默认设置，确保新增的设置项有默认值
        return this.mergeSettings(DEFAULT_SETTINGS, parsed);
      }
    } catch (error) {
      console.error('加载设置失败:', error);
    }
    return { ...DEFAULT_SETTINGS };
  }

  /**
   * 深度合并设置
   */
  private mergeSettings(defaults: any, overrides: any): any {
    const result = { ...defaults };
    for (const key in overrides) {
      if (overrides[key] !== undefined) {
        if (typeof overrides[key] === 'object' && overrides[key] !== null && !Array.isArray(overrides[key])) {
          result[key] = this.mergeSettings(defaults[key] || {}, overrides[key]);
        } else {
          result[key] = overrides[key];
        }
      }
    }
    return result;
  }

  /**
   * 保存到本地存储
   */
  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch (error) {
      console.error('保存设置失败:', error);
    }
  }

  /**
   * 获取所有设置
   */
  getSettings(): AppSettings {
    return { ...this.settings };
  }

  /**
   * 获取识别设置
   */
  getRecognitionSettings() {
    return { ...this.settings.recognition };
  }

  /**
   * 获取录音设置
   */
  getAudioSettings() {
    return { ...this.settings.audio };
  }

  /**
   * 获取界面设置
   */
  getUISettings() {
    return { ...this.settings.ui };
  }

  /**
   * 获取历史记录设置
   */
  getHistorySettings() {
    return { ...this.settings.history };
  }

  /**
   * 更新识别设置
   */
  updateRecognitionSettings(settings: Partial<AppSettings['recognition']>): void {
    this.settings.recognition = { ...this.settings.recognition, ...settings };
    this.saveToStorage();
  }

  /**
   * 更新录音设置
   */
  updateAudioSettings(settings: Partial<AppSettings['audio']>): void {
    this.settings.audio = { ...this.settings.audio, ...settings };
    this.saveToStorage();
  }

  /**
   * 更新界面设置
   */
  updateUISettings(settings: Partial<AppSettings['ui']>): void {
    this.settings.ui = { ...this.settings.ui, ...settings };
    this.saveToStorage();
  }

  /**
   * 更新历史记录设置
   */
  updateHistorySettings(settings: Partial<AppSettings['history']>): void {
    this.settings.history = { ...this.settings.history, ...settings };
    this.saveToStorage();
  }

  /**
   * 重置所有设置为默认值
   */
  resetToDefaults(): void {
    this.settings = { ...DEFAULT_SETTINGS };
    this.saveToStorage();
  }

  /**
   * 重置指定分类的设置为默认值
   */
  resetCategoryToDefaults(category: keyof AppSettings): void {
    const defaultCategory = DEFAULT_SETTINGS[category];
    (this.settings as any)[category] = { ...defaultCategory };
    this.saveToStorage();
  }
}

// 创建设置管理器实例
export function createSettingsManager(): SettingsManager {
  return new SettingsManager();
}