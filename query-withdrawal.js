const mysql = require('mysql2/promise');

async function queryWithdrawal() {
  try {
    const connection = await mysql.createConnection({
      host: '127.0.0.1',
      port: 13306,
      user: 'root',
      password: '119689Abc.',
      database: 'smartapi_dev',
      charset: 'utf8mb4'
    });

    // 查询最近的提现记录
    const [rows] = await connection.execute(`
      SELECT
        id,
        user_id,
        amount,
        status,
        success_amount,
        fail_amount,
        transfer_count,
        success_count,
        reject_reason,
        DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as created_at,
        DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s') as updated_at
      FROM withdrawal_requests
      ORDER BY created_at DESC
      LIMIT 10
    `);

    console.log('最近的提现记录:');
    console.log(JSON.stringify(rows, null, 2));

    // 如果找到19.82的记录，查询对应的转账记录
    const record = rows.find(r => parseFloat(r.amount) === 19.82);
    if (record) {
      console.log('\n找到19.82元的提现记录，ID:', record.id);

      const [transfers] = await connection.execute(`
        SELECT
          id,
          withdrawal_id,
          amount,
          out_batch_no,
          out_detail_no,
          wechat_batch_id,
          wechat_detail_id,
          batch_status,
          status,
          fail_reason,
          DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as created_at
        FROM withdrawal_transfers
        WHERE withdrawal_id = ?
        ORDER BY created_at DESC
      `, [record.id]);

      console.log('\n对应的转账记录:');
      console.log(JSON.stringify(transfers, null, 2));
    }

    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('错误:', error.message);
    process.exit(1);
  }
}

queryWithdrawal();
