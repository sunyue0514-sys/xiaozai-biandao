-- AI 质量监控相关表

-- AI 调用日志表
CREATE TABLE IF NOT EXISTS ai_call_logs (
  id SERIAL PRIMARY KEY,
  feature VARCHAR(100) NOT NULL,        -- 功能名称
  user_id INTEGER,                       -- 用户ID
  input TEXT,                            -- 输入内容摘要
  output TEXT,                           -- 输出内容摘要
  success BOOLEAN DEFAULT true,          -- 是否成功
  error_type VARCHAR(100),               -- 错误类型
  error_message TEXT,                    -- 错误信息
  duration_ms INTEGER,                   -- 耗时(毫秒)
  tokens_used INTEGER DEFAULT 0,         -- 使用token数
  model VARCHAR(100),                    -- 使用模型
  quality_score DECIMAL(3,2),            -- 质量评分(0-5)
  created_at TIMESTAMP DEFAULT NOW(),    -- 创建时间
  
  -- 索引优化
  CONSTRAINT valid_quality_score CHECK (quality_score IS NULL OR (quality_score >= 0 AND quality_score <= 5))
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_ai_call_logs_feature ON ai_call_logs(feature);
CREATE INDEX IF NOT EXISTS idx_ai_call_logs_created_at ON ai_call_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_call_logs_success ON ai_call_logs(success);
CREATE INDEX IF NOT EXISTS idx_ai_call_logs_user_id ON ai_call_logs(user_id);

-- AI 质量指标汇总表（按天聚合）
CREATE TABLE IF NOT EXISTS ai_quality_metrics (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,                    -- 日期
  feature VARCHAR(100) NOT NULL,         -- 功能名称
  total_calls INTEGER DEFAULT 0,         -- 总调用次数
  success_calls INTEGER DEFAULT 0,       -- 成功次数
  failed_calls INTEGER DEFAULT 0,        -- 失败次数
  avg_duration_ms DECIMAL(10,2),         -- 平均耗时
  max_duration_ms INTEGER,               -- 最大耗时
  min_duration_ms INTEGER,               -- 最小耗时
  total_tokens BIGINT DEFAULT 0,         -- 总token数
  avg_quality_score DECIMAL(3,2),        -- 平均质量评分
  error_types JSONB,                     -- 错误类型统计
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(date, feature)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_ai_quality_metrics_date ON ai_quality_metrics(date);
CREATE INDEX IF NOT EXISTS idx_ai_quality_metrics_feature ON ai_quality_metrics(feature);

-- 优化建议记录表
CREATE TABLE IF NOT EXISTS ai_optimization_suggestions (
  id SERIAL PRIMARY KEY,
  feature VARCHAR(100) NOT NULL,         -- 功能名称
  priority VARCHAR(20) NOT NULL,         -- 优先级: critical/high/medium/low
  issue TEXT NOT NULL,                   -- 问题描述
  suggestion TEXT NOT NULL,              -- 优化建议
  code_example TEXT,                     -- 代码示例
  status VARCHAR(20) DEFAULT 'pending',  -- 状态: pending/applied/ignored
  created_at TIMESTAMP DEFAULT NOW(),
  applied_at TIMESTAMP,
  
  CONSTRAINT valid_priority CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'applied', 'ignored'))
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_ai_optimization_suggestions_feature ON ai_optimization_suggestions(feature);
CREATE INDEX IF NOT EXISTS idx_ai_optimization_suggestions_status ON ai_optimization_suggestions(status);

-- 质量报告表
CREATE TABLE IF NOT EXISTS ai_quality_reports (
  id SERIAL PRIMARY KEY,
  report_id VARCHAR(100) UNIQUE NOT NULL, -- 报告ID
  type VARCHAR(20) NOT NULL,              -- 报告类型: daily/weekly/monthly
  period_start DATE NOT NULL,             -- 开始日期
  period_end DATE NOT NULL,               -- 结束日期
  summary JSONB NOT NULL,                 -- 摘要数据
  details JSONB,                          -- 详细数据
  highlights TEXT[],                      -- 亮点
  actions TEXT[],                         -- 待办事项
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT valid_report_type CHECK (type IN ('daily', 'weekly', 'monthly'))
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_ai_quality_reports_type ON ai_quality_reports(type);
CREATE INDEX IF NOT EXISTS idx_ai_quality_reports_period ON ai_quality_reports(period_start, period_end);

-- 添加注释
COMMENT ON TABLE ai_call_logs IS 'AI调用日志表，记录每次AI调用的详细信息';
COMMENT ON TABLE ai_quality_metrics IS 'AI质量指标汇总表，按天聚合统计';
COMMENT ON TABLE ai_optimization_suggestions IS 'AI优化建议记录表';
COMMENT ON TABLE ai_quality_reports IS 'AI质量报告表';
