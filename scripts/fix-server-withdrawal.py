#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
修复服务器上的提现状态
"""

import sys
try:
    import paramiko
except ImportError:
    print("错误: 请先安装 paramiko")
    print("运行: pip install paramiko")
    sys.exit(1)

# 服务器配置
SERVER_IP = "119.29.37.208"
SERVER_USER = "root"
SERVER_PASSWORD = "119689Abc."
SERVER_PORT = 22

def main():
    print(f"连接服务器 {SERVER_USER}@{SERVER_IP}...")

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(SERVER_IP, SERVER_PORT, SERVER_USER, SERVER_PASSWORD, timeout=30)

    print("连接成功，执行修复...")

    # 直接执行SQL修复ID 25的提现记录
    fix_cmd = """
cd /www/smartapi && node -e "
const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    dialect: 'mysql',
    logging: console.log
  }
);

async function fix() {
  await sequelize.authenticate();
  console.log('开始修复提现 ID 25...');

  // 更新提现记录状态为成功（去掉 completed_at 列）
  await sequelize.query('UPDATE withdrawal_requests SET status = \\'success\\', success_amount = amount, success_count = 1 WHERE id = 25');
  console.log('提现记录已更新');

  // 更新转账记录状态
  await sequelize.query('UPDATE withdrawal_transfers SET status = \\'success\\', batch_status = \\'SUCCESS\\' WHERE withdrawal_id = 25');
  console.log('转账记录已更新');

  // 更新用户累计提现金额（用户ID 208，金额 1.00）
  await sequelize.query('UPDATE users SET total_commission_withdrawn = COALESCE(total_commission_withdrawn, 0) + 1 WHERE id = 208');
  console.log('用户累计提现已更新');

  // 验证修复结果
  const [result] = await sequelize.query('SELECT id, status, success_amount FROM withdrawal_requests WHERE id = 25');
  console.log('修复后状态:', result);

  console.log('修复完成!');
  process.exit(0);
}
fix();
"
"""

    stdin, stdout, stderr = ssh.exec_command(fix_cmd, timeout=60)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    print("修复结果:")
    print(out)
    if err:
        print("错误:", err)

    ssh.close()
    print("\n完成!")

if __name__ == "__main__":
    main()
