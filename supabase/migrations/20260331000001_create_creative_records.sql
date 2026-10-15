-- 智能推导创作历史记录表
CREATE TABLE IF NOT EXISTS creative_records (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic VARCHAR(500) NOT NULL,
  audience VARCHAR(200),
  style VARCHAR(100),
  value VARCHAR(100),
  framework JSONB,
  ip_positioning TEXT,
  customer_name VARCHAR(200),
  customer_id INTEGER,
  script_content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days')
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_creative_records_user_id ON creative_records(user_id);
CREATE INDEX IF NOT EXISTS idx_creative_records_created_at ON creative_records(created_at);
CREATE INDEX IF NOT EXISTS idx_creative_records_expires_at ON creative_records(expires_at);

-- 自动清理过期记录（每天凌晨3点执行）
CREATE OR REPLACE FUNCTION cleanup_expired_creative_records()
RETURNS void AS $$
BEGIN
  DELETE FROM creative_records WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- 添加注释
COMMENT ON TABLE creative_records IS '智能推导创作历史记录';
COMMENT ON COLUMN creative_records.user_id IS '用户ID';
COMMENT ON COLUMN creative_records.topic IS '创作主题';
COMMENT ON COLUMN creative_records.audience IS '目标人群';
COMMENT ON COLUMN creative_records.style IS '创作风格';
COMMENT ON COLUMN creative_records.value IS '内容价值';
COMMENT ON COLUMN creative_records.framework IS '脚本框架JSON';
COMMENT ON COLUMN creative_records.script_content IS '生成的脚本内容';
COMMENT ON COLUMN creative_records.created_at IS '创建时间';
COMMENT ON COLUMN creative_records.expires_at IS '过期时间（7天后自动删除）';
