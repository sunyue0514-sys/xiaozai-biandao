-- ============================================================
-- 代理分销系统数据库迁移
-- 创建时间: 2026-03-27
-- 说明: 支持多层分销、佣金分成、结算管理
-- 更新: 2026-03-28 - 移除 agent_accounts 表操作，避免 Drizzle 同步冲突
-- ============================================================

-- ========================
-- 1. 用户表扩展
-- ========================
-- 添加代理路径字段（方便查询）
ALTER TABLE users ADD COLUMN IF NOT EXISTS agent_path VARCHAR(50);

-- ========================
-- 2. agent_accounts 表说明
-- ========================
-- agent_accounts 表由 Drizzle ORM 管理，不在此迁移文件中操作
-- user_id 列已在数据库中定义为 NOT NULL，schema.ts 中也定义为 notNull()
-- 如需修改该表结构，请更新 schema.ts 并使用 drizzle-kit push

-- ========================
-- 3. 代理开通记录表
-- ========================
CREATE TABLE IF NOT EXISTS agent_subscriptions (
    id SERIAL PRIMARY KEY,
    
    -- 代理信息
    agent_id INT NOT NULL,                    -- 代理用户ID
    agent_uid VARCHAR(50) NOT NULL,           -- 代理UID
    
    -- 用户信息
    user_id INT NOT NULL,                     -- 被开通用户ID
    user_name VARCHAR(100),                   -- 用户名
    user_phone VARCHAR(20),                   -- 用户手机
    
    -- 套餐信息
    plan_id INT NOT NULL,
    plan_name VARCHAR(100),
    original_price DECIMAL(10,2),             -- 原价
    commission_rate DECIMAL(3,2),             -- 分成比例
    commission_amount DECIMAL(10,2),          -- 代理佣金
    platform_amount DECIMAL(10,2),            -- 平台/上级收入
    
    -- 结算状态
    settlement_status VARCHAR(20) DEFAULT 'pending', -- pending/settled
    settled_at TIMESTAMP,
    
    -- 审计
    operator_ip VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ========================
-- 4. 佣金记录表（统一记录所有分成）
-- ========================
CREATE TABLE IF NOT EXISTS commission_records (
    id SERIAL PRIMARY KEY,
    
    -- 开通信息
    user_id INT NOT NULL,                     -- 被开通的用户ID
    user_name VARCHAR(100),                   -- 用户名
    plan_id INT,
    plan_name VARCHAR(100),
    original_price DECIMAL(10,2),             -- 原价
    
    -- 开通方式
    source_type VARCHAR(20) NOT NULL,         -- 'agent_open' / 'redemption_code'
    source_id INT,                            -- agent_subscriptions.id 或 redemption_codes.id
    
    -- 收益者信息
    beneficiary_id INT NOT NULL,              -- 收益者ID
    beneficiary_uid VARCHAR(50) NOT NULL,     -- 收益者UID
    beneficiary_role VARCHAR(20),             -- super_admin/admin/agent
    
    -- 金额
    amount DECIMAL(10,2) NOT NULL,            -- 佣金金额
    commission_rate DECIMAL(3,2),             -- 分成比例
    
    -- 状态
    settlement_status VARCHAR(20) DEFAULT 'pending', -- pending/settled
    settled_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- ========================
-- 5. 结算记录表
-- ========================
CREATE TABLE IF NOT EXISTS agent_settlements (
    id SERIAL PRIMARY KEY,
    agent_id INT NOT NULL,
    agent_uid VARCHAR(50) NOT NULL,
    
    -- 金额
    amount DECIMAL(10,2) NOT NULL,            -- 结算金额
    commission_ids INT[],                     -- 关联的佣金记录ID
    
    -- 凭证
    payment_method VARCHAR(50),               -- alipay/wechat/bank
    payment_proof TEXT,                       -- 凭证图片URL（JSON数组）
    
    -- 状态
    status VARCHAR(20) DEFAULT 'pending',     -- pending/confirmed/rejected
    confirmed_by INT,
    confirmed_at TIMESTAMP,
    rejected_reason VARCHAR(255),
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- ========================
-- 6. 索引（不包含 agent_accounts）
-- ========================
CREATE INDEX IF NOT EXISTS idx_users_agent_path ON users(agent_path);
CREATE INDEX IF NOT EXISTS idx_users_inviter_id ON users(inviter_id);

-- agent_accounts 索引已由之前的迁移创建，不再重复创建

CREATE INDEX IF NOT EXISTS idx_agent_subscriptions_agent_id ON agent_subscriptions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_subscriptions_user_id ON agent_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_subscriptions_settlement_status ON agent_subscriptions(settlement_status);

CREATE INDEX IF NOT EXISTS idx_commission_records_beneficiary_id ON commission_records(beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_commission_records_source_type ON commission_records(source_type);
CREATE INDEX IF NOT EXISTS idx_commission_records_settlement_status ON commission_records(settlement_status);

CREATE INDEX IF NOT EXISTS idx_agent_settlements_agent_id ON agent_settlements(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_settlements_status ON agent_settlements(status);

-- ========================
-- 7. 注释（不包含 agent_accounts）
-- ========================
COMMENT ON TABLE agent_subscriptions IS '代理开通记录：代理为下级开通会员的记录';
COMMENT ON TABLE commission_records IS '佣金记录：所有佣金分成记录，包括代理开通和兑换码';
COMMENT ON TABLE agent_settlements IS '结算记录：代理与平台的结算记录';
