import { Request, Response } from 'express';
import Prompt from '../models/Prompt';
import UserPrompt from '../models/UserPrompt';
import User from '../models/User';
import PromptCategory from '../models/PromptCategory';
import sequelize from '../config/database';
import { Op } from 'sequelize';
import supabaseService from '../services/SupabaseService';

// 检查用户是否是有效的年度会员（只有年度会员才能免费查看提示词）
// 注意：课程学员不能免费查看提示词，需要购买
const isYearlyMember = (user: User): boolean => {
  // 只有 yearly（年度会员）才能免费查看，course（课程学员）不行
  if (user.membership_type !== 'yearly') return false;
  // 检查会员是否过期
  if (!user.membership_expiry) return false;
  return new Date(user.membership_expiry) > new Date();
};

// 获取提示词列表
export const getPromptList = async (req: Request, res: Response) => {
  try {
    const { category, keyword, page = 1, pageSize = 20 } = req.query;
    const userId = (req as any).user?.userId;

    const where: any = { is_active: true };

    if (category && category !== 'all') {
      where.category = category;
    }

    if (keyword) {
      where[Op.or] = [
        { title: { [Op.like]: `%${keyword}%` } },
        { description: { [Op.like]: `%${keyword}%` } }
      ];
    }

    const { rows: prompts, count } = await Prompt.findAndCountAll({
      where,
      order: [['sort_order', 'DESC'], ['created_at', 'DESC']],
      limit: Number(pageSize),
      offset: (Number(page) - 1) * Number(pageSize)
    });

    // 如果用户已登录，获取其已购买的提示词
    let ownedPromptIds: number[] = [];
    let isMember = false;

    if (userId) {
      const user = await User.findByPk(userId);
      if (user) {
        isMember = isYearlyMember(user);
      }

      const userPrompts = await UserPrompt.findAll({
        where: { user_id: userId },
        attributes: ['prompt_id']
      });
      ownedPromptIds = userPrompts.map(up => up.prompt_id);
    }

    // 处理返回数据，添加是否已拥有标记
    const promptsWithOwnership = prompts.map(prompt => {
      const promptData = prompt.toJSON();
      const isOwned = ownedPromptIds.includes(prompt.id) || isMember;
      return {
        ...promptData,
        is_owned: isOwned,
        // 非会员且未购买时隐藏部分内容
        content: isOwned ? promptData.content : promptData.content.substring(0, 50) + '...'
      };
    });

    return res.json({
      success: true,
      data: {
        list: promptsWithOwnership,
        total: count,
        page: Number(page),
        pageSize: Number(pageSize),
        is_yearly_member: isMember
      }
    });
  } catch (err) {
    console.error('获取提示词列表失败:', err);
    return res.status(500).json({
      success: false,
      message: '获取提示词列表失败'
    });
  }
};

// 获取提示词详情
export const getPromptDetail = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.userId;

    const prompt = await Prompt.findOne({
      where: { id, is_active: true }
    });

    if (!prompt) {
      return res.status(404).json({
        success: false,
        message: '提示词不存在'
      });
    }

    let isOwned = false;
    let isMember = false;

    if (userId) {
      const user = await User.findByPk(userId);
      if (user) {
        isMember = isYearlyMember(user);
      }

      const userPrompt = await UserPrompt.findOne({
        where: { user_id: userId, prompt_id: id }
      });
      isOwned = !!userPrompt || isMember;
    }

    const promptData = prompt.toJSON();

    return res.json({
      success: true,
      data: {
        ...promptData,
        is_owned: isOwned,
        is_yearly_member: isMember,
        // 非年度会员且未购买时隐藏完整内容
        content: isOwned ? promptData.content : promptData.content.substring(0, 50) + '...'
      }
    });
  } catch (err) {
    console.error('获取提示词详情失败:', err);
    return res.status(500).json({
      success: false,
      message: '获取提示词详情失败'
    });
  }
};

// 购买提示词（需登录）
export const purchasePrompt = async (req: Request, res: Response) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const userId = (req as any).user?.userId;

    // 检查提示词是否存在
    const prompt = await Prompt.findOne({
      where: { id, is_active: true }
    });

    if (!prompt) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: '提示词不存在'
      });
    }

    // 检查是否已购买
    const existingPurchase = await UserPrompt.findOne({
      where: { user_id: userId, prompt_id: id }
    });

    if (existingPurchase) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: '您已拥有此提示词'
      });
    }

    // 获取用户信息
    const user = await User.findByPk(userId, { transaction });
    if (!user) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 检查是否是年度会员
    const isYearly = isYearlyMember(user);

    if (isYearly) {
      // 年度会员可以直接查看，不需要购买，也不创建购买记录
      await transaction.rollback();
      return res.json({
        success: true,
        message: '您是年度会员，可直接查看所有提示词',
        data: {
          prompt: prompt.toJSON(),
          balance: Number(user.balance),
          bonus_balance: Number(user.bonus_balance),
          total_balance: Number(user.balance) + Number(user.bonus_balance),
          is_yearly_member: true
        }
      });
    } else {
      // 非会员需要付费
      const price = Number(prompt.price);
      const currentBalance = Number(user.balance) || 0;
      const currentBonusBalance = Number(user.bonus_balance) || 0;
      const totalBalance = currentBalance + currentBonusBalance;

      if (totalBalance < price) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: '余额不足，请先充值'
        });
      }

      // 扣除余额（优先扣充值金，不足时扣赠金）
      let newBalance = currentBalance;
      let newBonusBalance = currentBonusBalance;

      if (currentBalance >= price) {
        // 充值金足够，只扣充值金
        newBalance = currentBalance - price;
      } else {
        // 充值金不足，先扣完充值金，再扣赠金
        const remaining = price - currentBalance;
        newBalance = 0;
        newBonusBalance = currentBonusBalance - remaining;
      }

      await user.update({
        balance: newBalance,
        bonus_balance: newBonusBalance,
        total_consumed: Number(user.total_consumed || 0) + price
      }, { transaction });

      // 创建购买记录
      await UserPrompt.create({
        user_id: userId,
        prompt_id: Number(id),
        purchase_type: 'paid',
        price_paid: price
      }, { transaction });

      // 记录消费日志到 balance_logs
      await sequelize.query(
        `INSERT INTO balance_logs (user_id, change_type, change_amount, balance_before, balance_after, source, service_name, description, created_at)
         VALUES (?, 'consumption', ?, ?, ?, 'prompt_purchase', ?, ?, NOW())`,
        {
          replacements: [
            userId,
            -price,
            currentBalance + currentBonusBalance,
            newBalance + newBonusBalance,
            `prompt_${id}`,
            `购买提示词: ${prompt.title || id}`
          ],
          transaction
        }
      );
    }

    // 更新提示词购买计数
    await prompt.update({
      purchase_count: prompt.purchase_count + 1
    }, { transaction });

    await transaction.commit();

    // Sync balance to Supabase (async, don't block) - only for paid purchases
    // 重新加载用户获取最新余额
    await user.reload();
    const totalBalance = Number(user.balance) + Number(user.bonus_balance);

    // 同步余额到 Supabase
    supabaseService.syncBalance(userId, totalBalance).catch(err => {
      console.error('Supabase sync failed:', err.message);
    });

    // 返回完整提示词内容
    return res.json({
      success: true,
      message: '购买成功',
      data: {
        prompt: prompt.toJSON(),
        balance: Number(user.balance),
        bonus_balance: Number(user.bonus_balance),
        total_balance: totalBalance
      }
    });
  } catch (err) {
    await transaction.rollback();
    console.error('购买提示词失败:', err);
    return res.status(500).json({
      success: false,
      message: '购买失败，请重试'
    });
  }
};

// 获取用户的提示词
// - 年度会员：返回所有提示词（会员期间可免费查看全部）
// - 非年度会员：只返回已购买的提示词（购买记录永久有效）
export const getMyPrompts = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { page = 1, pageSize = 20 } = req.query;

    const user = await User.findByPk(userId);
    const isYearly = user ? isYearlyMember(user) : false;

    // 如果是年度会员，返回所有提示词（可免费查看）
    if (isYearly) {
      const { rows: prompts, count } = await Prompt.findAndCountAll({
        where: { is_active: true },
        order: [['sort_order', 'DESC'], ['created_at', 'DESC']],
        limit: Number(pageSize),
        offset: (Number(page) - 1) * Number(pageSize)
      });

      return res.json({
        success: true,
        data: {
          list: prompts.map(p => ({ ...p.toJSON(), is_owned: true, access_type: 'yearly_member' })),
          total: count,
          page: Number(page),
          pageSize: Number(pageSize),
          is_yearly_member: true
        }
      });
    }

    // 非年度会员只返回已购买的（购买记录永久有效）
    const { rows: userPrompts, count } = await UserPrompt.findAndCountAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']],
      limit: Number(pageSize),
      offset: (Number(page) - 1) * Number(pageSize)
    });

    const promptIds = userPrompts.map(up => up.prompt_id);
    const prompts = await Prompt.findAll({
      where: { id: promptIds }
    });

    // 按购买顺序排列
    const promptMap = new Map(prompts.map(p => [p.id, p]));
    const orderedPrompts = userPrompts.map(up => {
      const prompt = promptMap.get(up.prompt_id);
      return prompt ? {
        ...prompt.toJSON(),
        is_owned: true,
        purchase_type: up.purchase_type,
        purchased_at: up.created_at
      } : null;
    }).filter(Boolean);

    return res.json({
      success: true,
      data: {
        list: orderedPrompts,
        total: count,
        page: Number(page),
        pageSize: Number(pageSize),
        is_yearly_member: false
      }
    });
  } catch (err) {
    console.error('获取已购提示词失败:', err);
    return res.status(500).json({
      success: false,
      message: '获取已购提示词失败'
    });
  }
};

// 获取分类列表
export const getCategories = async (req: Request, res: Response) => {
  try {
    // 获取所有启用的分类
    const allCategories = await PromptCategory.findAll({
      where: { is_active: true },
      order: [['sort_order', 'DESC']],
      attributes: ['key', 'name']
    });

    // 获取每个分类的提示词数量
    const categoryCounts = await Prompt.findAll({
      where: { is_active: true },
      attributes: ['category', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      group: ['category']
    });

    // 构建分类数量映射
    const countMap = new Map(
      categoryCounts.map(c => [c.category, Number((c as any).dataValues.count)])
    );

    return res.json({
      success: true,
      data: allCategories.map(c => ({
        key: c.key,
        name: c.name,
        count: countMap.get(c.key) || 0
      }))
    });
  } catch (err) {
    console.error('获取分类失败:', err);
    return res.status(500).json({
      success: false,
      message: '获取分类失败'
    });
  }
};

// 管理员：获取所有提示词（包括下架的）
export const getAdminPromptList = async (req: Request, res: Response) => {
  try {
    const { category, keyword, page = 1, pageSize = 100 } = req.query;

    const where: any = {};

    if (category && category !== 'all') {
      where.category = category;
    }

    if (keyword) {
      where[Op.or] = [
        { title: { [Op.like]: `%${keyword}%` } },
        { description: { [Op.like]: `%${keyword}%` } }
      ];
    }

    const { rows: prompts, count } = await Prompt.findAndCountAll({
      where,
      order: [['sort_order', 'DESC'], ['created_at', 'DESC']],
      limit: Number(pageSize),
      offset: (Number(page) - 1) * Number(pageSize)
    });

    return res.json({
      success: true,
      data: {
        list: prompts,
        total: count,
        page: Number(page),
        pageSize: Number(pageSize)
      }
    });
  } catch (err) {
    console.error('获取提示词列表失败:', err);
    return res.status(500).json({
      success: false,
      message: '获取提示词列表失败'
    });
  }
};

// 管理员：创建/更新提示词
export const upsertPrompt = async (req: Request, res: Response) => {
  try {
    const {
      id,
      title,
      description,
      content,
      category,
      tags,
      price = 9.9,
      cover_url,
      author,
      is_active = true,
      sort_order = 0
    } = req.body;

    if (!title || !description || !content || !category) {
      return res.status(400).json({
        success: false,
        message: '标题、简介、内容、分类为必填项'
      });
    }

    if (id) {
      // 更新
      const prompt = await Prompt.findByPk(id);
      if (!prompt) {
        return res.status(404).json({
          success: false,
          message: '提示词不存在'
        });
      }

      await prompt.update({
        title,
        description,
        content,
        category,
        tags,
        price,
        cover_url,
        author,
        is_active,
        sort_order
      });

      return res.json({
        success: true,
        message: '更新成功',
        data: prompt
      });
    } else {
      // 创建
      const prompt = await Prompt.create({
        title,
        description,
        content,
        category,
        tags,
        price,
        cover_url,
        author,
        is_active,
        sort_order
      });

      return res.json({
        success: true,
        message: '创建成功',
        data: prompt
      });
    }
  } catch (err) {
    console.error('保存提示词失败:', err);
    return res.status(500).json({
      success: false,
      message: '保存失败'
    });
  }
};

// 管理员：删除提示词
export const deletePrompt = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const prompt = await Prompt.findByPk(id);
    if (!prompt) {
      return res.status(404).json({
        success: false,
        message: '提示词不存在'
      });
    }

    // 软删除，只是设置为不活跃
    await prompt.update({ is_active: false });

    return res.json({
      success: true,
      message: '删除成功'
    });
  } catch (err) {
    console.error('删除提示词失败:', err);
    return res.status(500).json({
      success: false,
      message: '删除失败'
    });
  }
};

// ==================== 分类管理 ====================

// 获取所有分类（管理员）
export const getAdminCategories = async (req: Request, res: Response) => {
  try {
    const categories = await PromptCategory.findAll({
      order: [['sort_order', 'DESC'], ['id', 'ASC']]
    });

    return res.json({
      success: true,
      data: categories
    });
  } catch (err) {
    console.error('获取分类列表失败:', err);
    return res.status(500).json({
      success: false,
      message: '获取分类列表失败'
    });
  }
};

// 创建/更新分类
export const upsertCategory = async (req: Request, res: Response) => {
  try {
    const { id, key, name, icon, description, sort_order = 0, is_active = true } = req.body;

    if (!key || !name) {
      return res.status(400).json({
        success: false,
        message: '分类标识和名称为必填项'
      });
    }

    if (id) {
      // 更新
      const category = await PromptCategory.findByPk(id);
      if (!category) {
        return res.status(404).json({
          success: false,
          message: '分类不存在'
        });
      }

      // 检查 key 是否与其他分类冲突
      const existing = await PromptCategory.findOne({
        where: { key, id: { [Op.ne]: id } }
      });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: '分类标识已存在'
        });
      }

      await category.update({ key, name, icon, description, sort_order, is_active });

      return res.json({
        success: true,
        message: '更新成功',
        data: category
      });
    } else {
      // 创建
      const existing = await PromptCategory.findOne({ where: { key } });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: '分类标识已存在'
        });
      }

      const category = await PromptCategory.create({
        key,
        name,
        icon,
        description,
        sort_order,
        is_active
      });

      return res.json({
        success: true,
        message: '创建成功',
        data: category
      });
    }
  } catch (err) {
    console.error('保存分类失败:', err);
    return res.status(500).json({
      success: false,
      message: '保存失败'
    });
  }
};

// 删除分类
export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const category = await PromptCategory.findByPk(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: '分类不存在'
      });
    }

    // 检查是否有提示词使用此分类
    const promptCount = await Prompt.count({ where: { category: category.key } });
    if (promptCount > 0) {
      return res.status(400).json({
        success: false,
        message: `该分类下有 ${promptCount} 个提示词，无法删除`
      });
    }

    await category.destroy();

    return res.json({
      success: true,
      message: '删除成功'
    });
  } catch (err) {
    console.error('删除分类失败:', err);
    return res.status(500).json({
      success: false,
      message: '删除失败'
    });
  }
};

// ==================== 批量导入 ====================

/**
 * 批量导入提示词
 * TXT 格式说明：
 * 每个提示词用 === 分隔
 * 每个提示词内部用特定标记：
 * 【标题】xxx
 * 【分类】xxx
 * 【简介】xxx
 * 【标签】tag1,tag2,tag3
 * 【价格】9.9
 * 【内容】
 * 这里是提示词的完整内容
 * 可以多行
 */
export const batchImportPrompts = async (req: Request, res: Response) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        message: '请提供导入内容'
      });
    }

    // 按 === 分割多个提示词
    const promptBlocks = content.split('===').map((s: string) => s.trim()).filter(Boolean);

    const results: { success: number; failed: number; errors: string[] } = {
      success: 0,
      failed: 0,
      errors: []
    };

    for (let i = 0; i < promptBlocks.length; i++) {
      const block = promptBlocks[i];
      try {
        // 解析提示词块
        const titleMatch = block.match(/【标题】(.+?)(?=【|$)/s);
        const categoryMatch = block.match(/【分类】(.+?)(?=【|$)/s);
        const descMatch = block.match(/【简介】(.+?)(?=【|$)/s);
        const tagsMatch = block.match(/【标签】(.+?)(?=【|$)/s);
        const priceMatch = block.match(/【价格】(.+?)(?=【|$)/s);
        const contentMatch = block.match(/【内容】(.+?)$/s);

        const title = titleMatch ? titleMatch[1].trim() : '';
        const category = categoryMatch ? categoryMatch[1].trim() : 'other';
        const description = descMatch ? descMatch[1].trim() : '';
        const tagsStr = tagsMatch ? tagsMatch[1].trim() : '';
        const price = priceMatch ? parseFloat(priceMatch[1].trim()) : 9.9;
        const promptContent = contentMatch ? contentMatch[1].trim() : '';

        if (!title || !promptContent) {
          results.failed++;
          results.errors.push(`第 ${i + 1} 个提示词缺少标题或内容`);
          continue;
        }

        const tags = tagsStr ? tagsStr.split(',').map((t: string) => t.trim()).filter(Boolean) : null;

        await Prompt.create({
          title,
          description: description || title,
          content: promptContent,
          category,
          tags,
          price: isNaN(price) ? 9.9 : price,
          is_active: true,
          sort_order: 0
        });

        results.success++;
      } catch (err: any) {
        results.failed++;
        results.errors.push(`第 ${i + 1} 个提示词导入失败: ${err.message}`);
      }
    }

    return res.json({
      success: true,
      message: `导入完成：成功 ${results.success} 个，失败 ${results.failed} 个`,
      data: results
    });
  } catch (err) {
    console.error('批量导入失败:', err);
    return res.status(500).json({
      success: false,
      message: '批量导入失败'
    });
  }
};
