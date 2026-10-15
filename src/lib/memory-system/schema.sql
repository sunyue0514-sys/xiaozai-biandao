-- 智能记忆系统数据表
-- 执行顺序：1. 先执行此文件创建表

-- =====================================================
-- 1. 内容效果记录表 (content_performance)
-- 记录每条发布内容的效果数据
-- =====================================================
CREATE TABLE IF NOT EXISTS content_performance (
  id BIGSERIAL PRIMARY KEY,
  uid TEXT NOT NULL,                    -- 用户ID
  material_id BIGINT,                    -- 关联素材ID
  customer_id BIGINT,                    -- 关联客户ID
  
  -- 内容信息（冗余存储，便于分析）
  title TEXT,                            -- 标题
  topic TEXT,                            -- 选题
  script_type TEXT,                      -- 脚本类型
  opening_type TEXT,                     -- 开头类型：suspense/pain/contrast/question/story/golden
  content_preview TEXT,                  -- 内容预览（前200字）
  
  -- 发布信息
  platform TEXT,                         -- 发布平台：douyin/xiaohongshu/shipinhao/kuaishou
  publish_url TEXT,                      -- 发布链接
  published_at TIMESTAMP WITH TIME ZONE, -- 发布时间
  
  -- 效果数据
  view_count BIGINT DEFAULT 0,           -- 播放量/阅读量
  like_count BIGINT DEFAULT 0,           -- 点赞数
  comment_count BIGINT DEFAULT 0,        -- 评论数
  share_count BIGINT DEFAULT 0,          -- 转发/分享数
  collect_count BIGINT DEFAULT 0,        -- 收藏数
  finish_rate DECIMAL(5,2),              -- 完播率/完读率（百分比）
  
  -- AI分析结果
  is_hit BOOLEAN DEFAULT FALSE,          -- 是否爆款（根据阈值判断）
  hit_score DECIMAL(5,2),                -- 爆款得分（0-100）
  hit_factors JSONB,                     -- 爆款因子分析结果
  ai_analysis TEXT,                      -- AI详细分析
  
  -- 用户标记
  user_rating INTEGER,                   -- 用户评分：1-5
  user_tags TEXT[],                      -- 用户标记：爆款/潜力/普通/失败
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_performance_uid ON content_performance(uid);
CREATE INDEX IF NOT EXISTS idx_performance_customer ON content_performance(customer_id);
CREATE INDEX IF NOT EXISTS idx_performance_material ON content_performance(material_id);
CREATE INDEX IF NOT EXISTS idx_performance_is_hit ON content_performance(is_hit);
CREATE INDEX IF NOT EXISTS idx_performance_platform ON content_performance(platform);

-- =====================================================
-- 2. 爆款特征库 (hit_patterns)
-- 存储从爆款中提取的特征
-- =====================================================
CREATE TABLE IF NOT EXISTS hit_patterns (
  id BIGSERIAL PRIMARY KEY,
  uid TEXT NOT NULL,                     -- 用户ID
  customer_id BIGINT,                    -- 关联客户ID（可为空表示全局特征）
  
  -- 特征信息
  pattern_type TEXT NOT NULL,            -- 特征类型：title/opening/emotion/structure/timing
  pattern_name TEXT NOT NULL,            -- 特征名称：如"数字+金额标题"
  pattern_value TEXT,                    -- 特征值/模板
  description TEXT,                      -- 特征描述
  
  -- 统计数据
  success_count INTEGER DEFAULT 1,       -- 成功次数
  total_usage INTEGER DEFAULT 1,         -- 总使用次数
  success_rate DECIMAL(5,2),             -- 成功率
  
  -- 关联案例
  example_titles TEXT[],                 -- 示例标题
  example_material_ids BIGINT[],         -- 关联素材ID
  
  -- 适用场景
  applicable_scenes TEXT[],              -- 适用场景：如"产品推荐/避坑指南"
  applicable_platforms TEXT[],           -- 适用平台
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_patterns_uid ON hit_patterns(uid);
CREATE INDEX IF NOT EXISTS idx_patterns_type ON hit_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_patterns_customer ON hit_patterns(customer_id);

-- =====================================================
-- 3. 用户风格画像 (user_style_profile)
-- 聚合分析用户的内容风格偏好
-- =====================================================
CREATE TABLE IF NOT EXISTS user_style_profile (
  id BIGSERIAL PRIMARY KEY,
  uid TEXT NOT NULL UNIQUE,              -- 用户ID
  
  -- 整体风格
  writing_style TEXT,                    -- 写作风格：正式/轻松/幽默/专业
  tone_preference TEXT,                  -- 语气偏好：亲切/权威/中立
  language_style TEXT,                   -- 语言风格：简洁/详细/口语化
  
  -- 标题偏好
  title_formulas TEXT[],                 -- 常用标题公式
  title_length_preference TEXT,          -- 标题长度偏好：短/中/长
  title_number_preference BOOLEAN,       -- 是否喜欢用数字
  title_emotion_words TEXT[],            -- 常用情绪词
  
  -- 开头偏好
  preferred_opening_types TEXT[],        -- 偏好的开头类型
  opening_hook_patterns TEXT[],          -- 开头钩子模式
  
  -- 内容偏好
  preferred_script_types TEXT[],         -- 偏好的脚本类型
  avg_content_length INTEGER,            -- 平均内容长度
  emoji_usage_rate DECIMAL(5,2),         -- emoji使用率
  question_usage_rate DECIMAL(5,2),      -- 疑问句使用率
  
  -- 情绪偏好
  dominant_emotions TEXT[],              -- 主导情绪：好奇/焦虑/共鸣/惊喜
  emotion_intensity TEXT,                -- 情绪强度：高/中/低
  
  -- 统计数据
  total_contents INTEGER DEFAULT 0,      -- 总内容数
  total_hits INTEGER DEFAULT 0,          -- 总爆款数
  hit_rate DECIMAL(5,2),                 -- 爆款率
  avg_views BIGINT,                      -- 平均播放量
  avg_likes BIGINT,                      -- 平均点赞数
  
  -- 学习状态
  learning_progress INTEGER DEFAULT 0,   -- 学习进度（0-100）
  last_learned_at TIMESTAMP WITH TIME ZONE, -- 最后学习时间
  confidence_score DECIMAL(5,2),         -- 置信度得分
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. 创作会话记录 (creation_sessions)
-- 记录每次创作的完整过程，用于学习优化
-- =====================================================
CREATE TABLE IF NOT EXISTS creation_sessions (
  id BIGSERIAL PRIMARY KEY,
  uid TEXT NOT NULL,
  session_type TEXT NOT NULL,            -- 会话类型：script/topic/opening
  
  -- 输入信息
  input_context JSONB,                   -- 输入上下文（客户、选题等）
  memory_context JSONB,                  -- 记忆上下文（注入的记忆）
  
  -- 生成过程
  generation_params JSONB,               -- 生成参数
  generation_count INTEGER DEFAULT 1,    -- 生成次数
  regenerate_count INTEGER DEFAULT 0,    -- 重新生成次数
  
  -- 最终输出
  final_output TEXT,                     -- 最终输出的内容
  final_material_id BIGINT,              -- 最终保存的素材ID
  
  -- 用户反馈
  user_actions TEXT[],                   -- 用户行为：copy/save/regenerate/edit/discard
  user_edits TEXT,                       -- 用户修改内容
  user_feedback TEXT,                    -- 用户文字反馈
  satisfaction_score INTEGER,            -- 满意度评分：1-5
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_sessions_uid ON creation_sessions(uid);
CREATE INDEX IF NOT EXISTS idx_sessions_type ON creation_sessions(session_type);
CREATE INDEX IF NOT EXISTS idx_sessions_created ON creation_sessions(created_at DESC);

-- =====================================================
-- 5. 扩展现有素材表 (materials)
-- 添加效果相关字段
-- =====================================================
ALTER TABLE materials 
ADD COLUMN IF NOT EXISTS view_count BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS like_count BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS comment_count BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS share_count BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS collect_count BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS finish_rate DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS publish_platform TEXT,
ADD COLUMN IF NOT EXISTS publish_url TEXT,
ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_hit BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS hit_factors JSONB,
ADD COLUMN IF NOT EXISTS opening_type TEXT;

-- =====================================================
-- 6. 初始数据：全局爆款特征模板
-- =====================================================
INSERT INTO hit_patterns (uid, pattern_type, pattern_name, pattern_value, description, success_count, applicable_scenes)
VALUES 
  ('system', 'title', '数字+金额标题', 'N个X，帮你省/赚Y', '用具体数字和金额增强可信度', 100, ARRAY['产品推荐', '避坑指南', '省钱攻略']),
  ('system', 'title', '数字+结果标题', 'N个X，让你Y', '用数字量化结果', 100, ARRAY['技能教学', '经验分享', '方法介绍']),
  ('system', 'title', '反差对比标题', '以为X，其实Y', '制造认知反差', 100, ARRAY['观点输出', '认知颠覆', '避坑指南']),
  ('system', 'title', '疑问悬念标题', '为什么X？', '引发好奇心', 100, ARRAY['知识科普', '经验分享', '故事讲述']),
  ('system', 'title', '身份标签标题', '如果你是X，一定要看', '精准锁定目标人群', 100, ARRAY['人群定向', '痛点解决', '产品推荐']),
  
  ('system', 'opening', '悬念式开头', '你可能不信，但...', '制造悬念，引发好奇', 80, ARRAY['故事讲述', '观点输出']),
  ('system', 'opening', '痛点式开头', '你是不是也遇到过...', '直击痛点，引发共鸣', 90, ARRAY['问题解决', '产品推荐', '避坑指南']),
  ('system', 'opening', '反差式开头', '大家都以为X，但其实...', '颠覆认知，制造冲击', 85, ARRAY['观点输出', '认知颠覆']),
  ('system', 'opening', '数字式开头', '我试了N个方法，最后...', '用数字建立权威', 75, ARRAY['经验分享', '测评对比']),
  ('system', 'opening', '故事式开头', '那天有个粉丝问我...', '用故事引入，增强代入感', 88, ARRAY['故事讲述', '案例分享']),

  ('system', 'emotion', '焦虑情绪', '痛点+恐惧+解决方案', '激发焦虑，再提供解决方案', 70, ARRAY['问题解决', '产品推荐']),
  ('system', 'emotion', '共鸣情绪', '困境+理解+出路', '引发共鸣，建立信任', 85, ARRAY['经验分享', '故事讲述']),
  ('system', 'emotion', '好奇情绪', '悬念+揭秘+升华', '保持好奇，最后给出答案', 80, ARRAY['知识科普', '故事讲述']),
  ('system', 'emotion', '惊喜情绪', '期待+反转+超预期', '制造惊喜，超出预期', 75, ARRAY['测评对比', '产品推荐'])
ON CONFLICT DO NOTHING;

-- =====================================================
-- 7. 创建视图：爆款分析视图
-- =====================================================
CREATE OR REPLACE VIEW hit_analysis_view AS
SELECT 
  cp.*,
  m.content as full_content,
  m.tags as material_tags,
  c.name as customer_name,
  c.ip_positioning
FROM content_performance cp
LEFT JOIN materials m ON cp.material_id = m.id
LEFT JOIN customers c ON cp.customer_id = c.id
WHERE cp.is_hit = TRUE
ORDER BY cp.hit_score DESC;

-- =====================================================
-- 8. 创建函数：更新爆款标记
-- =====================================================
CREATE OR REPLACE FUNCTION update_hit_status()
RETURNS TRIGGER AS $$
BEGIN
  -- 根据效果数据判断是否爆款
  -- 播放量>1万 或 点赞率>3% 或 完播率>50%
  NEW.is_hit := (
    NEW.view_count > 10000 
    OR (NEW.view_count > 0 AND NEW.like_count::DECIMAL / NEW.view_count > 0.03)
    OR (NEW.finish_rate > 50)
  );
  
  -- 计算爆款得分
  NEW.hit_score := 
    LEAST(NEW.view_count::DECIMAL / 1000, 40) +  -- 播放量贡献（最多40分）
    LEAST(NEW.like_count::DECIMAL / 100, 30) +   -- 点赞贡献（最多30分）
    COALESCE(NEW.finish_rate, 0) * 0.3;          -- 完播率贡献（最多30分）
  
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS trigger_update_hit_status ON content_performance;
CREATE TRIGGER trigger_update_hit_status
BEFORE INSERT OR UPDATE ON content_performance
FOR EACH ROW
EXECUTE FUNCTION update_hit_status();
