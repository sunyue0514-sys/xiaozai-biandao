-- ============================================================
-- 修复 agent_accounts 表的 NULL 值问题
-- 创建时间: 2026-03-28
-- 说明: 此迁移必须在 Drizzle schema 同步之前执行
-- ============================================================

-- 1. 检查并修复 user_id 为 NULL 的记录
DO $$
DECLARE
    null_count INTEGER;
    admin_user_id INTEGER;
BEGIN
    -- 检查 agent_accounts 表是否存在
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agent_accounts') THEN
        -- 检查是否有 NULL 值
        SELECT COUNT(*) INTO null_count FROM agent_accounts WHERE user_id IS NULL;
        
        IF null_count > 0 THEN
            RAISE NOTICE 'Found % NULL user_id values in agent_accounts, fixing...', null_count;
            
            -- 获取管理员用户 ID
            SELECT id INTO admin_user_id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1;
            
            IF admin_user_id IS NULL THEN
                -- 如果没有管理员，使用第一个用户
                SELECT id INTO admin_user_id FROM users ORDER BY id LIMIT 1;
            END IF;
            
            IF admin_user_id IS NOT NULL THEN
                -- 将 NULL 值替换为管理员用户 ID
                UPDATE agent_accounts SET user_id = admin_user_id WHERE user_id IS NULL;
                RAISE NOTICE 'Fixed % NULL user_id values, assigned to user %', null_count, admin_user_id;
            ELSE
                -- 如果没有任何用户，删除这些记录
                DELETE FROM agent_accounts WHERE user_id IS NULL;
                RAISE NOTICE 'Deleted % records with NULL user_id (no users found)', null_count;
            END IF;
        ELSE
            RAISE NOTICE 'No NULL user_id values found in agent_accounts';
        END IF;
    ELSE
        RAISE NOTICE 'agent_accounts table does not exist yet';
    END IF;
END $$;

-- 2. 添加 NOT NULL 约束（如果表存在）
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agent_accounts') THEN
        -- 检查约束是否已存在
        IF NOT EXISTS (
            SELECT 1 FROM pg_attribute a
            JOIN pg_class c ON a.attrelid = c.oid
            WHERE c.relname = 'agent_accounts' 
            AND a.attname = 'user_id'
            AND a.attnotnull = true
        ) THEN
            -- 添加 NOT NULL 约束
            ALTER TABLE agent_accounts ALTER COLUMN user_id SET NOT NULL;
            RAISE NOTICE 'Added NOT NULL constraint to agent_accounts.user_id';
        END IF;
    END IF;
END $$;

-- 3. 添加唯一约束（如果不存在）
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agent_accounts') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'agent_accounts_user_id_key' 
            AND conrelid = 'agent_accounts'::regclass
        ) THEN
            -- 检查是否有重复的 user_id
            IF NOT EXISTS (
                SELECT user_id FROM agent_accounts 
                WHERE user_id IS NOT NULL 
                GROUP BY user_id 
                HAVING COUNT(*) > 1
            ) THEN
                ALTER TABLE agent_accounts ADD CONSTRAINT agent_accounts_user_id_key UNIQUE (user_id);
                RAISE NOTICE 'Added UNIQUE constraint to agent_accounts.user_id';
            ELSE
                RAISE NOTICE 'Skipped UNIQUE constraint - duplicate user_id values exist';
            END IF;
        END IF;
    END IF;
END $$;
