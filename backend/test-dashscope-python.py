#!/usr/bin/env python
# -*- coding: utf-8 -*-

import sys
import io
from http import HTTPStatus
from dashscope.audio.asr import Transcription
import dashscope
import json

# 设置输出编码为 UTF-8
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# 设置 API Key
dashscope.api_key = "sk-c873bc7bb5a74606a5e8bc92f04f3d38"

print("Testing DashScope Python SDK Async ASR")
print("=" * 50)

# 提交异步任务
print("\nSubmitting async task...")
task_response = Transcription.async_call(
    model='paraformer-v2',
    file_urls=['https://dashscope.oss-cn-beijing.aliyuncs.com/samples/audio/paraformer/hello_world_female2.wav'],
    language_hints=['zh', 'en']
)

print(f"Task status code: {task_response.status_code}")
print(f"Task ID: {task_response.output.task_id if task_response.output else 'N/A'}")

if task_response.status_code != HTTPStatus.OK:
    print(f"[FAIL] Task submission failed")
    print(f"Error message: {task_response.message}")
    print(f"Full response: {json.dumps(task_response.output, indent=2, ensure_ascii=False)}")
    exit(1)

# 等待任务完成
print(f"\nWaiting for task completion (task_id: {task_response.output.task_id})...")
transcribe_response = Transcription.wait(task=task_response.output.task_id)

print(f"\nTask completion status code: {transcribe_response.status_code}")

if transcribe_response.status_code == HTTPStatus.OK:
    print("[SUCCESS] DashScope Python SDK test passed!\n")
    print("Recognition result:")
    print(json.dumps(transcribe_response.output, indent=4, ensure_ascii=False))
    print("\n" + "=" * 50)
    print("Transcription done!")
else:
    print(f"[FAIL] Task failed")
    print(f"Error message: {transcribe_response.message}")
    print(f"Full response: {json.dumps(transcribe_response.output, indent=2, ensure_ascii=False)}")
