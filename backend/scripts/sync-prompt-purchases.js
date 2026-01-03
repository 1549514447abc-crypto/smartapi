/**
 * 同步提示词购买记录到 balance_logs 表
 * 用于补充早期没有记录到 balance_logs 的购买记录
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function syncPromptPurchases() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    console.log('开始同步提示词购买记录...');

    // 查找 user_prompts 中没有对应 balance_logs 记录的购买
    const [purchases] = await connection.execute(`
      SELECT up.id, up.user_id, up.prompt_id, up.purchase_type, up.price_paid, up.created_at,
             p.title as prompt_title
      FROM user_prompts up
      LEFT JOIN prompts p ON up.prompt_id = p.id
      WHERE up.purchase_type = 'paid'
        AND up.price_paid > 0
        AND NOT EXISTS (
          SELECT 1 FROM balance_logs bl
          WHERE bl.user_id = up.user_id
            AND bl.source = 'prompt_purchase'
            AND bl.service_name = CONCAT('prompt_', up.prompt_id)
        )
    `);

    console.log(`找到 ${purchases.length} 条需要同步的记录`);

    let synced = 0;
    for (const purchase of purchases) {
      try {
        // 插入 balance_logs 记录
        await connection.execute(`
          INSERT INTO balance_logs
            (user_id, change_type, change_amount, balance_before, balance_after, source, service_name, description, created_at)
          VALUES (?, 'consumption', ?, 0, 0, 'prompt_purchase', ?, ?, ?)
        `, [
          purchase.user_id,
          -purchase.price_paid,
          `prompt_${purchase.prompt_id}`,
          `购买提示词: ${purchase.prompt_title || purchase.prompt_id}`,
          purchase.created_at
        ]);
        synced++;
        console.log(`已同步: 用户${purchase.user_id} 购买提示词 ${purchase.prompt_title || purchase.prompt_id}`);
      } catch (err) {
        console.error(`同步失败: ${err.message}`);
      }
    }

    console.log(`\n同步完成! 共同步 ${synced} 条记录`);

  } catch (error) {
    console.error('同步失败:', error);
  } finally {
    await connection.end();
  }
}

syncPromptPurchases();
