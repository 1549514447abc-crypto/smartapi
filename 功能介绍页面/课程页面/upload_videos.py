import paramiko
import os
import time

class VideoUploader:
    def __init__(self, server_config):
        self.server_config = server_config

    def format_size(self, size_bytes):
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size_bytes < 1024:
                return f"{size_bytes:.2f} {unit}"
            size_bytes /= 1024
        return f"{size_bytes:.2f} TB"

    def upload_videos(self, local_dir):
        # 获取视频文件
        video_files = [f for f in os.listdir(local_dir) if f.endswith('.mp4')]

        if not video_files:
            print("未找到任何视频文件！")
            return

        total_size = sum(os.path.getsize(os.path.join(local_dir, f)) for f in video_files)
        print(f"找到 {len(video_files)} 个视频文件，总大小: {self.format_size(total_size)}")

        # 上传每个文件（每个文件单独连接，避免超时）
        for i, file_name in enumerate(video_files, 1):
            local_file = os.path.join(local_dir, file_name)
            file_size = os.path.getsize(local_file)

            print(f"\n[{i}/{len(video_files)}] 上传: {file_name} ({self.format_size(file_size)})")

            # 每个文件单独建立连接
            ssh = paramiko.SSHClient()
            ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

            try:
                print(f"  连接服务器...")
                ssh.connect(
                    self.server_config['ip'],
                    username=self.server_config['user'],
                    password=self.server_config['password'],
                    timeout=60
                )

                # 设置保活
                transport = ssh.get_transport()
                transport.set_keepalive(30)

                # 确保远程目录存在
                remote_path = self.server_config['remote_path']
                ssh.exec_command(f'mkdir -p {remote_path}')
                time.sleep(0.5)

                sftp = ssh.open_sftp()
                sftp.get_channel().settimeout(None)  # 无超时

                remote_file = f"{remote_path}/{file_name}"
                start_time = time.time()
                last_percent = [0]

                def progress(transferred, total):
                    percent = int((transferred / total) * 100)
                    if percent >= last_percent[0] + 10:
                        elapsed = time.time() - start_time
                        speed = transferred / elapsed if elapsed > 0 else 0
                        print(f"  进度: {percent}% ({self.format_size(speed)}/s)")
                        last_percent[0] = percent

                sftp.put(local_file, remote_file, callback=progress)
                elapsed = time.time() - start_time
                speed = file_size / elapsed if elapsed > 0 else 0
                print(f"  ✓ 完成 (耗时: {elapsed:.1f}秒, 速度: {self.format_size(speed)}/s)")

                sftp.close()

            except Exception as e:
                print(f"  ✗ 失败: {e}")

            finally:
                ssh.close()

        # 最后列出远程目录
        print(f"\n检查远程目录内容...")
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        try:
            ssh.connect(
                self.server_config['ip'],
                username=self.server_config['user'],
                password=self.server_config['password'],
                timeout=30
            )
            stdin, stdout, stderr = ssh.exec_command(f'ls -lh {self.server_config["remote_path"]}')
            print(stdout.read().decode('utf-8'))
            ssh.close()
        except Exception as e:
            print(f"无法列出远程目录: {e}")

        print("\n上传完成！")


if __name__ == "__main__":
    server_config = {
        'ip': '119.29.37.208',
        'user': 'root',
        'password': '119689Abc.',
        'remote_path': '/root/smart-api-video'
    }

    local_dir = r'D:\code-program\smartapi\功能介绍页面\课程页面'

    uploader = VideoUploader(server_config)
    uploader.upload_videos(local_dir)
