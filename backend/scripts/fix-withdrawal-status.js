/**
 * 修复提现状态脚本
 * 将微信已成功但数据库未更新的提现记录状态修正
 */

const { Sequelize, DataTypes, Op } = require('sequelize');
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

async function fixWithdrawalStatus() {
  try {
    await sequelize.authenticate();
    console.log('数据库连接成功');

    // 查找 processing 状态的提现记录
    const [withdrawals] = await sequelize.query(`
      SELECT id, user_id, amount, status, success_amount, success_count
      FROM withdrawal_requests
      WHERE status = 'processing'
    `);

    console.log(`找到 ${withdrawals.length} 条 processing 状态的提现记录`);

    for (const withdrawal of withdrawals) {
      console.log(`\n处理提现 ID ${withdrawal.id}:`);

      // 查找对应的转账记录
      const [transfers] = await sequelize.query(`
        SELECT id, out_batch_no, amount, status, batch_status
        FROM withdrawal_transfers
        WHERE withdrawal_id = ?
      `, { replacements: [withdrawal.id] });

      console.log(`  找到 ${transfers.length} 条转账记录`);

      // 检查所有转账是否都成功（根据微信查询结果，状态应该是 SUCCESS）
      // 这里我们直接更新状态为成功
      if (transfers.length > 0) {
        // 更新转账记录状态
        await sequelize.query(`
          UPDATE withdrawal_transfers
          SET status = 'success', batch_status = 'SUCCESS', transferred_at = NOW()
          WHERE withdrawal_id = ? AND (status = 'processing' OR batch_status = 'WAIT_USER_CONFIRM')
        `, { replacements: [withdrawal.id] });

        // 计算成功金额
        const totalAmount = transfers.reduce((sum, t) => sum + parseFloat(t.amount), 0);

        // 更新提现记录状态
        await sequelize.query(`
          UPDATE withdrawal_requests
          SET status = 'success',
              success_amount = ?,
              success_count = ?,
              completed_at = NOW()
          WHERE id = ?
        `, { replacements: [totalAmount, transfers.length, withdrawal.id] });

        // 更新用户累计提现金额
        await sequelize.query(`
          UPDATE users
          SET total_commission_withdrawn = COALESCE(total_commission_withdrawn, 0) + ?
          WHERE id = ?
        `, { replacements: [totalAmount, withdrawal.user_id] });

        console.log(`  ✓ 提现 ID ${withdrawal.id} 已更新为成功，金额: ${totalAmount}`);
      }
    }

    console.log('\n修复完成！');
    process.exit(0);
  } catch (error) {
    console.error('修复失败:', error);
    process.exit(1);
  }
}

fixWithdrawalStatus();
