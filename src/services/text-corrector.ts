// 智能文本纠错模块
// 提供基础的文本纠错功能

// 常见错误词典
const COMMON_ERRORS: Record<string, string> = {
  // 同音字错误
  '的': '的', '地': '地', '得': '得',
  '在': '在', '再': '再',
  '做': '做', '作': '作',
  '他': '他', '她': '她', '它': '它',
  '那': '那', '哪': '哪',
  '有': '有', '又': '又',
  '是': '是', '事': '事',
  '不': '不', '步': '步',
  '一': '一', '以': '以',
  '个': '个', '各': '各',
  '到': '到', '道': '道',
  '会': '会', '回': '回',
  '对': '对', '队': '队',
  '就': '就', '久': '久',
  '说': '说', '所': '所',
  '这': '这', '着': '着',
  '没': '没', '美': '美',
  '也': '也', '业': '业',
  '和': '和', '合': '合',
  '被': '被', '倍': '倍',
  '把': '把', '吧': '吧',
  '让': '让', '人': '人',
  '从': '从', '丛': '丛',
  '还': '还', '孩': '孩',
  '能': '能', '呢': '呢',
  '要': '要', '么': '么',
  '都': '都', '度': '度',
  '但': '但', '蛋': '蛋',
  '很': '很', '恨': '恨',
  '只': '只', '知': '知',
  '去': '去', '趣': '趣',
  '出': '出', '初': '初',
  '过': '过', '国': '国',
  '可': '可', '科': '科',
  '里': '里', '理': '理',
  '年': '年', '念': '念',
  '时': '时', '十': '十',
  '为': '为', '位': '位',
  '下': '下', '吓': '吓',
  '想': '想', '响': '响',
  '样': '样', '养': '养',
  '用': '用', '永': '永',
  '于': '于', '鱼': '鱼',
  '中': '中', '钟': '钟',
  '自': '自', '字': '字',
  '走': '走', '揍': '揍',
  '最': '最', '罪': '罪',
  '作': '作', '做': '做',
};

// 常见词语纠错
const WORD_CORRECTIONS: Record<string, string> = {
  '人工智能': '人工智能',
  '机器学习': '机器学习',
  '深度学习': '深度学习',
  '自然语言处理': '自然语言处理',
  '计算机视觉': '计算机视觉',
  '语音识别': '语音识别',
  '语音合成': '语音合成',
  '机器翻译': '机器翻译',
  '知识图谱': '知识图谱',
  '大数据': '大数据',
  '云计算': '云计算',
  '物联网': '物联网',
  '区块链': '区块链',
  '虚拟现实': '虚拟现实',
  '增强现实': '增强现实',
  '混合现实': '混合现实',
  '元宇宙': '元宇宙',
  '数字孪生': '数字孪生',
  '边缘计算': '边缘计算',
  '量子计算': '量子计算',
};

// 标点符号修正
const PUNCTUATION_FIXES: Record<string, string> = {
  '，，': '，',
  '。。': '。',
  '、、': '、',
  '；；': '；',
  '：：': '：',
  '？？': '？',
  '！！': '！',
  '，。': '。',
  '。，': '，',
  ',,': ',',
  '..': '.',
  ';;': ';',
  '::': ':',
  '??': '?',
  '!!': '!',
  ',.': '.',
  '.,': ',',
};

export interface TextCorrectorConfig {
  enablePunctuationFix: boolean;
  enableWordCorrection: boolean;
  enableCharCorrection: boolean;
}

const DEFAULT_CONFIG: TextCorrectorConfig = {
  enablePunctuationFix: true,
  enableWordCorrection: true,
  enableCharCorrection: false, // 字符级纠错可能过于激进
};

export class TextCorrector {
  private config: TextCorrectorConfig;

  constructor(config?: Partial<TextCorrectorConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 纠正文本
   */
  correct(text: string): string {
    if (!text || text.trim().length === 0) {
      return text;
    }

    let corrected = text;

    // 1. 修正标点符号
    if (this.config.enablePunctuationFix) {
      corrected = this.fixPunctuation(corrected);
    }

    // 2. 修正词语
    if (this.config.enableWordCorrection) {
      corrected = this.fixWords(corrected);
    }

    // 3. 修正字符
    if (this.config.enableCharCorrection) {
      corrected = this.fixChars(corrected);
    }

    return corrected;
  }

  /**
   * 修正标点符号
   */
  private fixPunctuation(text: string): string {
    let fixed = text;
    for (const [error, correction] of Object.entries(PUNCTUATION_FIXES)) {
      fixed = fixed.replace(new RegExp(this.escapeRegex(error), 'g'), correction);
    }
    return fixed;
  }

  /**
   * 修正词语
   */
  private fixWords(text: string): string {
    let fixed = text;
    for (const [error, correction] of Object.entries(WORD_CORRECTIONS)) {
      fixed = fixed.replace(new RegExp(this.escapeRegex(error), 'g'), correction);
    }
    return fixed;
  }

  /**
   * 修正字符
   */
  private fixChars(text: string): string {
    // 字符级纠错需要更复杂的上下文分析
    // 这里只做简单的同音字替换示例
    return text;
  }

  /**
   * 转义正则表达式特殊字符
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * 获取配置
   */
  getConfig(): TextCorrectorConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<TextCorrectorConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// 创建文本纠错器实例
export function createTextCorrector(config?: Partial<TextCorrectorConfig>): TextCorrector {
  return new TextCorrector(config);
}