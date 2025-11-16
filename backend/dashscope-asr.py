#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
DashScope ASR Service
用于 Node.js 调用的 Python 脚本
接受音频 URL，返回转写文本的 JSON
"""

import sys
import io
import json
from http import HTTPStatus
from dashscope.audio.asr import Transcription
import dashscope
import requests

# 设置 stdout 为 UTF-8 编码（Windows兼容）
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

def transcribe_audio(audio_url, api_key, model='paraformer-v2'):
    """
    转写音频文件
    """
    try:
        # 设置 API Key
        dashscope.api_key = api_key

        # 提交异步任务
        task_response = Transcription.async_call(
            model=model,
            file_urls=[audio_url],
            language_hints=['zh', 'en']
        )

        if task_response.status_code != HTTPStatus.OK:
            return {
                'success': False,
                'error': f'Task submission failed: {task_response.message}'
            }

        # 等待任务完成
        transcribe_response = Transcription.wait(task=task_response.output.task_id)

        if transcribe_response.status_code != HTTPStatus.OK:
            return {
                'success': False,
                'error': f'Task failed: {transcribe_response.message}'
            }

        # 获取结果
        results = transcribe_response.output.get('results', [])
        if not results:
            return {
                'success': False,
                'error': 'No results returned'
            }

        # 获取第一个结果的转写 URL
        transcription_url = results[0].get('transcription_url')
        if not transcription_url:
            return {
                'success': False,
                'error': 'No transcription URL in results'
            }

        # 下载转写结果
        resp = requests.get(transcription_url, timeout=30)
        if resp.status_code != 200:
            return {
                'success': False,
                'error': f'Failed to download transcription: HTTP {resp.status_code}'
            }

        transcription_data = resp.json()

        # 提取文本
        transcripts = transcription_data.get('transcripts', [])
        if not transcripts:
            return {
                'success': False,
                'error': 'No transcripts in transcription data'
            }

        text = transcripts[0].get('text', '')
        duration = transcription_data.get('properties', {}).get('original_duration_in_milliseconds', 0) / 1000

        return {
            'success': True,
            'text': text,
            'duration': duration,
            'task_id': task_response.output.task_id
        }

    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

if __name__ == '__main__':
    # 从命令行参数获取输入
    if len(sys.argv) < 3:
        print(json.dumps({
            'success': False,
            'error': 'Usage: python dashscope-asr.py <audio_url> <api_key> [model]'
        }))
        sys.exit(1)

    audio_url = sys.argv[1]
    api_key = sys.argv[2]
    model = sys.argv[3] if len(sys.argv) > 3 else 'paraformer-v2'

    result = transcribe_audio(audio_url, api_key, model)
    print(json.dumps(result, ensure_ascii=False))
