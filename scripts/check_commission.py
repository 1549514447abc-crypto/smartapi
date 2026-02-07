#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
检查佣金记录

使用方法:
    python scripts/check_commission.py
"""

import paramiko
from datetime import datetime

SERVER_IP = "119.29.37.208"
SERVER_USER = "root"
SERVER_PASSWORD = "119689Abc."
SERVER_PORT = 22
DB_PASSWORD = "119689Abc."
DB_NAME = "smartapi_dev"

report = []

def log(msg):
    print(msg)
    report.append(msg)

def execute_sql(ssh, sql):
    cmd = f'''mysql -h 127.0.0.1 -P 13306 -u root -p{DB_PASSWORD} {DB_NAME} --default-character-set=utf8mb4 -e "{sql}" '''
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=30)
    return stdout.read().decode('utf-8')

def run_check():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        log("=" * 80)
        log(f"返佣链路检查报告 - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        log("=" * 80)

        ssh.connect(SERVER_IP, SERVER_PORT, SERVER_USER, SERVER_PASSWORD, timeout=30)

        # 1. 检查测试用户
        log("\n【1. 测试用户状态】")
        result = execute_sql(ssh, """
            SELECT id, username, phone, balance, bonus_balance, commission_balance,
                   pending_commission_balance, membership_type, is_course_student, referred_by_user_id
            FROM users WHERE username IN ('testuserone', 'testusertwo')
        """)
        log(result)

        # 2. 检查推荐关系
        log("\n【2. 推荐关系】")
        result = execute_sql(ssh, """
            SELECT ur.id, u1.username as referrer, u2.username as referee,
                   ur.referral_code, ur.status, ur.total_contribution
            FROM user_referrals ur
            JOIN users u1 ON ur.referrer_id = u1.id
            JOIN users u2 ON ur.referee_id = u2.id
            WHERE u1.username = 'testuserone'
        """)
        log(result)

        # 3. 检查佣金记录
        log("\n【3. 佣金记录】")
        result = execute_sql(ssh, """
            SELECT c.id, u1.username as referrer, u2.username as referee,
                   c.source_type, c.source_amount, c.commission_rate, c.amount, c.status, c.created_at
            FROM commissions c
            JOIN users u1 ON c.referrer_id = u1.id
            JOIN users u2 ON c.referee_id = u2.id
            WHERE u1.username = 'testuserone'
            ORDER BY c.id
        """)
        if result.strip():
            log(result)
        else:
            log("  ❌ 没有佣金记录！")

        # 4. 检查课程订单
        log("\n【4. 课程订单】")
        result = execute_sql(ssh, """
            SELECT co.id, co.order_no, u.username, co.course_title, co.amount, co.status, co.created_at
            FROM course_orders co
            JOIN users u ON co.user_id = u.id
            WHERE u.username = 'testusertwo'
            ORDER BY co.id DESC LIMIT 5
        """)
        if result.strip():
            log(result)
        else:
            log("  没有课程订单")

        # 5. 佣金配置
        log("\n【5. 佣金配置 (normal 分类)】")
        result = execute_sql(ssh, """
            SELECT category_key, category_name, default_course_rate, default_membership_rate
            FROM user_categories WHERE category_key = 'normal'
        """)
        log(result)

        # 6. 总结
        log("\n【6. 总结】")

        # 检查佣金是否生成
        result = execute_sql(ssh, """
            SELECT COUNT(*) as count FROM commissions c
            JOIN users u ON c.referrer_id = u.id
            WHERE u.username = 'testuserone'
        """)
        lines = result.strip().split('\n')
        commission_count = int(lines[1].strip()) if len(lines) > 1 else 0

        if commission_count > 0:
            log(f"  ✅ 找到 {commission_count} 条佣金记录")

            # 检查佣金金额
            result = execute_sql(ssh, """
                SELECT SUM(amount) as total FROM commissions c
                JOIN users u ON c.referrer_id = u.id
                WHERE u.username = 'testuserone'
            """)
            lines = result.strip().split('\n')
            total = float(lines[1].strip()) if len(lines) > 1 and lines[1].strip() else 0
            log(f"  ✅ 总佣金金额: ¥{total}")

            # 检查推荐人待结算佣金
            result = execute_sql(ssh, "SELECT pending_commission_balance FROM users WHERE username = 'testuserone'")
            lines = result.strip().split('\n')
            pending = float(lines[1].strip()) if len(lines) > 1 and lines[1].strip() else 0
            log(f"  ✅ 推荐人待结算佣金: ¥{pending}")
        else:
            log("  ❌ 没有找到佣金记录！")
            log("  可能原因:")
            log("    - testusertwo 还没有购买会员/课程")
            log("    - 购买流程中佣金计算失败")
            log("    - 推荐关系不正确")

        log("\n" + "=" * 80)

    except Exception as e:
        log(f"检查失败: {e}")
        import traceback
        traceback.print_exc()
    finally:
        ssh.close()

        # 保存报告
        with open("scripts/commission_check_report.txt", 'w', encoding='utf-8') as f:
            f.write('\n'.join(report))
        print(f"\n报告已保存至: scripts/commission_check_report.txt")

if __name__ == "__main__":
    run_check()
