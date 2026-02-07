import { useState, useEffect } from 'react';
import { Card, Button, message, Tabs, Spin, Descriptions, Tag, Row, Col, Input, Upload } from 'antd';
import type { UploadProps } from 'antd';
import {
  ReloadOutlined,
  AlipayCircleOutlined,
  WechatOutlined,
  MessageOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  SaveOutlined,
  QrcodeOutlined,
  LoadingOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import api from '../../api/request';

interface ServiceStatus {
  status: 'active' | 'inactive';
  statusText: string;
  [key: string]: any;
}

interface ConfigOverview {
  alipay: { name: string; status: string; statusText: string };
  wechat_pay: { name: string; status: string; statusText: string };
  wechat_mp: { name: string; status: string; statusText: string };
  wechat_transfer: { name: string; status: string; statusText: string };
  sms: { name: string; status: string; statusText: string };
}

const Settings = () => {
  // 第三方服务配置状态
  const [overview, setOverview] = useState<ConfigOverview | null>(null);
  const [alipayConfig, setAlipayConfig] = useState<ServiceStatus | null>(null);
  const [wechatPayConfig, setWechatPayConfig] = useState<ServiceStatus | null>(null);
  const [wechatMpConfig, setWechatMpConfig] = useState<ServiceStatus | null>(null);
  const [wechatTransferConfig, setWechatTransferConfig] = useState<ServiceStatus | null>(null);
  const [smsConfig, setSmsConfig] = useState<ServiceStatus | null>(null);
  const [thirdPartyLoading, setThirdPartyLoading] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testing, setTesting] = useState<string | null>(null);

  // 协议条款状态
  const [termsOfService, setTermsOfService] = useState('');
  const [privacyPolicy, setPrivacyPolicy] = useState('');
  const [agreementsLoading, setAgreementsLoading] = useState(false);
  const [savingAgreements, setSavingAgreements] = useState(false);

  // 课程二维码状态
  const [courseQrCode, setCourseQrCode] = useState('');
  const [qrCodeLoading, setQrCodeLoading] = useState(false);
  const [savingQrCode, setSavingQrCode] = useState(false);
  const [uploading, setUploading] = useState(false);

  // 加载第三方服务配置
  const loadThirdPartyConfigs = async () => {
    setThirdPartyLoading(true);
    try {
      const [overviewRes, alipayRes, wechatPayRes, wechatMpRes, wechatTransferRes, smsRes] = await Promise.all([
        api.get('/admin/third-party/overview'),
        api.get('/admin/third-party/alipay'),
        api.get('/admin/third-party/wechat-pay'),
        api.get('/admin/third-party/wechat-mp'),
        api.get('/admin/third-party/wechat-transfer'),
        api.get('/admin/third-party/sms'),
      ]);

      if ((overviewRes as any).success) setOverview((overviewRes as any).data);
      if ((alipayRes as any).success) setAlipayConfig((alipayRes as any).data);
      if ((wechatPayRes as any).success) setWechatPayConfig((wechatPayRes as any).data);
      if ((wechatMpRes as any).success) setWechatMpConfig((wechatMpRes as any).data);
      if ((wechatTransferRes as any).success) setWechatTransferConfig((wechatTransferRes as any).data);
      if ((smsRes as any).success) setSmsConfig((smsRes as any).data);
    } catch (error) {
      console.error('加载第三方配置失败:', error);
    } finally {
      setThirdPartyLoading(false);
    }
  };

  // 加载协议内容
  const loadAgreements = async () => {
    setAgreementsLoading(true);
    try {
      const res: any = await api.get('/system-config/agreements');
      if (res.success) {
        setTermsOfService(res.data.termsOfService || '');
        setPrivacyPolicy(res.data.privacyPolicy || '');
      }
    } catch (error) {
      console.error('加载协议内容失败:', error);
    } finally {
      setAgreementsLoading(false);
    }
  };

  // 保存协议内容
  const saveAgreements = async () => {
    setSavingAgreements(true);
    try {
      const res: any = await api.put('/system-config', {
        configs: [
          { key: 'terms_of_service', value: termsOfService },
          { key: 'privacy_policy', value: privacyPolicy }
        ]
      });
      if (res.success) {
        message.success('协议内容保存成功');
      } else {
        message.error(res.message || '保存失败');
      }
    } catch (error: any) {
      message.error(error.message || '保存失败');
    } finally {
      setSavingAgreements(false);
    }
  };

  // 加载课程二维码
  const loadCourseQrCode = async () => {
    setQrCodeLoading(true);
    try {
      const res: any = await api.get('/system-config/course_qr_code');
      if (res.success) {
        setCourseQrCode(res.data.value || '');
      }
    } catch (error) {
      console.error('加载课程二维码失败:', error);
    } finally {
      setQrCodeLoading(false);
    }
  };

  // 保存课程二维码
  const saveCourseQrCode = async () => {
    setSavingQrCode(true);
    try {
      const res: any = await api.put('/system-config', {
        configs: [
          { key: 'course_qr_code', value: courseQrCode }
        ]
      });
      if (res.success) {
        message.success('课程二维码保存成功');
      } else {
        message.error(res.message || '保存失败');
      }
    } catch (error: any) {
      message.error(error.message || '保存失败');
    } finally {
      setSavingQrCode(false);
    }
  };

  useEffect(() => {
    loadThirdPartyConfigs();
    loadAgreements();
    loadCourseQrCode();
  }, []);

  // 测试服务连接
  const handleTestService = async (service: string) => {
    setTesting(service);
    try {
      const res: any = await api.post(`/admin/third-party/${service}/test`);
      if (res.success) {
        message.success(res.message || '连接测试成功');
      } else {
        message.error(res.message || '连接测试失败');
      }
    } catch (error: any) {
      message.error(error.message || '连接测试失败');
    } finally {
      setTesting(null);
    }
  };

  // 测试短信发送
  const handleTestSms = async () => {
    if (!testPhone) {
      message.warning('请输入测试手机号');
      return;
    }
    setTesting('sms');
    try {
      const res: any = await api.post('/admin/third-party/sms/test', { phone: testPhone });
      if (res.success) {
        message.success('测试短信已发送');
      } else {
        message.error(res.message || '发送失败');
      }
    } catch (error: any) {
      message.error(error.message || '发送失败');
    } finally {
      setTesting(null);
    }
  };

  // 状态图标
  const StatusIcon = ({ status }: { status: string }) => {
    if (status === 'active') {
      return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
    }
    return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
  };

  // 业务配置 Tab
  const BusinessConfigTab = () => (
    <div>
      <Card
        title="配置说明"
        bordered={false}
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          marginBottom: 24
        }}
      >
        <div style={{ fontSize: 16, marginBottom: 12 }}>
          <strong>价格配置已迁移</strong>
        </div>
        <div style={{ fontSize: 14, opacity: 0.95 }}>
          所有价格相关的配置（会员价格、课程价格、视频费率、佣金比例、充值设置等）已迁移至左侧菜单的 <strong>「价格管理」</strong> 页面，
          请前往该页面进行价格配置管理。
        </div>
        <div style={{ fontSize: 14, opacity: 0.95, marginTop: 12 }}>
          本页面主要用于管理第三方服务配置（支付宝、微信支付、短信服务等）。
        </div>
      </Card>
    </div>
  );

  // 第三方服务概览 Tab
  const ThirdPartyOverviewTab = () => (
    <Spin spinning={thirdPartyLoading}>
      <div style={{ marginBottom: 24 }}>
        <Button icon={<ReloadOutlined />} onClick={loadThirdPartyConfigs}>
          刷新状态
        </Button>
      </div>

      <Row gutter={[16, 16]}>
        {overview && Object.entries(overview).map(([key, service]) => (
          <Col xs={24} sm={12} lg={6} key={key}>
            <Card
              size="small"
              style={{
                borderColor: service.status === 'active' ? '#52c41a' : '#d9d9d9',
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>
                  {key === 'alipay' && <AlipayCircleOutlined style={{ color: '#1677ff' }} />}
                  {key === 'wechat_pay' && <WechatOutlined style={{ color: '#07c160' }} />}
                  {key === 'wechat_mp' && <WechatOutlined style={{ color: '#07c160' }} />}
                  {key === 'sms' && <MessageOutlined style={{ color: '#1890ff' }} />}
                </div>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>{service.name}</div>
                <Tag color={service.status === 'active' ? 'success' : 'default'}>
                  <StatusIcon status={service.status} /> {service.statusText}
                </Tag>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Card title="配置说明" style={{ marginTop: 24 }} size="small">
        <Descriptions column={1} size="small">
          <Descriptions.Item label={<><ExclamationCircleOutlined /> 说明</>}>
            第三方服务配置通过服务器环境变量管理，如需修改请联系技术人员编辑 .env 文件并重启服务。
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </Spin>
  );

  // 支付宝配置 Tab
  const AlipayConfigTab = () => (
    <Spin spinning={thirdPartyLoading}>
      {alipayConfig && (
        <>
          <Card
            title={
              <span>
                <AlipayCircleOutlined style={{ color: '#1677ff', marginRight: 8 }} />
                支付宝支付配置
                <Tag color={alipayConfig.status === 'active' ? 'success' : 'error'} style={{ marginLeft: 12 }}>
                  {alipayConfig.statusText}
                </Tag>
              </span>
            }
            extra={
              <Button
                type="primary"
                size="small"
                loading={testing === 'alipay'}
                onClick={() => handleTestService('alipay')}
                disabled={alipayConfig.status !== 'active'}
              >
                测试连接
              </Button>
            }
          >
            <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
              <Descriptions.Item label="应用 ID">{alipayConfig.app_id}</Descriptions.Item>
              <Descriptions.Item label="应用私钥">{alipayConfig.private_key}</Descriptions.Item>
              <Descriptions.Item label="支付网关">{alipayConfig.gateway}</Descriptions.Item>
              <Descriptions.Item label="签名类型">RSA2</Descriptions.Item>
              <Descriptions.Item label="应用公钥证书">{alipayConfig.app_cert_path}</Descriptions.Item>
              <Descriptions.Item label="支付宝公钥证书">{alipayConfig.public_cert_path}</Descriptions.Item>
              <Descriptions.Item label="支付宝根证书">{alipayConfig.root_cert_path}</Descriptions.Item>
              <Descriptions.Item label="异步通知地址" span={2}>{alipayConfig.notify_url}</Descriptions.Item>
              <Descriptions.Item label="同步跳转地址" span={2}>{alipayConfig.return_url}</Descriptions.Item>
            </Descriptions>
          </Card>
        </>
      )}
    </Spin>
  );

  // 微信支付配置 Tab
  const WechatPayConfigTab = () => (
    <Spin spinning={thirdPartyLoading}>
      {wechatPayConfig && (
        <>
          <Card
            title={
              <span>
                <WechatOutlined style={{ color: '#07c160', marginRight: 8 }} />
                微信支付配置
                <Tag color={wechatPayConfig.status === 'active' ? 'success' : 'error'} style={{ marginLeft: 12 }}>
                  {wechatPayConfig.statusText}
                </Tag>
              </span>
            }
            extra={
              <Button
                type="primary"
                size="small"
                loading={testing === 'wechat-pay'}
                onClick={() => handleTestService('wechat-pay')}
                disabled={wechatPayConfig.status !== 'active'}
              >
                测试连接
              </Button>
            }
          >
            <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
              <Descriptions.Item label="应用 ID">{wechatPayConfig.app_id}</Descriptions.Item>
              <Descriptions.Item label="商户号">{wechatPayConfig.mch_id}</Descriptions.Item>
              <Descriptions.Item label="API 密钥 V2">{wechatPayConfig.api_key_v2}</Descriptions.Item>
              <Descriptions.Item label="API 密钥 V3">{wechatPayConfig.api_key_v3}</Descriptions.Item>
              <Descriptions.Item label="商户证书">{wechatPayConfig.cert_path}</Descriptions.Item>
              <Descriptions.Item label="商户私钥">{wechatPayConfig.key_path}</Descriptions.Item>
              <Descriptions.Item label="异步通知地址" span={2}>{wechatPayConfig.notify_url}</Descriptions.Item>
              <Descriptions.Item label="同步跳转地址" span={2}>{wechatPayConfig.return_url}</Descriptions.Item>
            </Descriptions>
          </Card>

          {wechatMpConfig && (
            <Card
              title={
                <span>
                  <WechatOutlined style={{ color: '#07c160', marginRight: 8 }} />
                  微信公众号配置
                  <Tag color={wechatMpConfig.status === 'active' ? 'success' : 'error'} style={{ marginLeft: 12 }}>
                    {wechatMpConfig.statusText}
                  </Tag>
                </span>
              }
              style={{ marginTop: 16 }}
            >
              <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
                <Descriptions.Item label="公众号 AppID">{wechatMpConfig.app_id}</Descriptions.Item>
                <Descriptions.Item label="AppSecret">{wechatMpConfig.app_secret}</Descriptions.Item>
                <Descriptions.Item label="消息 Token">{wechatMpConfig.mp_token}</Descriptions.Item>
              </Descriptions>
            </Card>
          )}

          {wechatTransferConfig && (
            <Card
              title={
                <span>
                  <WechatOutlined style={{ color: '#07c160', marginRight: 8 }} />
                  微信转账配置（提现功能）
                  <Tag color={wechatTransferConfig.status === 'active' ? 'success' : 'error'} style={{ marginLeft: 12 }}>
                    {wechatTransferConfig.statusText}
                  </Tag>
                </span>
              }
              style={{ marginTop: 16 }}
            >
              <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
                <Descriptions.Item label="应用 ID">{wechatTransferConfig.app_id}</Descriptions.Item>
                <Descriptions.Item label="商户号">{wechatTransferConfig.mch_id}</Descriptions.Item>
                <Descriptions.Item label="API 密钥 V3">{wechatTransferConfig.api_key_v3}</Descriptions.Item>
                <Descriptions.Item label="商户证书序列号">{wechatTransferConfig.serial_no}</Descriptions.Item>
                <Descriptions.Item label="商户证书">{wechatTransferConfig.cert_path}</Descriptions.Item>
                <Descriptions.Item label="商户私钥">{wechatTransferConfig.key_path}</Descriptions.Item>
              </Descriptions>
            </Card>
          )}
        </>
      )}
    </Spin>
  );

  // 协议管理 Tab
  const AgreementsTab = () => (
    <Spin spinning={agreementsLoading}>
      <div style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          icon={<SaveOutlined />}
          onClick={saveAgreements}
          loading={savingAgreements}
        >
          保存协议内容
        </Button>
        <Button
          icon={<ReloadOutlined />}
          onClick={loadAgreements}
          style={{ marginLeft: 8 }}
        >
          重新加载
        </Button>
      </div>

      <Card title="服务条款" style={{ marginBottom: 16 }}>
        <Input.TextArea
          value={termsOfService}
          onChange={(e) => setTermsOfService(e.target.value)}
          placeholder="请输入服务条款内容..."
          rows={12}
          style={{ fontFamily: 'monospace' }}
        />
        <div style={{ marginTop: 8, color: '#999', fontSize: 12 }}>
          提示：此内容将在用户注册/登录时展示，请确保内容完整、合规。
        </div>
      </Card>

      <Card title="隐私政策">
        <Input.TextArea
          value={privacyPolicy}
          onChange={(e) => setPrivacyPolicy(e.target.value)}
          placeholder="请输入隐私政策内容..."
          rows={12}
          style={{ fontFamily: 'monospace' }}
        />
        <div style={{ marginTop: 8, color: '#999', fontSize: 12 }}>
          提示：此内容将在用户注册/登录时展示，请确保内容完整、合规。
        </div>
      </Card>
    </Spin>
  );

  // 课程二维码配置 Tab
  const CourseQrCodeTab = () => {
    // 上传配置
    const uploadProps: UploadProps = {
      name: 'file',
      action: '/api/upload/images',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      showUploadList: false,
      accept: 'image/*',
      beforeUpload: (file) => {
        const isImage = file.type.startsWith('image/');
        if (!isImage) {
          message.error('只能上传图片文件');
          return false;
        }
        const isLt5M = file.size / 1024 / 1024 < 5;
        if (!isLt5M) {
          message.error('图片大小不能超过5MB');
          return false;
        }
        setUploading(true);
        return true;
      },
      onChange: (info) => {
        if (info.file.status === 'done') {
          setUploading(false);
          if (info.file.response?.success) {
            const url = info.file.response.data.url;
            setCourseQrCode(url);
            message.success('上传成功');
          } else {
            message.error(info.file.response?.message || '上传失败');
          }
        } else if (info.file.status === 'error') {
          setUploading(false);
          message.error('上传失败');
        }
      },
    };

    const uploadButton = (
      <div>
        {uploading ? <LoadingOutlined /> : <PlusOutlined />}
        <div style={{ marginTop: 8 }}>{uploading ? '上传中...' : '上传二维码'}</div>
      </div>
    );

    return (
      <Spin spinning={qrCodeLoading}>
        <div style={{ marginBottom: 16 }}>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={saveCourseQrCode}
            loading={savingQrCode}
          >
            保存二维码
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={loadCourseQrCode}
            style={{ marginLeft: 8 }}
          >
            重新加载
          </Button>
        </div>

        <Card title="课程群二维码配置" style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>上传二维码图片</div>
            <Upload
              {...uploadProps}
              listType="picture-card"
              className="qrcode-uploader"
            >
              {courseQrCode ? (
                <img src={courseQrCode} alt="课程群二维码" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                uploadButton
              )}
            </Upload>
            {courseQrCode && (
              <Button
                type="link"
                danger
                onClick={() => setCourseQrCode('')}
                style={{ padding: 0, marginTop: 8 }}
              >
                删除图片
              </Button>
            )}
            <div style={{ color: '#999', fontSize: 12, marginTop: 16 }}>
              提示：点击上方区域上传二维码图片，支持 jpg、png 等格式，大小不超过 5MB。二维码会在以下场景展示：
              <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                <li>用户购买课程成功后的弹窗中</li>
                <li>课程学员在个人中心查看时</li>
              </ul>
            </div>
          </div>

          {courseQrCode && (
            <div style={{ marginTop: 16 }}>
              <div style={{ marginBottom: 8, fontWeight: 500 }}>图片地址</div>
              <Input value={courseQrCode} readOnly style={{ marginBottom: 8 }} />
            </div>
          )}
        </Card>

        <Card title="使用说明" size="small">
          <Descriptions column={1} size="small">
            <Descriptions.Item label={<><ExclamationCircleOutlined /> 重要提示</>}>
              微信群二维码有有效期限制（一般7天），过期后需要及时更新。建议定期检查二维码是否有效。
            </Descriptions.Item>
            <Descriptions.Item label="推荐做法">
              使用企业微信客服二维码或微信公众号二维码，这些二维码长期有效。
            </Descriptions.Item>
          </Descriptions>
        </Card>
      </Spin>
    );
  };

  // 短信配置 Tab
  const SmsConfigTab = () => (
    <Spin spinning={thirdPartyLoading}>
      {smsConfig && (
        <Card
          title={
            <span>
              <MessageOutlined style={{ color: '#1890ff', marginRight: 8 }} />
              阿里云短信配置
              <Tag color={smsConfig.status === 'active' ? 'success' : 'error'} style={{ marginLeft: 12 }}>
                {smsConfig.statusText}
              </Tag>
            </span>
          }
          extra={
            <div style={{ display: 'flex', gap: 8 }}>
              <Input
                placeholder="测试手机号"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                style={{ width: 140 }}
                size="small"
              />
              <Button
                type="primary"
                size="small"
                loading={testing === 'sms'}
                onClick={handleTestSms}
                disabled={smsConfig.status !== 'active'}
              >
                发送测试
              </Button>
            </div>
          }
        >
          <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
            <Descriptions.Item label="服务状态">
              <Tag color={smsConfig.enabled ? 'success' : 'default'}>
                {smsConfig.enabled ? '已启用' : '未启用'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="服务商">{smsConfig.provider === 'aliyun' ? '阿里云' : smsConfig.provider}</Descriptions.Item>
            <Descriptions.Item label="AccessKey ID">{smsConfig.access_key_id}</Descriptions.Item>
            <Descriptions.Item label="AccessKey Secret">{smsConfig.access_key_secret}</Descriptions.Item>
            <Descriptions.Item label="短信签名" span={2}>{smsConfig.sign_name}</Descriptions.Item>
            <Descriptions.Item label="登录验证码模板">{smsConfig.template_code_login}</Descriptions.Item>
            <Descriptions.Item label="注册验证码模板">{smsConfig.template_code_register}</Descriptions.Item>
            <Descriptions.Item label="重置密码模板">{smsConfig.template_code_reset}</Descriptions.Item>
          </Descriptions>
        </Card>
      )}
    </Spin>
  );

  const items = [
    {
      key: 'business',
      label: '业务配置',
      children: <BusinessConfigTab />,
    },
    {
      key: 'overview',
      label: '服务概览',
      children: <ThirdPartyOverviewTab />,
    },
    {
      key: 'alipay',
      label: (
        <span>
          <AlipayCircleOutlined /> 支付宝
        </span>
      ),
      children: <AlipayConfigTab />,
    },
    {
      key: 'wechat',
      label: (
        <span>
          <WechatOutlined /> 微信
        </span>
      ),
      children: <WechatPayConfigTab />,
    },
    {
      key: 'sms',
      label: (
        <span>
          <MessageOutlined /> 短信
        </span>
      ),
      children: <SmsConfigTab />,
    },
    {
      key: 'agreements',
      label: (
        <span>
          <FileTextOutlined /> 协议管理
        </span>
      ),
      children: <AgreementsTab />,
    },
    {
      key: 'qrcode',
      label: (
        <span>
          <QrcodeOutlined /> 课程二维码
        </span>
      ),
      children: <CourseQrCodeTab />,
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800">系统设置</h2>
        <p className="text-gray-500 mt-1">管理系统配置、支付渠道和第三方服务</p>
      </div>
      <Card>
        <Tabs items={items} />
      </Card>
    </div>
  );
};

export default Settings;
