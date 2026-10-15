# 自行配置与部署

本项目提供源码，供学习和二次开发，不附带可直接使用的数据库、AI 额度、账号或密钥。部分功能明确停用，见 PREPUBLICATION_STATUS.md；填写配置不会自动启用这些功能。

## 1. 联网更新依赖后再运行

当前锁文件仍使用 Next.js 16.1.1。2026-10-14 官方公告中的 16.x 修复版本为 16.4.1；请先核对使用当天的官方公告、React 配套修复和兼容要求，选择届时已修复的版本。不要只改版本号而保留旧锁文件。

在能访问官方 npm registry 的环境中，以下以已公布的 16.4.1 为升级示例，并非永久最新版本：

```bash
corepack pnpm install --frozen-lockfile --ignore-scripts
corepack pnpm up next@16.4.1 eslint-config-next@16.4.1
corepack pnpm audit --audit-level high
corepack pnpm test
corepack pnpm ts-check
corepack pnpm lint:build
corepack pnpm build
```

核对并修复审计中适用的漏洞，同时更新需要配套修复的 React 和传递依赖；不要忽略失败退出码。更新后提交新的锁文件，重新核对第三方许可证声明。构建通过不代替浏览器和真实服务测试。详细公告链接见 DEPENDENCY_SECURITY.md。

## 2. 填写自己的配置

```bash
cp .env.example .env.local
```

Windows PowerShell 使用 `Copy-Item .env.example .env.local`。模板中留空的值需要自行申请或配置，不要将 `YOUR_KEY` 等示意文字当作可用密钥。保留空值可以使未配置功能明确拒绝服务。

| 配置 | 如何填写 |
| --- | --- |
| SUPABASE_URL、SUPABASE_SECRET_KEY | 自建隔离数据库的 URL 和服务器私钥；不能放进 NEXT_PUBLIC_ 配置 |
| PGDATABASE_URL | 仅在执行需要直连数据库的安装/测试工具时填写自己的连接串 |
| COZE_WORKLOAD_IDENTITY_API_KEY、COZE_INTEGRATION_MODEL_BASE_URL | 自己的 AI 服务凭据及模型网关地址 |
| COZE_INTEGRATION_BASE_URL | 使用相应搜索、语音或视频工具时填写自己的服务地址 |
| TIKHUB_API_KEY、VIDEO_PARSE_API_TOKEN、VIDEO_PARSE_API_CKEY | 仅在使用对应视频服务时填写自己申请的凭据 |
| EMERGENCY_ADMIN_KEY、CRON_SECRET、DEBUG_TOKEN | 使用对应维护入口时独立生成强随机值；前两项至少 32 字符，不用则留空 |
| ADMIN_USERNAME、ADMIN_PASSWORD | 默认用户名 admin；密码留空时由初始化工具生成独立强密码，没有统一默认密码 |
| KNOWLEDGE_PUBLIC_DATASETS、AI_MEDIA_ALLOWED_HOSTS | 只配置有权使用的公开知识库和自己的公开媒体域名；空值不授予访问权限 |

完整变量及注释以 `.env.example` 为准。只选择一种适合自己环境的数据库密钥配置，不要把兼容变量全部乱填。所有实际凭据只放在私有环境或部署平台的秘密变量中。

## 3. 初始化并验证自己的服务

数据库初始化 SQL 仅用于新建空测试库，见 DATABASE_INITIALIZATION.md；不要直接执行到旧生产库。配置数据库后运行 `corepack pnpm bootstrap-admin`，首次创建成功时妥善保存只显示一次的随机密码。

随后验证登录、会话注销、两账号之间的数据隔离、真实 AI 成功/失败/超时、额度与扣费，以及浏览器主要路径。当前本地测试记录不是对你的数据库或部署环境的验收。

充值、兑换、分佣、奖励、自动执行和退款等尚无可靠流水的功能已明确停用；需要完成对应实现和事务、并发及幂等测试后再恢复。不要只移除返回“暂不可用”的代码就接入真实资金。

## 4. 源码贡献和密钥

不提交 `.env.local`、真实用户资料、日志或服务端密钥。提交前运行 `node scripts/scan-public-source.cjs`。自动扫描不能保证识别所有秘密。

源码不包含原作者旧密钥。原作者仍应在供应商后台撤销曾写进旧代码的凭据；新使用者不需要也不应取得这些旧凭据。
