#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
添加coming_soon状态到数据库
"""

import paramiko
import sys

SERVER_IP = "119.29.37.208"
SERVER_USER = "root"
SERVER_PASSWORD = "119689Abc."
SERVER_PORT = 22

def add_status():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        print(f"[CONNECT] 连接服务器 {SERVER_USER}@{SERVER_IP}...")
        ssh.connect(SERVER_IP, SERVER_PORT, SERVER_USER, SERVER_PASSWORD, timeout=30)
        print("[OK] 已连接\n")

        # 先查看当前表结构
        print("=" * 80)
        print("[CHECK] 查看plugins表的status字段定义...")
        print("=" * 80)
        stdin, stdout, stderr = ssh.exec_command(
            """mysql -h 127.0.0.1 -P 13306 -u root -p119689Abc. smartapi_dev --default-character-set=utf8mb4 -e "
            SHOW COLUMNS FROM plugins LIKE 'status'
            " """,
            timeout=30
        )
        result = stdout.read().decode('utf-8')
        print(result)

        # 修改status字段，添加coming_soon选项
        print("\n" + "=" * 80)
        print("[ALTER] 添加coming_soon到status字段...")
        print("=" * 80)
        stdin, stdout, stderr = ssh.exec_command(
            """mysql -h 127.0.0.1 -P 13306 -u root -p119689Abc. smartapi_dev --default-character-set=utf8mb4 -e "
            ALTER TABLE plugins
            MODIFY COLUMN status ENUM('approved', 'pending', 'rejected', 'offline', 'coming_soon')
            DEFAULT 'offline'
            " """,
            timeout=30
        )
        result = stdout.read().decode('utf-8')
        err = stderr.read().decode('utf-8')
        if err and 'warning' not in err.lower():
            print(f"[ERROR] {err}")
        else:
            print("[OK] 字段修改完成")

        # 验证修改结果
        print("\n" + "=" * 80)
        print("[VERIFY] 验证修改结果...")
        print("=" * 80)
        stdin, stdout, stderr = ssh.exec_command(
            """mysql -h 127.0.0.1 -P 13306 -u root -p119689Abc. smartapi_dev --default-character-set=utf8mb4 -e "
            SHOW COLUMNS FROM plugins LIKE 'status'
            " """,
            timeout=30
        )
        result = stdout.read().decode('utf-8')
        print(result)

    except Exception as e:
        print(f"[ERROR] 操作失败: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        ssh.close()
        print("\n[DONE] 连接已关闭")

if __name__ == "__main__":
    add_status()
