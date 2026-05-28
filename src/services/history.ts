// 历史记录管理模块

export interface HistoryItem {
  id: string;
  text: string;
  timestamp: number;
  mode: 'online' | 'offline';
  language: string;
  duration: number; // 录音时长（秒）
}

export interface HistoryStorage {
  items: HistoryItem[];
  maxItems: number;
}

const STORAGE_KEY = 'voice-input-history';
const DEFAULT_MAX_ITEMS = 100;

export class HistoryManager {
  private storage: HistoryStorage;

  constructor(maxItems: number = DEFAULT_MAX_ITEMS) {
    this.storage = this.loadFromStorage(maxItems);
  }

  /**
   * 从本地存储加载历史记录
   */
  private loadFromStorage(maxItems: number): HistoryStorage {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        return {
          items: parsed.items || [],
          maxItems: maxItems,
        };
      }
    } catch (error) {
      console.error('加载历史记录失败:', error);
    }
    return { items: [], maxItems };
  }

  /**
   * 保存到本地存储
   */
  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.storage));
    } catch (error) {
      console.error('保存历史记录失败:', error);
    }
  }

  /**
   * 添加历史记录
   */
  add(text: string, mode: 'online' | 'offline', language: string, duration: number): HistoryItem {
    const item: HistoryItem = {
      id: this.generateId(),
      text: text.trim(),
      timestamp: Date.now(),
      mode,
      language,
      duration,
    };

    // 添加到列表开头
    this.storage.items.unshift(item);

    // 限制最大数量
    if (this.storage.items.length > this.storage.maxItems) {
      this.storage.items = this.storage.items.slice(0, this.storage.maxItems);
    }

    this.saveToStorage();
    return item;
  }

  /**
   * 获取所有历史记录
   */
  getAll(): HistoryItem[] {
    return [...this.storage.items];
  }

  /**
   * 根据ID获取历史记录
   */
  getById(id: string): HistoryItem | undefined {
    return this.storage.items.find(item => item.id === id);
  }

  /**
   * 删除历史记录
   */
  delete(id: string): boolean {
    const index = this.storage.items.findIndex(item => item.id === id);
    if (index !== -1) {
      this.storage.items.splice(index, 1);
      this.saveToStorage();
      return true;
    }
    return false;
  }

  /**
   * 清空历史记录
   */
  clear(): void {
    this.storage.items = [];
    this.saveToStorage();
  }

  /**
   * 搜索历史记录
   */
  search(query: string): HistoryItem[] {
    const lowerQuery = query.toLowerCase();
    return this.storage.items.filter(item =>
      item.text.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * 获取最近N条记录
   */
  getRecent(count: number): HistoryItem[] {
    return this.storage.items.slice(0, count);
  }

  /**
   * 获取记录总数
   */
  getCount(): number {
    return this.storage.items.length;
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 格式化时间戳
   */
  static formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    // 今天内
    if (diff < 24 * 60 * 60 * 1000 && date.getDate() === now.getDate()) {
      return `今天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    }

    // 昨天
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.getDate() === yesterday.getDate() && 
        date.getMonth() === yesterday.getMonth() && 
        date.getFullYear() === yesterday.getFullYear()) {
      return `昨天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    }

    // 更早
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }

  /**
   * 格式化时长
   */
  static formatDuration(seconds: number): string {
    if (seconds < 60) {
      return `${seconds}秒`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}分${remainingSeconds}秒`;
  }

  /**
   * 获取语言显示名称
   */
  static getLanguageName(languageCode: string): string {
    const languageMap: Record<string, string> = {
      '15372': '普通话',
      '1537': '普通话',
      '1737': '英语',
      '15376': '多方言',
    };
    return languageMap[languageCode] || languageCode;
  }
}

// 创建历史记录管理器实例
export function createHistoryManager(maxItems?: number): HistoryManager {
  return new HistoryManager(maxItems);
}