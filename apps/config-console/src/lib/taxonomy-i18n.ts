/**
 * 配置域 / 配置组 名称与描述的英译（仅渲染层使用，不改数据）。
 *
 * 背景：配置数据（domain / group 名）来自服务端且是中文；i18n 只覆盖了界面文案与
 * 编辑器 label。`.com` 默认英文时会出现「英文外壳 + 中文域/组」的混排，看起来像内容错乱。
 * 这里给出稳定映射，渲染时按语言替换；**URL / 过滤 / 写接口仍用原始中文名**。
 */

export const DOMAIN_I18N: Record<string, { name: string; desc: string }> = {
  数据库: { name: 'Database', desc: 'Endpoints, pools, GORM behavior; passwords live in the Secret Center' },
  运行与接口: { name: 'Runtime & API', desc: 'Ports, gRPC, HTTP/CORS, Swagger, routing' },
  认证与安全: { name: 'Auth & Security', desc: 'JWT, login policy, MFA, CAPTCHA, sessions' },
  缓存与消息: { name: 'Cache & Messaging', desc: 'Redis, Kafka, RabbitMQ, Outbox delivery' },
  限流与配额: { name: 'Rate Limits & Quotas', desc: 'API rate limits, quotas, body limits, idempotency' },
  业务与运营: { name: 'Business & Ops', desc: 'Points, wallet, FX rates, export, profile policies' },
  存储与搜索: { name: 'Storage & Search', desc: 'MinIO, SeaweedFS, COS/OSS, Elasticsearch' },
  集成与回调: { name: 'Integrations & Callbacks', desc: 'Login providers, SAML, OAuth, webhooks' },
  邮件与短信: { name: 'Email & SMS', desc: 'SMTP, notification email, SMS, push' },
  密钥与加密: { name: 'Secrets & Encryption', desc: 'Secret service client, encryption keys, webhook keys' },
  治理与合规: { name: 'Governance & Compliance', desc: 'Compliance, privacy, audit retention, platform' },
  校验规则: { name: 'Validation Rules', desc: 'Validation rules embedded in configuration (metadata)' },
  日志与观测: { name: 'Logs & Observability', desc: 'Log level/format, metrics and search' },
};

export const GROUP_I18N: Record<string, string> = {
  'GORM 行为': 'GORM Behavior',
  驱动: 'Driver',
  其他: 'Other',
  'Nacos 注册中心': 'Nacos Registry',
  队列与投递: 'Queues & Delivery',
  '腾讯 COS': 'Tencent COS',
  '阿里 OSS': 'Alibaba OSS',
  存储策略: 'Storage Policy',
  短信与推送: 'SMS & Push',
  邮件发送: 'Email Delivery',
  通知开关: 'Notification Toggles',
  校验规则: 'Validation Rules',
  登录与安全策略: 'Login & Security Policy',
  验证码: 'CAPTCHA',
  密码与哈希: 'Password & Hashing',
  会话: 'Sessions',
  令牌与其他: 'Tokens & Others',
  身份服务客户端: 'Identity Service Client',
  哈希服务: 'Hashing Service',
  钱包与计费: 'Wallet & Billing',
  认证与实名: 'Identity Verification',
  导出: 'Export',
  风控: 'Risk Control',
  积分: 'Points',
  个人资料策略: 'Profile Policies',
  汇率: 'FX Rates',
  接口限流: 'API Rate Limits',
  幂等: 'Idempotency',
  配额: 'Quotas',
  请求限制: 'Request Limits',
  平台: 'Platform',
  审计与留存: 'Audit & Retention',
  合规: 'Compliance',
  隐私: 'Privacy',
  'HTTP 与跨域': 'HTTP & CORS',
  文档与暴露: 'Docs & Exposure',
  应用: 'Application',
  服务与端口: 'Service & Ports',
  调度与韧性: 'Scheduling & Resilience',
  路由: 'Routing',
  实时通道: 'Realtime Channel',
  日志: 'Logs',
  指标与检索: 'Metrics & Search',
  加密参数: 'Encryption Parameters',
  密钥服务客户端: 'Secret Service Client',
  内置密钥: 'Built-in Keys',
  密钥策略: 'Secret Policy',
  'Webhook 密钥': 'Webhook Keys',
  '回调与 Webhook': 'Callbacks & Webhooks',
  站点与开发者: 'Sites & Developers',
  第三方服务: 'Third-party Services',
  登录提供商: 'Login Providers',
  'OAuth 客户端': 'OAuth Clients',
};

const isEnglish = (lang?: string | null): boolean => (lang ?? '').toLowerCase().startsWith('en');

/** 域显示名（en 且命中映射时替换；URL / API 参数仍用原名）。 */
export function localizeDomainName(name: string, lang?: string | null): string {
  if (!isEnglish(lang)) return name;
  return DOMAIN_I18N[name]?.name ?? name;
}

/** 域描述（优先映射；未命中时回退传入的原始描述）。 */
export function localizeDomainDesc(name: string, desc: string | undefined, lang?: string | null): string {
  if (!isEnglish(lang)) return desc ?? '';
  return DOMAIN_I18N[name]?.desc ?? desc ?? '';
}

/** 组显示名（en 且命中映射时替换）。 */
export function localizeGroupName(name: string, lang?: string | null): string {
  if (!isEnglish(lang)) return name;
  return GROUP_I18N[name] ?? name;
}
