#!/usr/bin/env python3
"""
离线语音识别模块
使用 faster-whisper 进行本地语音识别
"""

import sys
import json
import argparse
import numpy as np
from pathlib import Path

# 模型配置
MODEL_CONFIGS = {
    "tiny": {"size": "tiny", "description": "最小模型，速度快，准确率低"},
    "base": {"size": "base", "description": "基础模型，平衡速度和准确率"},
    "small": {"size": "small", "description": "小型模型，准确率较好"},
    "medium": {"size": "medium", "description": "中型模型，准确率高"},
    "large-v3": {"size": "large-v3", "description": "大型模型，准确率最高"},
}

class OfflineASR:
    """离线语音识别类"""
    
    def __init__(self, model_size="medium", device="auto", compute_type="auto"):
        """
        初始化离线识别器
        
        Args:
            model_size: 模型大小 (tiny/base/small/medium/large-v3)
            device: 计算设备 (cpu/cuda/auto)
            compute_type: 计算类型 (int8/float16/float32/auto)
        """
        self.model_size = model_size
        self.device = device
        self.compute_type = compute_type
        self.model = None
        
    def load_model(self):
        """加载模型"""
        try:
            from faster_whisper import WhisperModel
            
            print(f"正在加载 {self.model_size} 模型...", file=sys.stderr)
            
            self.model = WhisperModel(
                self.model_size,
                device=self.device,
                compute_type=self.compute_type
            )
            
            print(f"模型加载完成", file=sys.stderr)
            return True
            
        except ImportError:
            print("错误: 请先安装 faster-whisper: pip install faster-whisper", file=sys.stderr)
            return False
        except Exception as e:
            print(f"模型加载失败: {e}", file=sys.stderr)
            return False
    
    def transcribe(self, audio_data, sample_rate=16000, language=None):
        """
        识别音频数据
        
        Args:
            audio_data: 音频数据 (numpy array)
            sample_rate: 采样率
            language: 语言代码 (zh/en/auto)
            
        Returns:
            识别结果列表
        """
        if self.model is None:
            if not self.load_model():
                return []
        
        try:
            # 如果采样率不是16000，需要重采样
            if sample_rate != 16000:
                from scipy.signal import resample
                num_samples = int(len(audio_data) * 16000 / sample_rate)
                audio_data = resample(audio_data, num_samples)
            
            # 确保音频数据是float32格式
            if audio_data.dtype != np.float32:
                audio_data = audio_data.astype(np.float32)
            
            # 归一化音频数据
            if np.max(np.abs(audio_data)) > 1.0:
                audio_data = audio_data / np.max(np.abs(audio_data))
            
            # 识别
            segments, info = self.model.transcribe(
                audio_data,
                language=language,
                beam_size=5,
                vad_filter=True,
                vad_parameters=dict(
                    min_silence_duration_ms=500,
                    speech_pad_ms=200
                )
            )
            
            # 收集结果
            results = []
            for segment in segments:
                results.append({
                    "text": segment.text.strip(),
                    "start": segment.start,
                    "end": segment.end,
                    "language": info.language,
                    "language_probability": info.language_probability
                })
            
            return results
            
        except Exception as e:
            print(f"识别失败: {e}", file=sys.stderr)
            return []
    
    def transcribe_file(self, audio_path, language=None):
        """
        识别音频文件
        
        Args:
            audio_path: 音频文件路径
            language: 语言代码
            
        Returns:
            识别结果列表
        """
        if self.model is None:
            if not self.load_model():
                return []
        
        try:
            segments, info = self.model.transcribe(
                audio_path,
                language=language,
                beam_size=5,
                vad_filter=True
            )
            
            results = []
            for segment in segments:
                results.append({
                    "text": segment.text.strip(),
                    "start": segment.start,
                    "end": segment.end,
                    "language": info.language,
                    "language_probability": info.language_probability
                })
            
            return results
            
        except Exception as e:
            print(f"文件识别失败: {e}", file=sys.stderr)
            return []


def main():
    """主函数"""
    parser = argparse.ArgumentParser(description="离线语音识别")
    parser.add_argument("--model", default="medium", choices=MODEL_CONFIGS.keys(),
                        help="模型大小")
    parser.add_argument("--device", default="auto", choices=["cpu", "cuda", "auto"],
                        help="计算设备")
    parser.add_argument("--language", default=None, help="语言代码 (zh/en)")
    parser.add_argument("--file", help="音频文件路径")
    parser.add_argument("--list-models", action="store_true", help="列出可用模型")
    
    args = parser.parse_args()
    
    # 列出模型
    if args.list_models:
        print("可用模型:")
        for name, config in MODEL_CONFIGS.items():
            print(f"  {name}: {config['description']}")
        return
    
    # 创建识别器
    asr = OfflineASR(
        model_size=args.model,
        device=args.device
    )
    
    # 识别文件
    if args.file:
        results = asr.transcribe_file(args.file, language=args.language)
        print(json.dumps(results, ensure_ascii=False, indent=2))
        return
    
    # 从stdin读取音频数据
    try:
        audio_data = np.frombuffer(sys.stdin.buffer.read(), dtype=np.float32)
        results = asr.transcribe(audio_data, language=args.language)
        print(json.dumps(results, ensure_ascii=False, indent=2))
    except KeyboardInterrupt:
        pass
    except Exception as e:
        print(f"错误: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()