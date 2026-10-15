# AGENTS.md - 项目导航指南

## 项目概览

基于 Next.js 的短视频内容创作平台，集成 AI 能力辅助内容生产，包含完整的多层代理分销系统。

---

## ⭐ 核心功能（最重要的功能）

### 🎬 脚本创作
| 功能 | API | 说明 |
|------|-----|------|
| **生成脚本** | `POST /api/script/generate` | 根据主题生成完整脚本 |
| **对话脚本** | `POST /api/script/dialogue` | 生成问答/对话形式脚本 |
| **开场白** | `POST /api/script/opening` | 生成视频开场白 |
| **仿写脚本** | `POST /api/inspiration-cocreate/rewrite` | 基于爆款视频仿写脚本 |

**脚本类型 scriptType**:
- `story` - 讲故事
- `process` - 讲过程
- `knowledge` - 讲知识
- `opinion` - 讲观点
- `product` - 讲产品

### 🎯 智能推导创作（6步推导）
| 功能 | API | 说明 |
|------|-----|------|
| **生成脚本** | `POST /api/creative/generate` | 根据6步推导生成专属脚本 |
| **段落修改** | `POST /api/creative/edit` | 修改单个段落内容 |
| **一键润色** | `POST /api/creative/polish` | 润色整个文案 |
| **历史记录** | `GET /api/creative/records` | 获取创作历史 |

**6步推导流程**：
1. 选择客户档案（IP定位约束）
2. 输入主题
3. 选择内容类型：讲故事 / 分享干货 / 聊观点 / 种草产品 / 分享经历
4. 选择人群：已在对比 / 遇到问题 / 还在观望 / 随便看看
5. 选择风格：测评对比 / 真实体验 / 干货教程 / 轻松娱乐 等
6. 确认价值 + 框架调整

**内容类型到脚本结构的映射**：
- 讲故事 → 故事型（起承转合、情感起伏）
- 分享干货 → 知识型（方法步骤、要点清晰）
- 聊观点 → 观点型（有立场、论据支撑）
- 种草产品 → 知识型（真实体验、购买理由）
- 分享经历 → 故事型（生活化、有共鸣）

### ✍️ 文案生成
| 功能 | API | 说明 |
|------|-----|------|
| **选题推荐** | `POST /api/ai/topic-recommend` | AI 推荐热门选题 |
| **文案分析** | `POST /api/ai/copywriting-analysis` | 分析文案优缺点 |
| **直播话术** | `POST /api/ai/live-speech` | 生成直播带货话术 |
| **快速创作** | `POST /api/ai/quick-create` | 一键生成内容 |
| **千川文案** | `POST /api/qianchuan/copywriting` | 广告投放文案 |

### 📹 视频分析
| 功能 | API | 说明 |
|------|-----|------|
| **视频解析** | `POST /api/inspiration-cocreate/upload` | 解析短视频链接 |
| **文案提取** | 自动 | 提取视频口播文案 |
| **深度分析** | `POST /api/video/deep-analysis` | 爆款因素分析 |
| **竞品分析** | `POST /api/analyze-competitor` | 竞品账号分析 |

### 🤖 无脚本拍摄
| 功能 | API | 说明 |
|------|-----|------|
| **AI 对话** | `POST /api/scriptless/chat` | 与 AI 对话生成拍摄脚本 |
| **会话管理** | `GET /api/scriptless/conversation` | 获取历史会话 |

### 📁 客户档案
| 功能 | API | 说明 |
|------|-----|------|
| **获取列表** | `GET /api/customer/list` | 获取客户档案列表 |
| **创建客户** | `POST /api/customer/list` | 创建新客户档案 |
| **更新客户** | `POST /api/customer/update` | 更新客户信息 |
| **删除客户** | `DELETE /api/customer/list?id=` | 删除客户档案 |
| **客户定位** | `POST /api/customer/positioning` | AI 分析客户定位 |
| **客户素材** | `GET /api/customer/materials` | 获取客户相关素材 |

### 📦 产品档案
| 功能 | API | 说明 |
|------|-----|------|
| **获取列表** | `GET /api/product-profiles` | 获取产品档案列表 |
| **创建产品** | `POST /api/product-profiles` | 创建新产品档案 |
| **产品定位** | `POST /api/product-profiles/positioning` | AI 分析产品定位 |
| **自动填充** | `POST /api/product-profiles/[id]/auto-fill` | 根据链接自动填充信息 |

### 📚 素材库
| 功能 | API | 说明 |
|------|-----|------|
| **获取列表** | `GET /api/materials` | 获取素材列表（支持筛选） |
| **创建素材** | `POST /api/materials` | 创建新素材 |
| **更新素材** | `PUT /api/materials` | 更新素材内容 |
| **删除素材** | `DELETE /api/materials?id=` | 删除素材 |

**素材来源类型 sourceType**:
- `topic` - 选题推荐
- `script` - 脚本生成
- `fullscript` - 拍摄脚本
- `live_speech` - 直播话术
- `qianchuan` - 千川素材
- `rewrite` - 仿写脚本

---

## 🔌 H5/小程序如何调用生产环境

### 生产环境地址
```
http://localhost:5000
```

### 认证流程

```javascript
// 1. 登录获取 token
const res = await fetch('http://localhost:5000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: '手机号', password: '密码' })
});
const { data } = await res.json();
const token = data.token;  // 保存这个 token

// 2. 后续请求带上 token
const materials = await fetch('http://localhost:5000/api/materials', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### 小程序调用示例

```javascript
// utils/api.js
const BASE_URL = 'http://localhost:5000';

function request(url, options = {}) {
  const token = wx.getStorageSync('sessionToken');
  return new Promise((resolve, reject) => {
    wx.request({
      url: BASE_URL + url,
      method: options.method || 'GET',
      data: options.data,
      header: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      success: (res) => resolve(res.data),
      fail: reject
    });
  });
}

// 登录
export function login(username, password) {
  return request('/api/auth/login', {
    method: 'POST',
    data: { username, password }
  });
}

// 获取客户档案
export function getCustomers() {
  return request('/api/customer/list');
}

// 获取素材库
export function getMaterials(params = {}) {
  const query = Object.entries(params)
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  return request(`/api/materials?${query}`);
}

// 生成脚本
export function generateScript(data) {
  return request('/api/script/generate', {
    method: 'POST',
    data
  });
}
```

---

## 功能模块清单

| 模块 | 说明 | 页面路径 |
|------|------|----------|
| **灵感共创** | 爆款视频分析、仿写脚本生成 | `/inspiration-cocreate` |
| **千川素材** | 广告素材创作 | `/operations/qianchuan-materials` |
| **无脚本拍摄** | AI 辅助拍摄脚本 | `/scriptless` |
| **自动化任务** | 定时/批量任务管理 | `/automation` |
| **代理系统** | 四层代理、点数管理、佣金结算 | `/agent` |
| **会员系统** | 多级会员、算力管理 | `/member` |
| **素材库** | 内容素材管理 | `/operations/content-library` |
| **新用户转化** | 新手任务、正向反馈、首充双倍、邀请奖励 | 多页面 |

---

## 🆕 新用户转化系统

### 新用户注册奖励

| 行为 | 奖励 | 有效期 |
|------|------|--------|
| 新用户注册 | 3000算力 | 1天 |

### 新手任务引导

3步任务流程，完成奖励1000算力（7天有效）：

| 步骤 | 任务 | 说明 |
|------|------|------|
| 1 | 提取爆款文案 | 上传爆款视频链接，提取文案 |
| 2 | 生成仿写脚本 | 基于文案生成专属脚本 |
| 3 | 保存到素材库 | 将脚本保存到素材库 |

**API 接口**：
- `GET /api/onboarding/tasks` - 获取任务列表和进度
- `POST /api/onboarding/complete` - 标记任务完成
- `POST /api/onboarding/claim-reward` - 领取任务奖励

### 邀请分享奖励

| 行为 | 奖励 | 有效期 |
|------|------|--------|
| 邀请好友（被邀请人完成新手任务） | 双方各得2000算力 | 7天 |

**防刷规则**：
- 每人最多邀请 **10人** 获得奖励
- 被邀请人必须 **完成新手任务** 后才发放奖励
- 超过上限后不再发放奖励

**API 接口**：
- `GET /api/invite/code` - 获取邀请码/链接

### 首充双倍算力

首次使用兑换码时，自动获得双倍算力：
- 例如：兑换10000算力码 → 实际获得20000算力

### 会员迁移补偿

取消会员制度后，对现有未到期会员进行算力补偿：
- 月度会员：赠送20000算力（365天有效）
- 年度会员：赠送100000算力（365天有效）

**部署时执行SQL**：
```sql
-- 给未到期的月度会员赠送20000算力
UPDATE users
SET power_quota = COALESCE(power_quota, 0) + 20000,
    credits = COALESCE(credits, 0) + 20000,
    power_expiry = NOW() + INTERVAL '365 days',
    updated_at = NOW()
WHERE member_type = 'monthly' AND member_expiry > NOW();

-- 给未到期的年度会员赠送100000算力
UPDATE users
SET power_quota = COALESCE(power_quota, 0) + 100000,
    credits = COALESCE(credits, 0) + 100000,
    power_expiry = NOW() + INTERVAL '365 days',
    updated_at = NOW()
WHERE member_type = 'yearly' AND member_expiry > NOW();
```

### 成功案例展示

展示位置：
- 登录页：完整模式展示
- 算力购买页：紧凑模式展示

**API 接口**：
- `GET /api/success-cases` - 获取成功案例列表

### 生成统计与正向反馈

每次生成内容后显示：
- 累计生成数
- 成就徽章（第1/5/10/50次创作）
- 新手任务进度提示

**API 接口**：
- `GET /api/generation-stats` - 获取生成统计数据
- `POST /api/generation-stats` - 更新生成统计

### 数据库表

| 表名 | 说明 |
|------|------|
| `onboarding_tasks` | 新手任务配置 |
| `user_onboarding_progress` | 用户任务进度 |
| `invite_records` | 邀请记录 |
| `success_cases` | 成功案例 |
| `user_generation_stats` | 用户生成统计 |

## 技术栈

| 类型 | 技术 |
|------|------|
| Framework | Next.js 16 (App Router) |
| Core | React 19 |
| Language | TypeScript 5 |
| UI | shadcn/ui + Tailwind CSS 4 |
| Database | Supabase (PostgreSQL) |
| ORM | Drizzle |
| AI SDK | coze-coding-dev-sdk |

## 目录结构

```
.
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/                # API 路由 (151个接口)
│   │   ├── agent/              # 代理中心页面
│   │   ├── admin/              # 管理后台页面
│   │   ├── automation/         # 自动化任务页面
│   │   ├── inspiration-cocreate/ # 灵感共创页面
│   │   ├── operations/         # 运营工具页面
│   │   ├── member/             # 会员页面
│   │   └── scriptless/         # 无脚本拍摄页面
│   ├── components/             # UI 组件
│   │   └── ui/                 # shadcn/ui 组件
│   ├── lib/                    # 核心库
│   │   ├── db-store.ts         # 数据库操作函数
│   │   ├── session.ts          # 会话管理
│   │   ├── video-parser.ts     # 视频解析
│   │   └── script-extractor.ts # 文案提取
│   └── storage/                # 存储层
├── supabase/migrations/        # 数据库迁移
├── sql/                        # SQL 脚本
├── .coze                       # 部署配置
└── .env.local                  # 环境变量
```

## 环境变量

### 必需配置
```bash
# 视频解析（部署时必须配置）
TIKHUB_API_KEY=<set-in-private-environment>
VIDEO_PARSE_API_TOKEN=<set-in-private-environment>
```

### 自动注入（无需配置）
```bash
COZE_SUPABASE_URL      # 数据库地址（系统自动注入）
COZE_SUPABASE_ANON_KEY # 数据库密钥（系统自动注入）
COZE_PROJECT_DOMAIN_DEFAULT  # 项目域名
DEPLOY_RUN_PORT=5000   # 服务端口
```

## API 接口清单

### 认证模块 `/api/auth`
| 接口 | 方法 | 说明 |
|------|------|------|
| `/login` | POST | 用户登录 |
| `/register` | POST | 用户注册（支持代理绑定） |
| `/logout` | POST | 退出登录 |
| `/me` | GET | 获取当前用户信息 |
| `/change-password` | POST | 修改密码 |
| `/verify` | GET | 验证登录状态 |

### 灵感共创 `/api/inspiration-cocreate`
| 接口 | 方法 | 说明 |
|------|------|------|
| `/upload` | POST | 上传视频链接 |
| `/videos` | GET | 获取视频列表 |
| `/videos/[id]` | GET | 获取视频详情 |
| `/status/[id]` | GET | 获取处理状态 |
| `/process` | POST | 后台处理视频 |
| `/rewrite` | POST | 仿写脚本生成 |
| `/permission` | GET | 获取用户权限 |
| `/debug` | POST | 调试接口 |

### 自动化任务 `/api/automation`
| 接口 | 方法 | 说明 |
|------|------|------|
| `/create` | POST | 创建任务 |
| `/execute` | POST | 执行任务 |
| `/tasks` | GET | 获取任务列表 |

### 代理系统 `/api/agent`
| 接口 | 方法 | 说明 |
|------|------|------|
| `/account` | GET/PUT | 代理账户信息 |
| `/status` | GET | 代理状态 |
| `/users` | GET | 下级用户列表 |
| `/open-member` | POST | 为用户开通会员 |
| `/points` | GET/POST | 点数管理 |
| `/commissions` | GET | 佣金记录 |
| `/settlements` | GET/POST | 结算管理 |
| `/stats` | GET | 代理统计 |

### AI 能力 `/api/ai`
| 接口 | 方法 | 说明 |
|------|------|------|
| `/topic-recommend` | POST | 选题推荐 |
| `/copywriting-analysis` | POST | 文案分析 |
| `/data-analysis` | POST | 数据分析 |
| `/live-speech` | POST | 直播话术生成 |
| `/quick-create` | POST | 快速创作 |

### 千川素材 `/api/qianchuan`
| 接口 | 方法 | 说明 |
|------|------|------|
| `/analyze` | POST | 分析视频 |
| `/copywriting` | POST | 生成文案 |
| `/script` | POST | 生成脚本 |

### 无脚本拍摄 `/api/scriptless`
| 接口 | 方法 | 说明 |
|------|------|------|
| `/chat` | POST | 对话生成 |
| `/conversation` | GET | 获取会话列表 |
| `/conversation/[id]` | GET | 获取会话详情 |
| `/credits` | GET | 获取积分 |

### 脚本生成 `/api/script`
| 接口 | 方法 | 说明 |
|------|------|------|
| `/generate` | POST | 生成脚本 |
| `/dialogue` | POST | 对话脚本 |
| `/opening` | POST | 开场白 |
| `/writing` | POST | 写作脚本 |

### 管理后台 `/api/admin`
| 接口 | 方法 | 说明 |
|------|------|------|
| `/users` | GET | 用户管理 |
| `/agents` | GET | 代理管理 |
| `/settlements` | GET/POST | 结算审核 |
| `/operation-logs` | GET | 操作日志 |

### 会员系统 `/api/member`
| 接口 | 方法 | 说明 |
|------|------|------|
| `/plans` | GET | 会员套餐 |
| `/subscription` | GET/POST | 订阅管理 |
| `/computing-power` | GET | 算力管理 |

### 调试工具 `/api/debug`
| 接口 | 方法 | 说明 |
|------|------|------|
| `/logs` | GET | 读取运行日志 (app/console/dev) |
| `/db-status` | GET | 数据库状态检查 |
| `/test-api` | POST | 测试内部 API 接口 |
| `/analyze-error` | POST | 分析错误日志，识别问题类型 |
| `/system` | GET | 系统环境信息、端口状态 |

**认证方式**：
- 开发环境 (`COZE_PROJECT_ENV=DEV`) 默认允许
- 生产环境需要 `X-Debug-Token` 请求头

**使用示例**：
```bash
# 查看日志
curl "http://localhost:5000/api/debug/logs?type=app&lines=50&level=error"

# 测试 API
curl -X POST http://localhost:5000/api/debug/test-api \
  -H 'Content-Type: application/json' \
  -d '{"method":"POST","path":"/api/auth/login","body":{"username":"test","password":"test"}}'

# 分析错误
curl -X POST http://localhost:5000/api/debug/analyze-error \
  -H 'Content-Type: application/json' \
  -d '{"logFile":"app","lines":100}'
```

### AI 质量分析 `/api/ai-quality`
| 接口 | 方法 | 说明 |
|------|------|------|
| `/chat` | POST | 智能对话入口（推荐） |
| `?action=stats` | GET | 获取 AI 调用统计 |
| `?action=errors` | GET | 获取错误分析 |
| `?action=suggestions` | GET | 获取优化建议 |
| `?action=diagnose` | GET | 一键诊断 AI 质量 |
| `action=report` | POST | 生成质量报告 |

**认证方式**：
- 开发环境 (`COZE_PROJECT_ENV=DEV`) 默认允许
- 生产环境需要 `X-Debug-Token` 请求头

**智能对话 API（推荐）**：
```bash
# 自动识别用户意图，返回格式化结果
curl -X POST http://localhost:5000/api/ai-quality/chat \
  -H 'Content-Type: application/json' \
  -d '{"question": "帮我查看这周的AI调用数据"}'

# 支持的问题类型
# - 统计数据："查看统计数据"、"调用情况"
# - 错误分析："有什么错误"、"失败原因"
# - 质量诊断："帮我诊断一下"、"全面检查"
# - 优化建议："如何优化"、"改进建议"
# - 生成报告："生成周报"、"质量报告"
```

**原始 API 接口**：
```bash
# 获取统计数据
curl "http://localhost:5000/api/ai-quality?action=stats"

# 获取错误分析
curl "http://localhost:5000/api/ai-quality?action=errors"

# 一键诊断
curl "http://localhost:5000/api/ai-quality?action=diagnose"

# 生成周报
curl -X POST http://localhost:5000/api/ai-quality \
  -H 'Content-Type: application/json' \
  -d '{"action":"report","type":"weekly"}'
```

## 数据库表结构

### 用户系统
```sql
users                    -- 用户表
├── id                   -- 主键
├── uid                  -- 用户唯一标识
├── username             -- 用户名
├── password             -- 密码(bcrypt加密)
├── role                 -- 角色(user/admin)
├── member_type          -- 会员类型
├── inviter_id           -- 邀请人ID
└── agent_level          -- 代理等级(0-2)

sessions                 -- 会话表
├── id                   -- 主键
├── user_id              -- 用户ID
├── token                -- 会话令牌
└── expires_at           -- 过期时间
```

### 代理系统
```sql
agent_accounts           -- 代理账户表
├── id                   -- 主键
├── uid                  -- 用户ID
├── agent_path           -- 代理推广路径
├── parent_id            -- 上级代理ID
├── level                -- 代理等级(0-2)
├── points_balance       -- 点数余额
└── commission_rate      -- 佣金比例

commission_records       -- 佣金记录表
├── id                   -- 主键
├── agent_id             -- 代理ID
├── amount               -- 金额
├── type                 -- 类型
└── settlement_status    -- 结算状态

agent_settlements        -- 结算记录表
├── id                   -- 主键
├── agent_id             -- 代理ID
├── amount               -- 结算金额
└── status               -- 状态(pending/completed)
```

### 灵感共创
```sql
inspiration_videos       -- 爆款视频表
├── id                   -- 主键
├── video_url            -- 视频链接
├── platform             -- 平台
├── title                -- 标题
├── author               -- 作者
├── script_content       -- 文案内容
├── processing_status    -- 处理状态
└── uploaded_by          -- 上传者ID

inspiration_permissions  -- 权限表
├── id                   -- 主键
├── user_id              -- 用户ID
├── expires_at           -- 过期时间
└── upload_count         -- 上传次数
```

### 自动化任务
```sql
automation_tasks         -- 自动化任务表
├── id                   -- 主键
├── user_id              -- 用户ID
├── task_type            -- 任务类型
├── script_type          -- 脚本类型
├── status               -- 状态
├── schedule_time        -- 定时执行时间
└── result               -- 执行结果
```

### AI 质量监控
```sql
ai_call_logs             -- AI调用日志表
├── id                   -- 主键
├── feature              -- 功能名称
├── user_id              -- 用户ID
├── input                -- 输入内容摘要
├── output               -- 输出内容摘要
├── success              -- 是否成功
├── error_type           -- 错误类型
├── error_message        -- 错误信息
├── duration_ms          -- 耗时(毫秒)
├── tokens_used          -- 使用token数
├── model                -- 使用模型
├── quality_score        -- 质量评分(0-5)
└── created_at           -- 创建时间

ai_quality_metrics       -- AI质量指标汇总表
├── id                   -- 主键
├── date                 -- 日期
├── feature              -- 功能名称
├── total_calls          -- 总调用次数
├── success_calls        -- 成功次数
├── failed_calls         -- 失败次数
├── avg_duration_ms      -- 平均耗时
└── avg_quality_score    -- 平均质量评分
```

## 代理分销系统核心逻辑

### 四层代理架构
```
平台(管理员) → 总代(level=0) → 一级代理(level=1) → 二级代理(level=2)
```

### 代理关系建立
1. 用户通过推广链接注册: `/login?ref=<agentPath>`
2. 注册时绑定 `inviter_id` 字段
3. 管理员创建代理账户，设置 `agent_path` 和 `commission_rate`

### 点数制管理
- 上级给下级划拨点数
- 生成兑换码消耗点数
- 开通会员消耗点数

### 佣金计算规则
- **直属代理**: 与最高管理员五五分成 (50%)
- **普通代理**: 按约定比例分成
- **分成触发**: 代理为下级开通会员、兑换码兑换

## 常用命令

```bash
# 开发
pnpm dev              # 启动开发服务器 (端口 5000)

# 构建
pnpm build            # 构建生产版本
pnpm start            # 启动生产服务器

# 类型检查
npx tsc --noEmit      # TypeScript 类型检查
```

## 认证规范

### 请求头
```
Authorization: Bearer <sessionToken>
```

### 响应格式
```json
{
  "success": true|false,
  "data": { ... },
  "error": "错误信息"
}
```

## 安全注意事项

1. **密码加密**: bcryptjs 加密存储
2. **Session 管理**: Token 有效期管理，自动清理过期会话
3. **权限控制**: 
   - 最高管理员 UID: 10000001, 00000001
   - 管理员角色: role = 'admin'
   - 代理身份: agent_accounts 表存在记录

## 常见问题排查

### 1. 数据库主键冲突
- 原因：序列未同步
- 解决：执行 `/api/admin/fix-sequences`

### 2. 视频解析失败
- 检查 TIKHUB_API_KEY 是否配置
- 使用 `/api/inspiration-cocreate/debug` 接口调试
- **已修复问题**（2026-03-30）：
  - 添加自动重试机制（最多3次，指数退避）
  - 增加超时时间（TikHub: 30秒，短链接: 20秒）
  - 区分可重试错误（网络超时、限流）和不可重试错误
- 如果用户反馈"需要反复点击多次才能成功"，说明是网络不稳定或API限流

### 3. 自动化任务失败
- 检查 scriptType 参数格式（story/process/knowledge/opinion/product）

## 开发规范

### 组件开发
- 使用 shadcn/ui 组件库
- 遵循 Tailwind CSS 类名规范
- 使用语义化变量 (bg-background, text-foreground)

### API 开发
- 使用 `getSupabaseClient()` 获取数据库连接
- 统一错误处理和日志记录
- 支持 session token 认证

### 数据库操作
- 使用 `src/lib/db-store.ts` 中的封装函数
- 避免直接 SQL 查询
- 注意重试机制处理连接问题

## 提示词工程体系

### 架构概览
```
src/lib/
├── content-knowledge-base.ts   # 🆕 核心知识库（整合51个专业文档）
├── prompt-builders.ts          # 🆕 提示词构建器（统一调用知识库）
├── prompt-engineering/
│   ├── index.ts                # 统一导出
│   ├── context/
│   │   └── ip-positioning.ts   # IP定位约束构建
│   ├── modes/
│   │   └── rewrite-style.ts    # 仿写逻辑提示词
│   ├── formats/
│   │   └── output-formats.ts   # 输出格式规范
│   └── builders/
│       └── script-prompt-builder.ts # 提示词构建器
├── script-templates.ts         # 脚本模板
└── ad-templates.ts             # 千川素材模板
```

### 🆕 核心知识库 (content-knowledge-base.ts)

整合了51个专业文档的方法论，包括：

#### 16种爆款钩子类型
| 钩子类型 | 公式 | 适用场景 |
|----------|------|----------|
| 好奇类 | 悬念 + 信息差 + 必须知道 | 泛娱乐、知识类 |
| 挑战类 | 不可能任务 + 赌约 + 过程展示 | 过程展示类 |
| 揭秘类 | 行业禁区 + 偷拍证据 + 利益诱惑 | 行业揭秘类 |
| 避坑类 | 负面预警 + 具体场景 + 解决方案 | 知识科普类 |
| 痛点类 | 具体痛点 + 场景化 + 解决方案 | 产品种草类 |
| 恐惧类 | 死亡预言 + 身份绑架 + 末日解药 | 健康类 |
| 利益类 | 具体利益 + 低门槛 + 时间紧迫 | 促销类 |
| 速成类 | 时间压缩 + 效果夸张 + 零门槛 | 技能教学类 |
| ... | ... | ... |

#### 四大心理战术
| 战术 | 强度 | 公式 | 适用场景 |
|------|------|------|----------|
| 追求心理 | 弱 | 会XX，轻松搞定XX | 生活类、美食类 |
| 规避心理 | 中 | 远离XX，避免XX | 健康类、理财类 |
| 恐惧心理 | 强 | 不做XX，小心XX | 知识类、职场类 |
| 失去心理 | 最强 | 没有XX，你将失去XX | 投资类、机会类 |

#### 四大脚本类型结构
| 类型 | 模型 | 结构 |
|------|------|------|
| 讲故事 | 火车钩模型 | 问题钩→经历→转折→结局 |
| 教知识 | SCQA模型 | 情境→冲突→问题→答案 |
| 晒过程 | 火车节模型 | 拆解过程+情绪曲线 |
| 聊观点 | 争议站队型 | 抛观点→论据→案例→升华 |

#### 选题方法论
- **九宫格选题法**: 行业关键词 × 目标受众关键词
- **雷达图评估**: 低成本、人群精准、痛点扎心、熟悉度高、高频发生
- **四大类选题法**: 晒过程、教知识、讲故事、聊观点

#### 千川素材技巧
- **黄金5秒法则**: 悬念开场、痛点场景、情感共鸣
- **下单理由公式**: 价格锚点、痛点直击、信任背书、稀缺性、价值拆解
- **种草感技巧**: 弱化促销话术、场景化语言、用户视角、技术参数转体验

### 使用方式

```typescript
import { buildTopicSystemPrompt, buildWritingSystemPrompt, buildScriptSystemPrompt } from '@/lib/prompt-builders';

// 选题推荐
const topicPrompt = buildTopicSystemPrompt({
  mode: 'humanity',
  strategy: 'differentiation',
  contentType: '教知识',
  businessGoal: 'conversion'
});

// 文案创作
const writingPrompt = buildWritingSystemPrompt({
  mode: 'rewrite_style',
  scriptType: 'opinion',
  ipPositioning: ipPositioning
});

// 脚本生成
const scriptPrompt = buildScriptSystemPrompt({
  scriptType: 'story',
  shootingMethod: 'talking_head',
  wordCount: 500
});
```

### 核心改进（解决"生成内容不贴切"问题）

#### 1. IP定位约束层
- 将IP定位从"参考信息"变为"创作约束"
- 明确身份、领域、用户、风格四维约束
- 在仿写模式下强制执行身份映射

#### 2. 仿写逻辑优化
- 明确仿写定义：学习结构 + 替换身份 + 保持风格
- 区分仿写与洗稿/抄袭
- 提供详细的执行步骤和示例

#### 3. 知识库整合
- 所有生成类API统一调用知识库
- 避免提示词重复和冗余
- 保证方法论的一致性

### 提示词分层架构

| 层级 | 文件 | 说明 |
|------|------|------|
| L0 知识库层 | content-knowledge-base.ts | 钩子、脚本结构、心理战术、方法论 |
| L1 安全层 | system-prompts.ts | 内容安全规范 |
| L2 技巧层 | prompt-builders.ts | 统一调用知识库 |
| L3 方法论层 | knowledge-helper.ts | 薛辉方法论 |
| L4 创作模式层 | prompt-engineering/modes | 原创八法、仿写、洗稿 |
| L5 输出格式层 | prompt-engineering/formats | JSON输出规范 |

### 已集成的API

| API | 知识库内容 |
|-----|------------|
| `/api/ai/topic-recommend` | 九宫格选题法、雷达图评估、四大心理战术 |
| `/api/script/writing` | 16种钩子、四大脚本结构、心理战术 |
| `/api/script/generate-structured` | 四大脚本结构、钩子设计 |
| `/api/qianchuan/copywriting` | 黄金5秒、下单理由、种草感技巧 |
| `/api/qianchuan/script` | 黄金5秒、下单理由、种草感技巧 |

### 自动化任务兼容性
自动化任务（`/api/automation/execute`）调用的API参数接口保持不变：
- `/api/ai/topic-recommend`
- `/api/script/writing`
- `/api/script/generate`

内部提示词优化不影响外部调用方式。
