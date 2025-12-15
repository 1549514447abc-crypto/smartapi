/**
 * 初始化课程数据
 * 运行: node scripts/init-course-data.js
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const courseExtras = [
  {
    type: 'workflow_list',
    title: '课程内的实操工作流列表',
    description: '包含课程中所有实操演示的工作流，可直接导入使用',
    link_url: 'https://ai.feishu.cn/wiki/WTgZwZNDKihGkOkAso6c2KHFn1f',
    sort_order: 1
  },
  {
    type: 'reward',
    title: '课程推荐奖励说明',
    description: '招募课程推荐人，成功推荐可获得现金奖励',
    link_url: 'https://ai.feishu.cn/wiki/NxWUwOZDui1ih0kGxJxcF0ZsnHg',
    sort_order: 2
  },
  {
    type: 'prompt_library',
    title: '学员提示词库(持续更新)',
    description: '收录高频提问与实战提示词，按场景分级，定期更新',
    link_url: 'https://ai.feishu.cn/wiki/QEnnwvGLbigXXJkHheUcmgjonRh',
    sort_order: 3
  },
  {
    type: 'workflow_download',
    title: '成品COZE工作流下载',
    description: '直接可用的COZE工作流模板，一键导入使用',
    link_url: 'https://ai.feishu.cn/wiki/Fm8HwqAf4iIudQkPlaScFY7gnoM',
    sort_order: 4
  }
];

const courseLessons = [
  {
    title: 'AI如何让普通人成为超级个体',
    video_path: '/videos/第一节课.mp4',
    duration: '15:00',
    sort_order: 1,
    is_free: true,
    document_url: 'https://ai.feishu.cn/wiki/Q9hGwtNLuiaxR7kDOLrcQjwbn2f'
  },
  {
    title: '课程导学:学习路径与目录速览',
    video_path: '/videos/第二节课.mp4',
    duration: '12:00',
    sort_order: 2,
    is_free: true,
    document_url: 'https://ai.feishu.cn/wiki/L7KjwFqiGiMNwkkrtEucPRSunng'
  },
  {
    title: '课程导学:学习路径与目录速览(副本)',
    video_path: '/videos/第三节.mp4',
    duration: '14:00',
    sort_order: 3,
    is_free: false,
    document_url: 'https://ai.feishu.cn/wiki/BMyUwTwnLiplCSklqw2cfodznUg'
  },
  {
    title: '认识Coze的边界',
    video_path: '/videos/第四节课.mp4',
    duration: '10:00',
    sort_order: 4,
    is_free: false,
    document_url: 'https://ai.feishu.cn/wiki/WeZYwrzdoivrtykluWkcJVFNn2s'
  },
  {
    title: 'COZE功能区与界面介绍',
    video_path: '/videos/第五课--cp.mp4',
    duration: '18:00',
    sort_order: 5,
    is_free: false,
    document_url: 'https://ai.feishu.cn/wiki/TazdwUFIBix50OkCKNncY4fVnwh'
  },
  {
    title: '课程答疑说明与高效学习方法',
    video_path: '/videos/第六课.mp4',
    duration: '16:00',
    sort_order: 6,
    is_free: false,
    document_url: 'https://ai.feishu.cn/wiki/VmqNwGehpivLdMkI4OfcuZAPnqe'
  },
  {
    title: '智能体与工作流的不同应用场景',
    video_path: '/videos/第七课--智能体与工作流的不同应用场景.mp4',
    duration: '13:00',
    sort_order: 7,
    is_free: false,
    document_url: 'https://ai.feishu.cn/wiki/K1Wgw2kWHiHgV3kQjl8cJqRHngb'
  },
  {
    title: '实操搭建你的第一个智能体',
    video_path: '/videos/第八课--搭建你的第一个工作流.mp4',
    duration: '25:00',
    sort_order: 8,
    is_free: false,
    document_url: 'https://ai.feishu.cn/wiki/YnFuwyNDTiqIe2ksQH9cCZ4GnUM'
  },
  {
    title: '用户变量与系统变量',
    video_path: '/videos/第九课--cp-用户变量与系统变量.mp4',
    duration: '20:00',
    sort_order: 9,
    is_free: false,
    document_url: 'https://ai.feishu.cn/wiki/TrzCwoFEJihji9keg63csVpsnGf'
  },
  {
    title: '工作流变量(局部变量)',
    video_path: '/videos/第十课 局部变量.mp4',
    duration: '12:00',
    sort_order: 10,
    is_free: false,
    document_url: 'https://ai.feishu.cn/wiki/OjjjwnJpAiqVOLknxhGc0hM1ntb'
  }
];

const courseSetting = {
  title: 'Coze实战训练营',
  subtitle: '从底层逻辑到商业落地的完整路径',
  description: '本课程将带你从零开始学习Coze平台，掌握AI智能体和工作流的搭建技巧，实现从入门到商业落地的完整路径。',
  original_price: 299,
  current_price: 199,
  instructor_name: '课程讲师',
  instructor_bio: '资深AI应用开发者，专注于Coze平台实战教学',
  highlights: JSON.stringify([
    '10节系统课程，从入门到精通',
    '附赠学员提示词库，持续更新',
    '成品工作流模板，一键导入',
    '课程推荐奖励计划'
  ])
};

async function initCourseData() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'smartapi'
  });

  try {
    console.log('开始初始化课程数据...\n');

    // 1. 创建 course_extras 表
    console.log('1. 创建 course_extras 表...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS course_extras (
        id INT AUTO_INCREMENT PRIMARY KEY,
        type VARCHAR(50) NOT NULL COMMENT '类型',
        title VARCHAR(200) NOT NULL COMMENT '标题',
        description TEXT COMMENT '描述',
        link_url VARCHAR(500) COMMENT '链接地址',
        sort_order INT NOT NULL DEFAULT 0 COMMENT '排序序号',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_type (type),
        INDEX idx_sort_order (sort_order)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('   ✓ course_extras 表创建成功\n');

    // 2. 更新 course_lessons 表结构
    console.log('2. 更新 course_lessons 表结构...');
    try {
      await connection.execute(`ALTER TABLE course_lessons ADD COLUMN is_free BOOLEAN NOT NULL DEFAULT FALSE COMMENT '是否免费试听'`);
      console.log('   ✓ 添加 is_free 字段');
    } catch (e) {
      console.log('   - is_free 字段已存在');
    }
    try {
      await connection.execute(`ALTER TABLE course_lessons ADD COLUMN document_url VARCHAR(500) COMMENT '飞书文档链接'`);
      console.log('   ✓ 添加 document_url 字段');
    } catch (e) {
      console.log('   - document_url 字段已存在');
    }
    try {
      await connection.execute(`ALTER TABLE course_lessons MODIFY COLUMN duration VARCHAR(20) COMMENT '视频时长'`);
      console.log('   ✓ 修改 duration 字段类型');
    } catch (e) {
      console.log('   - duration 字段已是正确类型');
    }
    console.log('');

    // 3. 清空并插入附赠内容
    console.log('3. 插入附赠内容数据...');
    await connection.execute('DELETE FROM course_extras');
    for (const extra of courseExtras) {
      await connection.execute(
        'INSERT INTO course_extras (type, title, description, link_url, sort_order) VALUES (?, ?, ?, ?, ?)',
        [extra.type, extra.title, extra.description, extra.link_url, extra.sort_order]
      );
      console.log(`   ✓ ${extra.title}`);
    }
    console.log('');

    // 4. 清空并插入课程章节
    console.log('4. 插入课程章节数据...');
    await connection.execute('DELETE FROM course_lessons');
    for (const lesson of courseLessons) {
      await connection.execute(
        'INSERT INTO course_lessons (title, video_path, duration, sort_order, is_free, document_url) VALUES (?, ?, ?, ?, ?, ?)',
        [lesson.title, lesson.video_path, lesson.duration, lesson.sort_order, lesson.is_free, lesson.document_url]
      );
      console.log(`   ✓ 第${lesson.sort_order}课: ${lesson.title}`);
    }
    console.log('');

    // 5. 更新课程设置
    console.log('5. 更新课程设置...');
    const [existing] = await connection.execute('SELECT id FROM course_settings LIMIT 1');
    if (existing.length > 0) {
      await connection.execute(
        `UPDATE course_settings SET title=?, subtitle=?, description=?, original_price=?, current_price=?, instructor_name=?, instructor_bio=?, highlights=? WHERE id=?`,
        [courseSetting.title, courseSetting.subtitle, courseSetting.description, courseSetting.original_price, courseSetting.current_price, courseSetting.instructor_name, courseSetting.instructor_bio, courseSetting.highlights, existing[0].id]
      );
      console.log('   ✓ 课程设置已更新');
    } else {
      await connection.execute(
        `INSERT INTO course_settings (title, subtitle, description, original_price, current_price, instructor_name, instructor_bio, highlights) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [courseSetting.title, courseSetting.subtitle, courseSetting.description, courseSetting.original_price, courseSetting.current_price, courseSetting.instructor_name, courseSetting.instructor_bio, courseSetting.highlights]
      );
      console.log('   ✓ 课程设置已插入');
    }

    console.log('\n========================================');
    console.log('课程数据初始化完成！');
    console.log('========================================');

  } catch (error) {
    console.error('初始化失败:', error);
  } finally {
    await connection.end();
  }
}

initCourseData();
