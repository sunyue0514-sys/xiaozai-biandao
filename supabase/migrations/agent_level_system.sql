-- ============================================================
-- 代理层级系统数据库迁移
-- 创建时间: 2026-03-29
-- 说明: 支持三层代理体系，上级自由设置下级佣金比例
-- ============================================================

-- ========================
-- 1. agent_accounts 表扩展
-- ========================

-- 添加代理层级字段
ALTER TABLE agent_accounts ADD COLUMN IF NOT EXISTS agent_level INT DEFAULT 1;

-- 添加平台分成比例（最高管理员设置一级代理时使用）
ALTER TABLE agent_accounts ADD COLUMN IF NOT EXISTS platform_rate DECIMAL(3,2) DEFAULT 0.50;

-- 添加创建兑换码权限
ALTER TABLE agent_accounts ADD COLUMN IF NOT EXISTS can_create_code BOOLEAN DEFAULT true;

-- 添加创建用户权限
ALTER TABLE agent_accounts ADD COLUMN IF NOT EXISTS can_create_user BOOLEAN DEFAULT true;

-- ========================
-- 2. 数据迁移
-- ========================

-- 一级代理：parent_id 为空的，设置 level=1，可以创建兑换码
UPDATE agent_accounts 
SET agent_level = 1, can_create_code = true, can_create_user = true 
WHERE parent_id IS NULL AND agent_level IS NULL;

-- 二级代理：parent_id 不为空的，设置 level=2，不能创建兑换码
UPDATE agent_accounts 
SET agent_level = 2, can_create_code = false, can_create_user = false 
WHERE parent_id IS NOT NULL AND agent_level IS NULL;

-- ========================
-- 3. 索引优化
-- ========================

-- 代理层级索引
CREATE INDEX IF NOT EXISTS idx_agent_accounts_agent_level ON agent_accounts(agent_level);

-- 父级代理索引（已有则跳过）
CREATE INDEX IF NOT EXISTS idx_agent_accounts_parent_id ON agent_accounts(parent_id);

-- ========================
-- 4. 注释
-- ========================

COMMENT ON COLUMN agent_accounts.agent_level IS '代理层级：1=一级代理(普通管理员), 2=二级代理';
COMMENT ON COLUMN agent_accounts.platform_rate IS '平台分成比例：一级代理创建时由最高管理员设置，表示平台拿走的比例';
COMMENT ON COLUMN agent_accounts.can_create_code IS '是否能创建兑换码：一级代理=true, 二级代理=false';
COMMENT ON COLUMN agent_accounts.can_create_user IS '是否能创建用户：一级代理=true, 二级代理=false';
