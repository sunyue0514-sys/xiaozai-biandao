-- 创建检查序列状态的函数
-- 在 Supabase SQL Editor 中执行

DROP FUNCTION IF EXISTS check_sequence_status();

CREATE OR REPLACE FUNCTION check_sequence_status()
RETURNS TABLE (
  sequence_name text,
  table_name text,
  seq_last_value bigint,
  table_max_id bigint,
  is_healthy boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- users 表
  RETURN QUERY
  SELECT 
    'users_id_seq'::text as sequence_name,
    'users'::text as table_name,
    (SELECT last_value::bigint FROM users_id_seq) as seq_last_value,
    COALESCE((SELECT MAX(id) FROM users), 0::bigint) as table_max_id,
    (SELECT last_value::bigint FROM users_id_seq) >= COALESCE((SELECT MAX(id) FROM users), 0::bigint) as is_healthy;
  
  -- video_analysis_history 表
  RETURN QUERY
  SELECT 
    'video_analysis_history_id_seq'::text,
    'video_analysis_history'::text,
    (SELECT last_value::bigint FROM video_analysis_history_id_seq),
    COALESCE((SELECT MAX(id) FROM video_analysis_history), 0::bigint),
    (SELECT last_value::bigint FROM video_analysis_history_id_seq) >= COALESCE((SELECT MAX(id) FROM video_analysis_history), 0::bigint);
  
  -- inspiration_videos 表
  RETURN QUERY
  SELECT 
    'inspiration_videos_id_seq'::text,
    'inspiration_videos'::text,
    (SELECT last_value::bigint FROM inspiration_videos_id_seq),
    COALESCE((SELECT MAX(id) FROM inspiration_videos), 0::bigint),
    (SELECT last_value::bigint FROM inspiration_videos_id_seq) >= COALESCE((SELECT MAX(id) FROM inspiration_videos), 0::bigint);
  
  -- materials 表
  RETURN QUERY
  SELECT 
    'materials_id_seq'::text,
    'materials'::text,
    (SELECT last_value::bigint FROM materials_id_seq),
    COALESCE((SELECT MAX(id) FROM materials), 0::bigint),
    (SELECT last_value::bigint FROM materials_id_seq) >= COALESCE((SELECT MAX(id) FROM materials), 0::bigint);
  
  -- customers 表
  RETURN QUERY
  SELECT 
    'customers_id_seq'::text,
    'customers'::text,
    (SELECT last_value::bigint FROM customers_id_seq),
    COALESCE((SELECT MAX(id) FROM customers), 0::bigint),
    (SELECT last_value::bigint FROM customers_id_seq) >= COALESCE((SELECT MAX(id) FROM customers), 0::bigint);
  
  -- redemption_codes 表
  RETURN QUERY
  SELECT 
    'redemption_codes_id_seq'::text,
    'redemption_codes'::text,
    (SELECT last_value::bigint FROM redemption_codes_id_seq),
    COALESCE((SELECT MAX(id) FROM redemption_codes), 0::bigint),
    (SELECT last_value::bigint FROM redemption_codes_id_seq) >= COALESCE((SELECT MAX(id) FROM redemption_codes), 0::bigint);
  
  -- agent_accounts 表
  RETURN QUERY
  SELECT 
    'agent_accounts_id_seq'::text,
    'agent_accounts'::text,
    (SELECT last_value::bigint FROM agent_accounts_id_seq),
    COALESCE((SELECT MAX(id) FROM agent_accounts), 0::bigint),
    (SELECT last_value::bigint FROM agent_accounts_id_seq) >= COALESCE((SELECT MAX(id) FROM agent_accounts), 0::bigint);
END;
$$;

-- 授予匿名用户执行权限
GRANT EXECUTE ON FUNCTION check_sequence_status() TO anon;
GRANT EXECUTE ON FUNCTION check_sequence_status() TO authenticated;
