-- 产品档案表扩展字段
-- 用于存储智能分析结果，提升素材生成质量

-- 用户画像扩展
ALTER TABLE product_profiles ADD COLUMN IF NOT EXISTS user_age_range TEXT;
ALTER TABLE product_profiles ADD COLUMN IF NOT EXISTS user_gender TEXT;
ALTER TABLE product_profiles ADD COLUMN IF NOT EXISTS user_consumption_level TEXT;
ALTER TABLE product_profiles ADD COLUMN IF NOT EXISTS user_interests TEXT[];

-- 价值阶梯
ALTER TABLE product_profiles ADD COLUMN IF NOT EXISTS value_ladder_basic TEXT;
ALTER TABLE product_profiles ADD COLUMN IF NOT EXISTS value_ladder_advanced TEXT;
ALTER TABLE product_profiles ADD COLUMN IF NOT EXISTS value_ladder_top TEXT;

-- 痛点详情（JSON数组）
ALTER TABLE product_profiles ADD COLUMN IF NOT EXISTS pain_points_json TEXT;

-- 购买阻力（JSON数组）
ALTER TABLE product_profiles ADD COLUMN IF NOT EXISTS purchase_barriers_json TEXT;

-- 信任背书
ALTER TABLE product_profiles ADD COLUMN IF NOT EXISTS trust_proof_sales TEXT;
ALTER TABLE product_profiles ADD COLUMN IF NOT EXISTS trust_proof_ratings TEXT;
ALTER TABLE product_profiles ADD COLUMN IF NOT EXISTS trust_proof_certifications TEXT[];
ALTER TABLE product_profiles ADD COLUMN IF NOT EXISTS trust_proof_cases TEXT;
ALTER TABLE product_profiles ADD COLUMN IF NOT EXISTS trust_proof_endorsements TEXT;

-- 分析状态
ALTER TABLE product_profiles ADD COLUMN IF NOT EXISTS analysis_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE product_profiles ADD COLUMN IF NOT EXISTS analysis_at TIMESTAMP WITH TIME ZONE;

-- 添加注释
COMMENT ON COLUMN product_profiles.user_age_range IS '目标用户年龄段';
COMMENT ON COLUMN product_profiles.user_gender IS '目标用户性别';
COMMENT ON COLUMN product_profiles.user_consumption_level IS '目标用户消费能力';
COMMENT ON COLUMN product_profiles.user_interests IS '目标用户兴趣标签';
COMMENT ON COLUMN product_profiles.value_ladder_basic IS '基础价值：产品本身解决的问题';
COMMENT ON COLUMN product_profiles.value_ladder_advanced IS '进阶价值：带来的额外收益';
COMMENT ON COLUMN product_profiles.value_ladder_top IS '顶层价值：情感/身份认同';
COMMENT ON COLUMN product_profiles.pain_points_json IS '痛点详情JSON数组';
COMMENT ON COLUMN product_profiles.purchase_barriers_json IS '购买阻力JSON数组';
COMMENT ON COLUMN product_profiles.analysis_completed IS '是否已完成智能分析';
COMMENT ON COLUMN product_profiles.analysis_at IS '最后分析时间';
