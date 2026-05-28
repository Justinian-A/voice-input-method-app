// 语音识别服务入口
export { BaiduASR, createBaiduASR } from './baidu-asr';
export type { ASRResult, ASRResultCallback, ASRErrorCallback } from './baidu-asr';

export { AudioRecorder, createAudioRecorder } from './audio-recorder';
export type { AudioRecorderConfig, AudioDataCallback } from './audio-recorder';
export { float32ToPCM16, float32ToArrayBuffer } from './audio-recorder';

export { getBaiduASRConfig, defaultConfig, SUPPORTED_LANGUAGES } from './config';
export type { BaiduASRConfig, LanguageConfig } from './config';

export { OfflineASR, createOfflineASR, AVAILABLE_MODELS } from './offline-asr';
export type { OfflineASRResult, OfflineASRConfig, ModelConfig } from './offline-asr';

export { TextCorrector, createTextCorrector } from './text-corrector';
export type { TextCorrectorConfig } from './text-corrector';

export { HistoryManager, createHistoryManager } from './history';
export type { HistoryItem, HistoryStorage } from './history';

export { SettingsManager, createSettingsManager } from './settings';
export type { AppSettings } from './settings';

// 语音识别管理器
import { BaiduASR, createBaiduASR } from './baidu-asr';
import { AudioRecorder, createAudioRecorder, float32ToArrayBuffer } from './audio-recorder';
import { type BaiduASRConfig } from './config';
import { OfflineASR, createOfflineASR } from './offline-asr';
import type { OfflineASRConfig } from './offline-asr';
import { TextCorrector, createTextCorrector } from './text-corrector';
import type { TextCorrectorConfig } from './text-corrector';

export interface VoiceRecognitionManagerConfig {
  baiduASR?: Partial<BaiduASRConfig>;
  offlineASR?: Partial<OfflineASRConfig>;
  textCorrector?: Partial<TextCorrectorConfig>;
  audioRecorder?: {
    sampleRate?: number;
    bufferSize?: number;
  };
  mode?: 'online' | 'offline' | 'auto';
}

export type RecognitionResultCallback = (text: string, isFinal: boolean) => void;
export type RecognitionErrorCallback = (error: Error) => void;

export class VoiceRecognitionManager {
  private asr: BaiduASR;
  private offlineASR: OfflineASR;
  private textCorrector: TextCorrector;
  private recorder: AudioRecorder;
  private isRunning: boolean = false;
  private mode: 'online' | 'offline' | 'auto';
  private currentMode: 'online' | 'offline' = 'online';
  private onResult: RecognitionResultCallback | null = null;
  private onError: RecognitionErrorCallback | null = null;

  constructor(config?: VoiceRecognitionManagerConfig) {
    this.asr = createBaiduASR(config?.baiduASR);
    this.offlineASR = createOfflineASR(config?.offlineASR);
    this.textCorrector = createTextCorrector(config?.textCorrector);
    this.recorder = createAudioRecorder({
      sampleRate: config?.audioRecorder?.sampleRate || 16000,
      bufferSize: config?.audioRecorder?.bufferSize || 4096,
    });
    this.mode = config?.mode || 'auto';
  }

  /**
   * 初始化离线识别器
   */
  async initializeOffline(): Promise<boolean> {
    return await this.offlineASR.initialize();
  }

  /**
   * 开始语音识别
   */
  async start(
    onResult: RecognitionResultCallback,
    onError: RecognitionErrorCallback
  ): Promise<void> {
    if (this.isRunning) {
      console.warn('语音识别已在运行中');
      return;
    }

    this.onResult = onResult;
    this.onError = onError;

    try {
      // 根据模式选择识别方式
      if (this.mode === 'offline' || (this.mode === 'auto' && !navigator.onLine)) {
        // 离线模式
        await this.startOfflineRecognition();
      } else {
        // 在线模式
        await this.startOnlineRecognition();
      }

      this.isRunning = true;
      console.log(`语音识别已启动 (${this.currentMode}模式)`);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error('启动语音识别失败:', err);
      this.onError?.(err);
      throw err;
    }
  }

  /**
   * 启动在线识别
   */
  private async startOnlineRecognition(): Promise<void> {
    // 启动百度语音识别
    await this.asr.start(
      (result) => {
        if (result.err_no !== 0) {
          const error = new Error(`识别错误: ${result.err_msg} (${result.err_no})`);
          this.onError?.(error);
          return;
        }

        const isFinal = result.type === 'FIN_TEXT';
        // 应用文本纠错
        const correctedText = this.textCorrector.correct(result.result);
        this.onResult?.(correctedText, isFinal);
      },
      (error) => {
        console.error('ASR错误:', error);
        this.onError?.(error);
      }
    );

    // 启动录音
    await this.recorder.start(
      (audioData) => {
        // 将Float32Array转换为PCM ArrayBuffer并发送
        const pcmBuffer = float32ToArrayBuffer(audioData);
        this.asr.sendAudio(pcmBuffer);
      },
      (error) => {
        console.error('录音错误:', error);
        this.onError?.(error);
      }
    );

    this.currentMode = 'online';
  }

  /**
   * 启动离线识别
   */
  private async startOfflineRecognition(): Promise<void> {
    // 初始化离线识别器
    const initialized = await this.offlineASR.initialize();
    if (!initialized) {
      throw new Error('离线识别器初始化失败');
    }

    // 启动录音
    await this.recorder.start(
      async (audioData) => {
        try {
          // 离线识别需要累积一定长度的音频数据
          // 这里简化处理，实际应该实现流式识别
          const results = await this.offlineASR.transcribe(audioData);
          for (const result of results) {
            // 应用文本纠错
            const correctedText = this.textCorrector.correct(result.text);
            this.onResult?.(correctedText, true);
          }
        } catch (error) {
          console.error('离线识别错误:', error);
          this.onError?.(error instanceof Error ? error : new Error(String(error)));
        }
      },
      (error) => {
        console.error('录音错误:', error);
        this.onError?.(error);
      }
    );

    this.currentMode = 'offline';
  }

  /**
   * 停止语音识别
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.recorder.stop();
    
    if (this.currentMode === 'online') {
      this.asr.stop();
    }
    
    this.isRunning = false;
    console.log('语音识别已停止');
  }

  /**
   * 取消语音识别
   */
  cancel(): void {
    if (!this.isRunning) {
      return;
    }

    this.recorder.stop();
    
    if (this.currentMode === 'online') {
      this.asr.cancel();
    }
    
    this.isRunning = false;
    console.log('语音识别已取消');
  }

  /**
   * 检查运行状态
   */
  getIsRunning(): boolean {
    return this.isRunning;
  }

  /**
   * 获取当前模式
   */
  getCurrentMode(): 'online' | 'offline' {
    return this.currentMode;
  }

  /**
   * 获取ASR配置
   */
  getASRConfig(): BaiduASRConfig {
    return this.asr.getConfig();
  }

  /**
   * 获取离线识别配置
   */
  getOfflineASRConfig(): OfflineASRConfig {
    return this.offlineASR.getConfig();
  }
}

// 创建语音识别管理器
export function createVoiceRecognitionManager(
  config?: VoiceRecognitionManagerConfig
): VoiceRecognitionManager {
  return new VoiceRecognitionManager(config);
}