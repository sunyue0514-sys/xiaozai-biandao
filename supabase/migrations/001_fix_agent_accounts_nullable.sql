-- ============================================================
-- 修复 agent_accounts 表 NOT NULL 约束问题
-- 
-- 问题：开发环境 user_id 是 NOT NULL，生产环境有 NULL 值
-- 解决：让开发环境的 user_id 允许 NULL
-- ============================================================

-- 执行此 SQL 后，部署时不会再因为 NULL 值冲突而失败

-- 步骤 1: 修改 user_id 列为可空
ALTER TABLE agent_accounts ALTER COLUMN user_id DROP NOT NULL;

-- 步骤 2: 验证修改结果
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'agent_accounts' 
ORDER BY ordinal_position;

-- 预期结果：user_id 的 is_nullable 应该是 'YES'
