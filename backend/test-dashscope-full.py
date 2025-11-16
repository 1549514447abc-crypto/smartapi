#!/usr/bin/env python
# -*- coding: utf-8 -*-

import sys
import io
from http import HTTPStatus
from dashscope.audio.asr import Transcription
import dashscope
import json
import requests

# 设置输出编码为 UTF-8
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# 设置 API Key
dashscope.api_key = "sk-c873bc7bb5a74606a5e8bc92f04f3d38"

print("Testing DashScope Python SDK Async ASR (Full)")
print("=" * 50)

# 提交异步任务
print("\nSubmitting async task...")
task_response = Transcription.async_call(
    model='paraformer-v2',
    file_urls=['https://dashscope.oss-cn-beijing.aliyuncs.com/samples/audio/paraformer/hello_world_female2.wav'],
    language_hints=['zh', 'en']
)

print(f"Task ID: {task_response.output.task_id}")

if task_response.status_code != HTTPStatus.OK:
    print(f"[FAIL] Task submission failed: {task_response.message}")
    exit(1)

# 等待任务完成
print(f"Waiting for task completion...")
transcribe_response = Transcription.wait(task=task_response.output.task_id)

if transcribe_response.status_code == HTTPStatus.OK:
    print("[SUCCESS] Task completed!\n")

    # 获取结果
    results = transcribe_response.output.get('results', [])
    if results:
        for i, result in enumerate(results):
            print(f"\n--- Result {i+1} ---")
            transcription_url = result.get('transcription_url')

            if transcription_url:
                print(f"Downloading transcription from: {transcription_url[:80]}...")

                # 下载转写结果
                resp = requests.get(transcription_url)
                if resp.status_code == 200:
                    transcription_data = resp.json()
                    print("\nTranscription data:")
                    print(json.dumps(transcription_data, indent=2, ensure_ascii=False))

                    # 提取文本
                    if 'transcripts' in transcription_data:
                        for transcript in transcription_data['transcripts']:
                            print(f"\nRecognized text: {transcript.get('text', '')}")
                else:
                    print(f"Failed to download transcription: HTTP {resp.status_code}")

    print("\n" + "=" * 50)
    print("Test completed!")
else:
    print(f"[FAIL] Task failed: {transcribe_response.message}")
