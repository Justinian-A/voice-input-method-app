// 百度语音识别API配置
export interface BaiduASRConfig {
  appId: number;
  apiKey: string;
  secretKey: string;
  devPid: number;
  sampleRate: number;
}

// 语言配置
export interface LanguageConfig {
  code: number;
  name: string;
  description: string;
}

// 支持的语言
export const SUPPORTED_LANGUAGES: LanguageConfig[] = [
  { code: 15372, name: '普通话（加强标点）', description: '中文普通话，支持中英文混合' },
  { code: 1537, name: '普通话（弱标点）', description: '中文普通话' },
  { code: 1737, name: '英语', description: '英文识别' },
  { code: 15376, name: '中文多方言', description: '支持多种中文方言' },
];

// 从环境变量读取配置
export function getBaiduASRConfig(): BaiduASRConfig {
  const appId = import.meta.env.VITE_BAIDU_APP_ID;
  const apiKey = import.meta.env.VITE_BAIDU_API_KEY;
  const secretKey = import.meta.env.VITE_BAIDU_SECRET_KEY;
  const devPid = import.meta.env.VITE_BAIDU_DEV_PID || '15372';
  const sampleRate = import.meta.env.VITE_SAMPLE_RATE || '16000';

  // 如果没有配置API密钥，返回默认配置（用于界面展示）
  if (!appId || !apiKey || !secretKey) {
    console.warn('百度语音识别API配置缺失，使用默认配置。请在 .env 文件中配置 API 密钥。');
    return defaultConfig;
  }

  return {
    appId: parseInt(appId, 10),
    apiKey,
    secretKey,
    devPid: parseInt(devPid, 10),
    sampleRate: parseInt(sampleRate, 10),
  };
}

// 默认配置（用于开发测试）
export const defaultConfig: BaiduASRConfig = {
  appId: 0,
  apiKey: '',
  secretKey: '',
  devPid: 15372, // 普通话+加强标点，支持中英文混合
  sampleRate: 16000,
};