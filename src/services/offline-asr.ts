// 离线语音识别模块
// 封装 faster-whisper Python 脚本

import { invoke } from '@tauri-apps/api/core';

// 模型配置
export interface ModelConfig {
  name: string;
  size: string;
  description: string;
}

// 可用模型列表
export const AVAILABLE_MODELS: ModelConfig[] = [
  { name: "tiny", size: "tiny", description: "最小模型，速度快，准确率低" },
  { name: "base", size: "base", description: "基础模型，平衡速度和准确率" },
  { name: "small", size: "small", description: "小型模型，准确率较好" },
  { name: "medium", size: "medium", description: "中型模型，准确率高" },
  { name: "large-v3", size: "large-v3", description: "大型模型，准确率最高" },
];

// 识别结果
export interface OfflineASRResult {
  text: string;
  start: number;
  end: number;
  language: string;
  language_probability: number;
}

// 离线识别配置
export interface OfflineASRConfig {
  modelSize: string;
  device: 'cpu' | 'cuda' | 'auto';
  language?: string;
}

// 默认配置
const DEFAULT_CONFIG: OfflineASRConfig = {
  modelSize: 'medium',
  device: 'auto',
  language: undefined,
};

export class OfflineASR {
  private config: OfflineASRConfig;
  private isInitialized: boolean = false;

  constructor(config?: Partial<OfflineASRConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 初始化离线识别器
   */
  async initialize(): Promise<boolean> {
    try {
      // 检查Python环境和依赖
      const result = await invoke<boolean>('check_offline_asr_environment');
      this.isInitialized = result;
      return result;
    } catch (error) {
      console.error('初始化离线识别器失败:', error);
      this.isInitialized = false;
      return false;
    }
  }

  /**
   * 识别音频数据
   */
  async transcribe(audioData: Float32Array): Promise<OfflineASRResult[]> {
    if (!this.isInitialized) {
      throw new Error('离线识别器未初始化');
    }

    try {
      const results = await invoke<OfflineASRResult[]>('offline_transcribe', {
        audioData: Array.from(audioData),
        modelSize: this.config.modelSize,
        device: this.config.device,
        language: this.config.language,
      });
      return results;
    } catch (error) {
      console.error('离线识别失败:', error);
      throw error;
    }
  }

  /**
   * 识别音频文件
   */
  async transcribeFile(filePath: string): Promise<OfflineASRResult[]> {
    if (!this.isInitialized) {
      throw new Error('离线识别器未初始化');
    }

    try {
      const results = await invoke<OfflineASRResult[]>('offline_transcribe_file', {
        filePath,
        modelSize: this.config.modelSize,
        device: this.config.device,
        language: this.config.language,
      });
      return results;
    } catch (error) {
      console.error('文件识别失败:', error);
      throw error;
    }
  }

  /**
   * 获取配置
   */
  getConfig(): OfflineASRConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<OfflineASRConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 检查是否已初始化
   */
  getIsInitialized(): boolean {
    return this.isInitialized;
  }
}

// 创建离线识别器实例
export function createOfflineASR(config?: Partial<OfflineASRConfig>): OfflineASR {
  return new OfflineASR(config);
}