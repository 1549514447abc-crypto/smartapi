#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import pymysql

try:
    # 连接数据库
    conn = pymysql.connect(
        host='119.29.37.208',
        port=13306,
        user='root',
        password='119689Abc.',
        database='smartapi_dev',
        charset='utf8mb4'
    )

    cursor = conn.cursor()

    # 更新乱码数据
    sql = """
    UPDATE course_extras
    SET title = %s, description = %s
    WHERE id = 5
    """

    title = '在飞书一键调用coze工作流'
    description = '学习如何在飞书中快速集成和调用coze工作流，提升团队协作效率'

    cursor.execute(sql, (title, description))
    conn.commit()

    print(f"✅ 更新成功！影响行数: {cursor.rowcount}")

    # 验证更新
    cursor.execute("SELECT id, title, description FROM course_extras WHERE id = 5")
    result = cursor.fetchone()
    print(f"\n验证结果:")
    print(f"ID: {result[0]}")
    print(f"标题: {result[1]}")
    print(f"描述: {result[2]}")

    cursor.close()
    conn.close()

except Exception as e:
    print(f"❌ 错误: {e}")
