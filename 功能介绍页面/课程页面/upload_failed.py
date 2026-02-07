import paramiko
import os
import time

def format_size(size_bytes):
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size_bytes < 1024:
            return f"{size_bytes:.2f} {unit}"
        size_bytes /= 1024
    return f"{size_bytes:.2f} TB"

server_config = {
    'ip': '119.29.37.208',
    'user': 'root',
    'password': '119689Abc.',
    'remote_path': '/root/smart-api-video'
}

local_dir = r'D:\code-program\smartapi\功能介绍页面\课程页面'

# 失败的文件列表
failed_files = [

    '第三节.mp4'
]

print("重新上传失败的文件")
print("=" * 50)

for i, file_name in enumerate(failed_files, 1):
    local_file = os.path.join(local_dir, file_name)
    file_size = os.path.getsize(local_file)
    remote_file = f"{server_config['remote_path']}/{file_name}"

    print(f"\n[{i}/{len(failed_files)}] 上传: {file_name} ({format_size(file_size)})")

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        print(f"  连接服务器...")
        ssh.connect(
            server_config['ip'],
            username=server_config['user'],
            password=server_config['password'],
            timeout=60
        )

        transport = ssh.get_transport()
        transport.set_keepalive(30)

        ssh.exec_command(f'mkdir -p {server_config["remote_path"]}')
        time.sleep(0.5)

        sftp = ssh.open_sftp()
        sftp.get_channel().settimeout(None)

        start_time = time.time()
        last_percent = [0]

        def progress(transferred, total):
            percent = int((transferred / total) * 100)
            if percent >= last_percent[0] + 10:
                elapsed = time.time() - start_time
                speed = transferred / elapsed if elapsed > 0 else 0
                print(f"  进度: {percent}% ({format_size(speed)}/s)")
                last_percent[0] = percent

        sftp.put(local_file, remote_file, callback=progress)
        elapsed = time.time() - start_time
        speed = file_size / elapsed if elapsed > 0 else 0
        print(f"  ✓ 完成 (耗时: {elapsed:.1f}秒, 速度: {format_size(speed)}/s)")

        sftp.close()

    except Exception as e:
        print(f"  ✗ 失败: {e}")

    finally:
        ssh.close()

print("\n上传完成！")
