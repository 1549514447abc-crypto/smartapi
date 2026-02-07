const mysql = require('mysql2/promise');

async function fixEncoding() {
  try {
    const connection = await mysql.createConnection({
      host: '127.0.0.1',
      port: 13306,
      user: 'root',
      password: '119689Abc.',
      database: 'smartapi_dev',
      charset: 'utf8mb4'
    });

    // 更新乱码数据
    const [result] = await connection.execute(
      'UPDATE course_extras SET title = ?, description = ? WHERE id = 5',
      ['在飞书一键调用coze工作流', '学习如何在飞书中快速集成和调用coze工作流，提升团队协作效率']
    );

    console.log(`✅ 更新成功！影响行数: ${result.affectedRows}`);

    // 验证更新
    const [rows] = await connection.execute(
      'SELECT id, title, description FROM course_extras WHERE id = 5'
    );

    console.log('\n验证结果:');
    console.log('ID:', rows[0].id);
    console.log('标题:', rows[0].title);
    console.log('描述:', rows[0].description);

    await connection.end();
  } catch (error) {
    console.error('❌ 错误:', error.message);
  }
}

fixEncoding();
