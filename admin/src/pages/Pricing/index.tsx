import { useState, useEffect } from 'react';
import { Card, Row, Col, Form, InputNumber, Button, message, Spin, Table, Switch, Input, Popconfirm } from 'antd';
import {
  SaveOutlined,
  CrownOutlined,
  VideoCameraOutlined,
  MessageOutlined,
  GiftOutlined,
  PercentageOutlined,
  PlusOutlined,
  DeleteOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import api from '../../api/request';

interface BonusRule {
  id?: number;
  min_amount: number;
  bonus_rate: number;
  bonus_type: 'rate' | 'fixed';
  bonus_fixed_amount?: number;
  display_text: string;
  priority: number;
  is_active: boolean;
}


const Pricing = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const [bonusRules, setBonusRules] = useState<BonusRule[]>([]);
  const [savingBonus, setSavingBonus] = useState(false);
  const [normalCategoryId, setNormalCategoryId] = useState<number | null>(null);

  // 监听表单值变化以更新预览
  const yearlyPrice = Form.useWatch('yearly_membership_price', form);
  const coursePrice = Form.useWatch('course_price', form);
  const courseOriginalPrice = Form.useWatch('course_original_price', form);
  const videoRateNormal = Form.useWatch('video_rate_normal', form);
  const commissionRateCourse = Form.useWatch('commission_rate_course', form);
  const commissionRateMembership = Form.useWatch('commission_rate_membership', form);

  useEffect(() => {
    fetchConfig();
    fetchBonusRules();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      // 获取系统配置
      const configRes: any = await api.get('/system-config');
      const configMap: Record<string, any> = {};
      if (configRes?.success) {
        const configs = configRes.data || [];
        configs.forEach((c: any) => {
          configMap[c.key] = c.value;
        });
      }

      // 尝试获取普通会员分类的佣金比例（单独 try-catch，失败不影响主配置）
      let normalCourseRate = Number(configMap['commission_rate_course']) || 10;
      let normalMembershipRate = Number(configMap['commission_rate_membership']) || 10;
      try {
        const categoryRes: any = await api.get('/admin/user-categories');
        if (categoryRes?.success) {
          // API 返回格式是 { data: { categories: [...] } }
          const categories = categoryRes.data?.categories || [];
          const normalCategory = categories.find((c: any) => c.category_key === 'normal');
          if (normalCategory) {
            setNormalCategoryId(normalCategory.id);
            normalCourseRate = Number(normalCategory.default_course_rate) || normalCourseRate;
            normalMembershipRate = Number(normalCategory.default_membership_rate) || normalMembershipRate;
          }
        }
      } catch (e) {
        console.log('获取用户分类失败，使用默认佣金比例');
      }

      form.setFieldsValue({
        yearly_membership_price: Number(configMap['yearly_membership_price']) || 299,
        course_price: Number(configMap['course_price']) || 799,
        course_original_price: Number(configMap['course_original_price']) || 1299,
        video_rate_normal: Number(configMap['video_rate_normal']) || 0.02,
        video_rate_yearly: Number(configMap['video_rate_yearly']) || 0.015,
        video_rate_course: Number(configMap['video_rate_course']) || 0.0133,
        prompt_default_price: Number(configMap['prompt_default_price']) || 9.9,
        commission_settle_minutes: Number(configMap['commission_settle_minutes']) || 21600,
        commission_rate_course: normalCourseRate,
        commission_rate_membership: normalMembershipRate,
        register_bonus: Number(configMap['register_bonus']) || 1,
        recharge_min_amount: Number(configMap['recharge_min_amount']) || 10,
        recharge_max_amount: Number(configMap['recharge_max_amount']) || 10000,
        min_withdrawal_amount: Number(configMap['min_withdrawal_amount']) || 10,
        max_daily_withdrawal: Number(configMap['max_daily_withdrawal']) || 2000,
        max_single_transfer: Number(configMap['max_single_transfer']) || 200,
      });
    } catch (error) {
      console.error('获取配置失败:', error);
      message.error('获取配置失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchBonusRules = async () => {
    try {
      const res = await api.get('/system-config/bonus-rules').catch(() => null);
      if (res && (res as any).success) {
        setBonusRules((res as any).data || []);
      }
    } catch (error) {
      console.error('获取赠金规则失败:', error);
    }
  };

  const handleBonusRuleChange = (index: number, field: keyof BonusRule, value: any) => {
    const newRules = [...bonusRules];
    (newRules[index] as any)[field] = value;
    // 自动更新 display_text
    if (field === 'min_amount' || field === 'bonus_rate') {
      const rule = newRules[index];
      const bonusAmount = Math.round(rule.min_amount * rule.bonus_rate);
      newRules[index].display_text = bonusAmount > 0
        ? `充${rule.min_amount}送${bonusAmount}`
        : `充${rule.min_amount}不送`;
    }
    setBonusRules(newRules);
  };

  const handleAddBonusRule = () => {
    const newRule: BonusRule = {
      min_amount: 0,
      bonus_rate: 0,
      bonus_type: 'rate',
      display_text: '充0不送',
      priority: bonusRules.length,
      is_active: true
    };
    setBonusRules([...bonusRules, newRule]);
  };

  const handleDeleteBonusRule = async (index: number) => {
    const rule = bonusRules[index];
    if (rule.id) {
      try {
        const res: any = await api.delete(`/system-config/bonus-rules/${rule.id}`);
        if (res.success) {
          message.success('删除成功');
        }
      } catch (error) {
        message.error('删除失败');
        return;
      }
    }
    const newRules = bonusRules.filter((_, i) => i !== index);
    setBonusRules(newRules);
  };

  const handleSaveBonusRules = async () => {
    setSavingBonus(true);
    try {
      const res: any = await api.put('/system-config/bonus-rules', { rules: bonusRules });
      if (res.success) {
        message.success('赠金规则保存成功');
        fetchBonusRules(); // 刷新获取最新数据
      } else {
        message.error(res.message || '保存失败');
      }
    } catch (error) {
      message.error('保存失败');
    } finally {
      setSavingBonus(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const values = await form.validateFields();

      // 批量保存系统配置（不包含佣金比例，佣金比例保存到 normal 分类）
      const configs = [
        { key: 'yearly_membership_price', value: String(values.yearly_membership_price) },
        { key: 'course_price', value: String(values.course_price) },
        { key: 'course_original_price', value: String(values.course_original_price) },
        { key: 'video_rate_normal', value: String(values.video_rate_normal) },
        { key: 'video_rate_yearly', value: String(values.video_rate_yearly) },
        { key: 'video_rate_course', value: String(values.video_rate_course) },
        { key: 'prompt_default_price', value: String(values.prompt_default_price) },
        { key: 'commission_settle_minutes', value: String(values.commission_settle_minutes) },
        { key: 'register_bonus', value: String(values.register_bonus) },
        { key: 'recharge_min_amount', value: String(values.recharge_min_amount) },
        { key: 'recharge_max_amount', value: String(values.recharge_max_amount) },
        { key: 'min_withdrawal_amount', value: String(values.min_withdrawal_amount) },
        { key: 'max_daily_withdrawal', value: String(values.max_daily_withdrawal) },
        { key: 'max_single_transfer', value: String(values.max_single_transfer) },
      ];

      // 保存系统配置
      const configRes: any = await api.put('/system-config', { configs });

      // 同时更新 normal 分类的佣金比例
      if (normalCategoryId) {
        await api.put(`/admin/user-categories/${normalCategoryId}`, {
          default_course_rate: values.commission_rate_course,
          default_membership_rate: values.commission_rate_membership
        });
      }

      if (configRes.success) {
        message.success('配置保存成功');
        fetchConfig(); // 重新加载
      } else {
        message.error(configRes.message || '保存失败');
      }
    } catch (error) {
      message.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      {/* 页面标题 */}
      <div className="page-header">
        <div>
          <h1 className="page-title">价格管理</h1>
          <p className="page-subtitle">配置会员价格、功能费率和推广设置</p>
        </div>
        <Button
          type="primary"
          icon={<SaveOutlined />}
          onClick={handleSave}
          loading={saving}
        >
          保存配置
        </Button>
      </div>

      <Form form={form} layout="vertical">
        <Row gutter={[20, 20]}>
          {/* 会员价格 */}
          <Col xs={24} lg={12}>
            <Card
              title={
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CrownOutlined style={{ color: '#f59e0b' }} />
                  会员价格
                </span>
              }
              bordered={false}
            >
              <Form.Item
                name="yearly_membership_price"
                label="年度会员价格"
                rules={[{ required: true, message: '请输入年度会员价格' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  prefix="¥"
                  suffix="/ 年"
                  min={0}
                  precision={0}
                />
              </Form.Item>

              <Form.Item
                name="course_price"
                label="课程学员价格"
                rules={[{ required: true, message: '请输入课程价格' }]}
                extra="课程学员自动获得一年会员权限"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  prefix="¥"
                  suffix="/ 永久"
                  min={0}
                  precision={0}
                />
              </Form.Item>

              <Form.Item
                name="course_original_price"
                label="课程原价"
                rules={[{ required: true, message: '请输入课程原价' }]}
                extra="显示在课程页面的划线原价"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  prefix="¥"
                  min={0}
                  precision={0}
                />
              </Form.Item>
            </Card>
          </Col>

          {/* 视频提取费率 */}
          <Col xs={24} lg={12}>
            <Card
              title={
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <VideoCameraOutlined style={{ color: '#0ea5e9' }} />
                  视频提取费率
                </span>
              }
              bordered={false}
            >
              <Form.Item
                name="video_rate_normal"
                label="普通用户费率"
                rules={[{ required: true, message: '请输入普通用户费率' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  prefix="¥"
                  suffix="/ 秒"
                  min={0}
                  step={0.001}
                  precision={4}
                />
              </Form.Item>

              <Form.Item
                name="video_rate_yearly"
                label="年度会员费率"
                rules={[{ required: true, message: '请输入年度会员费率' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  prefix="¥"
                  suffix="/ 秒"
                  min={0}
                  step={0.001}
                  precision={4}
                />
              </Form.Item>

              <Form.Item
                name="video_rate_course"
                label="课程学员费率"
                rules={[{ required: true, message: '请输入课程学员费率' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  prefix="¥"
                  suffix="/ 秒"
                  min={0}
                  step={0.0001}
                  precision={4}
                />
              </Form.Item>
            </Card>
          </Col>

          {/* 提示词设置 */}
          <Col xs={24} lg={12}>
            <Card
              title={
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MessageOutlined style={{ color: '#a855f7' }} />
                  提示词设置
                </span>
              }
              bordered={false}
            >
              <Form.Item
                name="prompt_default_price"
                label="提示词默认价格"
                rules={[{ required: true, message: '请输入默认价格' }]}
                extra="新建提示词时的默认价格"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  prefix="¥"
                  min={0}
                  precision={2}
                />
              </Form.Item>
            </Card>
          </Col>

          {/* 推广设置 */}
          <Col xs={24} lg={12}>
            <Card
              title={
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <PercentageOutlined style={{ color: '#22c55e' }} />
                  推广设置（普通会员默认）
                </span>
              }
              bordered={false}
              extra={<span style={{ fontSize: 12, color: '#94a3b8' }}>其他分类请前往「分佣设置」</span>}
            >
              <Form.Item
                name="commission_rate_course"
                label="课程购买佣金比例"
                rules={[{ required: true, message: '请输入课程佣金比例' }]}
                extra="普通会员推荐好友购买课程时的默认返利比例"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  suffix="%"
                  min={0}
                  max={100}
                  precision={0}
                />
              </Form.Item>

              <Form.Item
                name="commission_rate_membership"
                label="会员购买佣金比例"
                rules={[{ required: true, message: '请输入会员佣金比例' }]}
                extra="普通会员推荐好友购买年度会员时的默认返利比例"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  suffix="%"
                  min={0}
                  max={100}
                  precision={0}
                />
              </Form.Item>

              <Form.Item
                name="commission_settle_minutes"
                label="佣金结算周期"
                rules={[{ required: true, message: '请输入结算周期' }]}
                extra="佣金产生后需等待的分钟数（默认21600分钟=15天，测试可设为1分钟）"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  suffix="分钟"
                  min={0}
                  max={999999}
                  precision={0}
                />
              </Form.Item>
            </Card>
          </Col>

          {/* 充值设置 */}
          <Col xs={24}>
            <Card
              title={
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <GiftOutlined style={{ color: '#ef4444' }} />
                  充值设置
                </span>
              }
              bordered={false}
            >
              <Row gutter={20}>
                <Col xs={24} sm={8}>
                  <Form.Item
                    name="register_bonus"
                    label="注册赠金"
                    rules={[{ required: true, message: '请输入注册赠金' }]}
                    extra="新用户注册时赠送的金额"
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      prefix="¥"
                      min={0}
                      precision={2}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={8}>
                  <Form.Item
                    name="recharge_min_amount"
                    label="最低充值金额"
                    rules={[{ required: true, message: '请输入最低充值金额' }]}
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      prefix="¥"
                      min={0.01}
                      precision={2}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={8}>
                  <Form.Item
                    name="recharge_max_amount"
                    label="最高充值金额"
                    rules={[{ required: true, message: '请输入最高充值金额' }]}
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      prefix="¥"
                      min={1}
                      precision={0}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          </Col>

          {/* 提现设置 */}
          <Col xs={24}>
            <Card
              title={
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <WalletOutlined style={{ color: '#06b6d4' }} />
                  提现设置
                </span>
              }
              bordered={false}
            >
              <Row gutter={20}>
                <Col xs={24} sm={8}>
                  <Form.Item
                    name="min_withdrawal_amount"
                    label="最低提现金额"
                    rules={[{ required: true, message: '请输入最低提现金额' }]}
                    extra="用户单次提现的最低金额限制"
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      prefix="¥"
                      min={1}
                      precision={0}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={8}>
                  <Form.Item
                    name="max_daily_withdrawal"
                    label="每日提现上限"
                    rules={[{ required: true, message: '请输入每日提现上限' }]}
                    extra="用户每日累计提现的最高金额"
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      prefix="¥"
                      min={1}
                      precision={0}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={8}>
                  <Form.Item
                    name="max_single_transfer"
                    label="单笔转账上限"
                    rules={[{ required: true, message: '请输入单笔转账上限' }]}
                    extra="微信单笔转账金额上限（超过自动拆分）"
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      prefix="¥"
                      min={1}
                      max={200}
                      precision={0}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>
      </Form>

      {/* 赠金规则管理 */}
      <Card
        title={
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <GiftOutlined style={{ color: '#f59e0b' }} />
            充值赠金规则
          </span>
        }
        bordered={false}
        style={{ marginTop: 20 }}
        extra={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button icon={<PlusOutlined />} onClick={handleAddBonusRule}>
              添加规则
            </Button>
            <Button type="primary" icon={<SaveOutlined />} onClick={handleSaveBonusRules} loading={savingBonus}>
              保存规则
            </Button>
          </div>
        }
      >
        <Table
          dataSource={bonusRules}
          rowKey={(record, index) => record.id?.toString() || `new-${index}`}
          pagination={false}
          size="small"
          columns={[
            {
              title: '最低金额 (¥)',
              dataIndex: 'min_amount',
              width: 120,
              render: (value, _, index) => (
                <InputNumber
                  value={value}
                  min={0}
                  precision={0}
                  style={{ width: '100%' }}
                  onChange={(v) => handleBonusRuleChange(index, 'min_amount', v || 0)}
                />
              )
            },
            {
              title: '赠送比例',
              dataIndex: 'bonus_rate',
              width: 120,
              render: (value, _, index) => (
                <InputNumber
                  value={value * 100}
                  min={0}
                  max={100}
                  precision={0}
                  addonAfter="%"
                  style={{ width: '100%' }}
                  onChange={(v) => handleBonusRuleChange(index, 'bonus_rate', (v || 0) / 100)}
                />
              )
            },
            {
              title: '赠送金额',
              width: 100,
              render: (_, record) => {
                const amount = Math.round(record.min_amount * record.bonus_rate);
                return <span style={{ color: amount > 0 ? '#22c55e' : '#94a3b8' }}>¥{amount}</span>;
              }
            },
            {
              title: '显示文本',
              dataIndex: 'display_text',
              render: (value, _, index) => (
                <Input
                  value={value}
                  style={{ width: '100%' }}
                  onChange={(e) => handleBonusRuleChange(index, 'display_text', e.target.value)}
                />
              )
            },
            {
              title: '优先级',
              dataIndex: 'priority',
              width: 80,
              render: (value, _, index) => (
                <InputNumber
                  value={value}
                  min={0}
                  precision={0}
                  style={{ width: '100%' }}
                  onChange={(v) => handleBonusRuleChange(index, 'priority', v || 0)}
                />
              )
            },
            {
              title: '启用',
              dataIndex: 'is_active',
              width: 70,
              render: (value, _, index) => (
                <Switch
                  checked={value}
                  onChange={(v) => handleBonusRuleChange(index, 'is_active', v)}
                />
              )
            },
            {
              title: '操作',
              width: 60,
              render: (_, __, index) => (
                <Popconfirm
                  title="确定删除此规则？"
                  onConfirm={() => handleDeleteBonusRule(index)}
                  okText="确定"
                  cancelText="取消"
                >
                  <Button type="text" danger icon={<DeleteOutlined />} size="small" />
                </Popconfirm>
              )
            }
          ]}
        />
        <div style={{ marginTop: 12, color: '#64748b', fontSize: 12 }}>
          提示：优先级越高的规则越先匹配。例如用户充值150元，会优先匹配"充100送15"的规则。
        </div>
      </Card>

      {/* 价格预览 */}
      <Card title="价格预览" bordered={false} style={{ marginTop: 20 }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
        }}>
          <div style={{
            padding: 20,
            background: '#fff7ed',
            borderRadius: 12,
            textAlign: 'center',
          }}>
            <CrownOutlined style={{ fontSize: 32, color: '#f59e0b', marginBottom: 12 }} />
            <div style={{ fontSize: 14, color: '#64748b', marginBottom: 4 }}>年度会员</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#0f172a' }}>
              ¥{yearlyPrice ?? 299}
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>/ 年</div>
          </div>

          <div style={{
            padding: 20,
            background: '#faf5ff',
            borderRadius: 12,
            textAlign: 'center',
          }}>
            <CrownOutlined style={{ fontSize: 32, color: '#a855f7', marginBottom: 12 }} />
            <div style={{ fontSize: 14, color: '#64748b', marginBottom: 4 }}>课程学员</div>
            {courseOriginalPrice && courseOriginalPrice > (coursePrice ?? 0) && (
              <div style={{ fontSize: 12, color: '#94a3b8', textDecoration: 'line-through', marginBottom: 4 }}>
                原价 ¥{courseOriginalPrice}
              </div>
            )}
            <div style={{ fontSize: 28, fontWeight: 700, color: '#0f172a' }}>
              ¥{coursePrice ?? 799}
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>/ 永久</div>
          </div>

          <div style={{
            padding: 20,
            background: '#eff6ff',
            borderRadius: 12,
            textAlign: 'center',
          }}>
            <VideoCameraOutlined style={{ fontSize: 32, color: '#0ea5e9', marginBottom: 12 }} />
            <div style={{ fontSize: 14, color: '#64748b', marginBottom: 4 }}>视频提取(普通)</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#0f172a' }}>
              ¥{videoRateNormal ?? 0.02}
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>/ 秒</div>
          </div>

          <div style={{
            padding: 20,
            background: '#f0fdf4',
            borderRadius: 12,
            textAlign: 'center',
          }}>
            <PercentageOutlined style={{ fontSize: 32, color: '#22c55e', marginBottom: 12 }} />
            <div style={{ fontSize: 14, color: '#64748b', marginBottom: 4 }}>课程推广</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#0f172a' }}>
              {commissionRateCourse ?? 10}%
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>课程佣金</div>
          </div>

          <div style={{
            padding: 20,
            background: '#fef3c7',
            borderRadius: 12,
            textAlign: 'center',
          }}>
            <PercentageOutlined style={{ fontSize: 32, color: '#f59e0b', marginBottom: 12 }} />
            <div style={{ fontSize: 14, color: '#64748b', marginBottom: 4 }}>会员推广</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#0f172a' }}>
              {commissionRateMembership ?? 10}%
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>会员佣金</div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Pricing;
