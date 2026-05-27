// 百度语音识别API封装
import { type BaiduASRConfig, getBaiduASRConfig } from './config';

// 识别结果类型
export interface ASRResult {
  err_no: number;
  err_msg: string;
  type: 'MID_TEXT' | 'FIN_TEXT' | 'HEARTBEAT';
  result: string;
  start_time?: number;
  end_time?: number;
  log_id: number;
  sn: string;
}

// 识别回调函数类型
export type ASRResultCallback = (result: ASRResult) => void;
export type ASRErrorCallback = (error: Error) => void;

// 生成UUID
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export class BaiduASR {
  private ws: WebSocket | null = null;
  private config: BaiduASRConfig;
  private sn: string;
  private onResult: ASRResultCallback | null = null;
  private onError: ASRErrorCallback | null = null;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 3;
  private reconnectDelay: number = 1000;

  constructor(config?: Partial<BaiduASRConfig>) {
    const defaultConfig = getBaiduASRConfig();
    this.config = { ...defaultConfig, ...config };
    this.sn = generateUUID();
  }

  /**
   * 建立WebSocket连接并开始识别
   */
  async start(
    onResult: ASRResultCallback,
    onError: ASRErrorCallback
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this.onResult = onResult;
      this.onError = onError;

      const wsUrl = `wss://vop.baidu.com/realtime_asr?sn=${this.sn}`;
      
      try {
        this.ws = new WebSocket(wsUrl);
      } catch (error) {
        reject(new Error(`创建WebSocket失败: ${error}`));
        return;
      }

      this.ws.onopen = () => {
        console.log('WebSocket连接已建立');
        this.isConnected = true;
        
        // 发送开始参数帧
        const startFrame = {
          type: 'START',
          data: {
            appid: this.config.appId,
            appkey: this.config.apiKey,
            dev_pid: this.config.devPid,
            cuid: 'tauri-desktop-client',
            format: 'pcm',
            sample: this.config.sampleRate,
          },
        };
        
        this.ws?.send(JSON.stringify(startFrame));
        resolve();
      };

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          const result: ASRResult = JSON.parse(event.data as string);
          
          // 忽略心跳帧
          if (result.type === 'HEARTBEAT') {
            return;
          }
          
          this.onResult?.(result);
        } catch (error) {
          console.error('解析识别结果失败:', error);
        }
      };

      this.ws.onerror = (error: Event) => {
        console.error('WebSocket错误:', error);
        this.isConnected = false;
        const err = new Error('WebSocket连接错误');
        this.onError?.(err);
        
        // 尝试重连
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          console.log(`尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
          setTimeout(() => {
            this.start(this.onResult!, this.onError!).catch(() => {
              // 重连失败，不再尝试
            });
          }, this.reconnectDelay * this.reconnectAttempts);
        } else {
          reject(err);
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket连接已关闭');
        this.isConnected = false;
      };
    });
  }

  /**
   * 发送音频数据
   * @param audioData PCM音频数据（ArrayBuffer或Uint8Array）
   */
  sendAudio(audioData: ArrayBuffer | Uint8Array): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(audioData);
    } else {
      console.warn('WebSocket未连接，无法发送音频数据');
    }
  }

  /**
   * 发送结束帧并关闭连接
   */
  stop(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const finishFrame = { type: 'FINISH' };
      this.ws.send(JSON.stringify(finishFrame));
      
      // 等待服务端处理完成后关闭
      setTimeout(() => {
        this.ws?.close();
        this.isConnected = false;
        this.reconnectAttempts = 0;
      }, 1000);
    }
  }

  /**
   * 取消识别
   */
  cancel(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const cancelFrame = { type: 'CANCEL' };
      this.ws.send(JSON.stringify(cancelFrame));
      this.ws.close();
      this.isConnected = false;
      this.reconnectAttempts = 0;
    }
  }

  /**
   * 检查连接状态
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * 获取当前配置
   */
  getConfig(): BaiduASRConfig {
    return { ...this.config };
  }
}

// 创建默认实例
export function createBaiduASR(config?: Partial<BaiduASRConfig>): BaiduASR {
  return new BaiduASR(config);
}