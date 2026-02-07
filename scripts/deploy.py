#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SmartAPI 一键部署脚本

使用方法:
    python scripts/deploy.py              # 交互式选择
    python scripts/deploy.py all          # 部署全部
    python scripts/deploy.py frontend     # 只部署前端
    python scripts/deploy.py backend      # 只部署后端
    python scripts/deploy.py admin        # 只部署管理后台

依赖安装:
    pip install paramiko
"""

import os
import sys
import subprocess
import tarfile
import io
from pathlib import Path

try:
    import paramiko
except ImportError:
    print("错误: 请先安装 paramiko")
    print("运行: pip install paramiko")
    sys.exit(1)

# ==================== 配置 ====================

SERVER_IP = "119.29.37.208"
SERVER_USER = "root"
SERVER_PASSWORD = "119689Abc."
SERVER_PORT = 22  # SSH端口（443已用于HTTPS）

PROJECT_DIR = Path(__file__).parent.parent.absolute()
FRONTEND_DIR = PROJECT_DIR / "frontend"
BACKEND_DIR = PROJECT_DIR / "backend"
ADMIN_DIR = PROJECT_DIR / "admin"

REMOTE_FRONTEND = "/www/smartapi-web"
REMOTE_BACKEND = "/www/smartapi"
REMOTE_ADMIN = "/www/smartapi-admin"

# ==================== 工具函数 ====================

class Colors:
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    RESET = '\033[0m'
    BOLD = '\033[1m'

def log(msg, color=Colors.RESET):
    print(f"{color}{msg}{Colors.RESET}")

def log_step(step, msg):
    print(f"\n{Colors.BOLD}[{step}] {msg}{Colors.RESET}")

def log_success(msg):
    print(f"{Colors.GREEN}[OK] {msg}{Colors.RESET}")

def log_error(msg):
    print(f"{Colors.RED}[ERROR] {msg}{Colors.RESET}")

def run_cmd(cmd, cwd=None, show=True):
    """运行本地命令"""
    if show:
        log(f"  > {cmd}", Colors.BLUE)
    result = subprocess.run(cmd, shell=True, cwd=cwd, capture_output=True, text=True, encoding='utf-8', errors='replace')
    if result.returncode != 0 and show:
        log_error(result.stderr[:500] if result.stderr else 'Unknown error')
    return result.returncode == 0

def create_tar(source_dir, exclude=None):
    """创建 tar.gz 到内存"""
    exclude = exclude or []
    buffer = io.BytesIO()

    with tarfile.open(fileobj=buffer, mode='w:gz') as tar:
        for item in Path(source_dir).rglob('*'):
            if item.is_file():
                rel_path = item.relative_to(source_dir)
                skip = any(ex in str(rel_path) for ex in exclude)
                if not skip:
                    tar.add(str(item), arcname=str(rel_path))

    buffer.seek(0)
    return buffer

# ==================== SSH 连接 ====================

class Server:
    def __init__(self):
        self.ssh = None
        self.sftp = None

    def connect(self):
        log_step("连接", f"连接服务器 {SERVER_USER}@{SERVER_IP}...")
        self.ssh = paramiko.SSHClient()
        self.ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        self.ssh.connect(SERVER_IP, SERVER_PORT, SERVER_USER, SERVER_PASSWORD, timeout=30)
        self.sftp = self.ssh.open_sftp()
        log_success("服务器连接成功")

    def disconnect(self):
        if self.sftp:
            self.sftp.close()
        if self.ssh:
            self.ssh.close()
        log("已断开连接")

    def exec(self, cmd, show=True):
        if show:
            log(f"  > {cmd[:80]}...", Colors.BLUE)
        stdin, stdout, stderr = self.ssh.exec_command(cmd, timeout=120)
        out = stdout.read().decode('utf-8', errors='replace')
        err = stderr.read().decode('utf-8', errors='replace')
        code = stdout.channel.recv_exit_status()
        return code, out, err

    def upload_tar(self, tar_buffer, remote_path, extract_dir):
        """上传 tar 并解压"""
        self.sftp.putfo(tar_buffer, remote_path)
        self.exec(f"cd {extract_dir} && tar -xzf {remote_path} && rm {remote_path}", show=False)

# ==================== 部署函数 ====================

def build_frontend():
    log_step("构建", "构建前端...")
    if not run_cmd("npm run build", cwd=FRONTEND_DIR):
        log_error("前端构建失败")
        return False
    log_success("前端构建完成")
    return True

def build_backend():
    log_step("构建", "构建后端...")
    if not run_cmd("npm run build", cwd=BACKEND_DIR):
        log_error("后端构建失败")
        return False
    log_success("后端构建完成")
    return True

def build_admin():
    log_step("构建", "构建管理后台...")
    if not ADMIN_DIR.exists():
        log("管理后台目录不存在，跳过", Colors.YELLOW)
        return True
    if not run_cmd("npm run build", cwd=ADMIN_DIR):
        log_error("管理后台构建失败")
        return False
    log_success("管理后台构建完成")
    return True

def deploy_frontend(server):
    log_step("部署前端", "上传前端文件...")

    dist_dir = FRONTEND_DIR / "dist"
    if not dist_dir.exists():
        log_error("前端 dist 目录不存在，请先构建")
        return False

    # 清理远程目录
    server.exec(f"rm -rf {REMOTE_FRONTEND}/assets {REMOTE_FRONTEND}/index.html", show=False)

    # 打包上传（排除视频）
    tar_buffer = create_tar(dist_dir, exclude=['videos', '.mp4', '.mov', '.avi'])
    server.upload_tar(tar_buffer, "/tmp/frontend.tar.gz", REMOTE_FRONTEND)

    log_success("前端部署完成")
    return True

def deploy_backend(server):
    log_step("部署后端", "上传后端文件...")

    dist_dir = BACKEND_DIR / "dist"
    if not dist_dir.exists():
        log_error("后端 dist 目录不存在，请先构建")
        return False

    # 清理远程目录
    server.exec(f"rm -rf {REMOTE_BACKEND}/dist", show=False)

    # 上传 dist, package.json 和 scripts
    tar_buffer = io.BytesIO()
    with tarfile.open(fileobj=tar_buffer, mode='w:gz') as tar:
        tar.add(str(dist_dir), arcname='dist')
        tar.add(str(BACKEND_DIR / 'package.json'), arcname='package.json')
        # 上传 scripts 文件夹（用于数据库迁移等）
        scripts_dir = BACKEND_DIR / 'scripts'
        if scripts_dir.exists():
            tar.add(str(scripts_dir), arcname='scripts')
    tar_buffer.seek(0)

    server.upload_tar(tar_buffer, "/tmp/backend.tar.gz", REMOTE_BACKEND)

    # 重启服务
    log("  重启后端服务...")
    server.exec("cd /www/smartapi && pm2 restart smartapi || pm2 start dist/index.js --name smartapi")

    log_success("后端部署完成")
    return True

def deploy_admin(server):
    log_step("部署管理后台", "上传管理后台文件...")

    dist_dir = ADMIN_DIR / "dist"
    if not dist_dir.exists():
        log("管理后台 dist 目录不存在，跳过", Colors.YELLOW)
        return True

    # 清理远程目录
    server.exec(f"rm -rf {REMOTE_ADMIN}/*", show=False)

    # 打包上传
    tar_buffer = create_tar(dist_dir)
    server.upload_tar(tar_buffer, "/tmp/admin.tar.gz", REMOTE_ADMIN)

    log_success("管理后台部署完成")
    return True

def check_status(server):
    log_step("验证", "检查服务状态...")

    # PM2 状态
    code, out, _ = server.exec("pm2 status", show=False)
    if "online" in out:
        log_success("后端服务运行正常")
    else:
        log_error("后端服务异常")

    # API 健康检查
    code, out, _ = server.exec("curl -s http://localhost:3000/api/health", show=False)
    if "success" in out:
        log_success("API 健康检查通过")
    else:
        log_error("API 健康检查失败")

# ==================== 主函数 ====================

def print_menu():
    print(f"""
{Colors.BOLD}╔══════════════════════════════════════════════════╗
║          SmartAPI 一键部署工具                    ║
╚══════════════════════════════════════════════════╝{Colors.RESET}

请选择要部署的内容:
  1. 全部部署 (前端 + 后端 + 管理后台)
  2. 只部署前端
  3. 只部署后端
  4. 只部署管理后台
  5. 只构建不部署
  0. 退出
""")

def main():
    # 命令行参数
    if len(sys.argv) > 1:
        target = sys.argv[1].lower()
        if target in ['all', 'frontend', 'backend', 'admin']:
            deploy_target = target
        elif target in ['-h', '--help', 'help']:
            print(__doc__)
            return
        else:
            print(f"未知参数: {target}")
            print(__doc__)
            return
    else:
        # 交互式菜单
        print_menu()
        choice = input("请输入选项 [1-5, 0]: ").strip()

        target_map = {
            '1': 'all',
            '2': 'frontend',
            '3': 'backend',
            '4': 'admin',
            '5': 'build',
            '0': 'exit'
        }

        deploy_target = target_map.get(choice)
        if not deploy_target:
            print("无效选项")
            return
        if deploy_target == 'exit':
            print("已退出")
            return

    print(f"\n{Colors.BOLD}开始部署: {deploy_target}{Colors.RESET}")
    print(f"项目目录: {PROJECT_DIR}")
    print(f"服务器: {SERVER_USER}@{SERVER_IP}\n")

    # 构建
    if deploy_target in ['all', 'frontend', 'build']:
        if not build_frontend():
            return

    if deploy_target in ['all', 'backend', 'build']:
        if not build_backend():
            return

    if deploy_target in ['all', 'admin', 'build']:
        if not build_admin():
            return

    if deploy_target == 'build':
        log_success("\n构建完成!")
        return

    # 部署
    server = Server()
    try:
        server.connect()

        if deploy_target in ['all', 'frontend']:
            deploy_frontend(server)

        if deploy_target in ['all', 'backend']:
            deploy_backend(server)

        if deploy_target in ['all', 'admin']:
            deploy_admin(server)

        check_status(server)

        print(f"""
{Colors.GREEN}{Colors.BOLD}
╔══════════════════════════════════════════════════╗
║                  部署成功!                        ║
╠══════════════════════════════════════════════════╣
║  前端: https://contentcube.cn/smartapi/          ║
║  API:  https://contentcube.cn/api/               ║
║  后台: https://contentcube.cn/admin/             ║
╚══════════════════════════════════════════════════╝
{Colors.RESET}""")

    except Exception as e:
        log_error(f"部署失败: {e}")
        import traceback
        traceback.print_exc()
    finally:
        server.disconnect()

if __name__ == "__main__":
    main()
