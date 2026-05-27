// 音频录制模块
// 使用Web Audio API从麦克风采集PCM音频数据

export interface AudioRecorderConfig {
  sampleRate: number;
  bufferSize: number;
  channels: number;
  enableNoiseSuppression: boolean;
  enableEchoCancellation: boolean;
  enableAutoGainControl: boolean;
}

export type AudioDataCallback = (data: Float32Array) => void;
export type AudioErrorCallback = (error: Error) => void;

export class AudioRecorder {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private config: AudioRecorderConfig;
  private isRecording: boolean = false;
  private onAudioData: AudioDataCallback | null = null;
  private onError: AudioErrorCallback | null = null;

  constructor(config?: Partial<AudioRecorderConfig>) {
    this.config = {
      sampleRate: config?.sampleRate || 16000,
      bufferSize: config?.bufferSize || 4096,
      channels: config?.channels || 1,
      enableNoiseSuppression: config?.enableNoiseSuppression ?? true,
      enableEchoCancellation: config?.enableEchoCancellation ?? true,
      enableAutoGainControl: config?.enableAutoGainControl ?? true,
    };
  }

  /**
   * 开始录音
   */
  async start(
    onAudioData: AudioDataCallback,
    onError: AudioErrorCallback
  ): Promise<void> {
    try {
      this.onAudioData = onAudioData;
      this.onError = onError;

      // 请求麦克风权限
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.config.sampleRate,
          channelCount: this.config.channels,
          echoCancellation: this.config.enableEchoCancellation,
          noiseSuppression: this.config.enableNoiseSuppression,
          autoGainControl: this.config.enableAutoGainControl,
        },
      });

      // 创建音频上下文
      this.audioContext = new AudioContext({
        sampleRate: this.config.sampleRate,
      });

      // 创建音频源
      this.source = this.audioContext.createMediaStreamSource(this.mediaStream);

      // 创建音频处理器
      this.processor = this.audioContext.createScriptProcessor(
        this.config.bufferSize,
        this.config.channels,
        this.config.channels
      );

      // 处理音频数据
      this.processor.onaudioprocess = (event: AudioProcessingEvent) => {
        if (!this.isRecording) return;

        const inputData = event.inputBuffer.getChannelData(0);
        // 复制数据，避免引用问题
        const audioData = new Float32Array(inputData.length);
        audioData.set(inputData);
        
        this.onAudioData?.(audioData);
      };

      // 连接音频节点
      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);

      this.isRecording = true;
      console.log('录音已开始');
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error('启动录音失败:', err);
      this.onError?.(err);
      throw err;
    }
  }

  /**
   * 停止录音
   */
  stop(): void {
    this.isRecording = false;

    // 断开音频连接
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }

    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }

    // 停止媒体流
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    // 关闭音频上下文
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    console.log('录音已停止');
  }

  /**
   * 检查录音状态
   */
  getIsRecording(): boolean {
    return this.isRecording;
  }

  /**
   * 获取当前配置
   */
  getConfig(): AudioRecorderConfig {
    return { ...this.config };
  }
}

// 将Float32Array转换为PCM 16bit格式
export function float32ToPCM16(float32Array: Float32Array): Int16Array {
  const pcm16 = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return pcm16;
}

// 将Float32Array转换为ArrayBuffer（PCM 16bit）
export function float32ToArrayBuffer(float32Array: Float32Array): ArrayBuffer {
  const pcm16 = float32ToPCM16(float32Array);
  return pcm16.buffer;
}

// 创建默认录音器
export function createAudioRecorder(
  config?: Partial<AudioRecorderConfig>
): AudioRecorder {
  return new AudioRecorder(config);
}