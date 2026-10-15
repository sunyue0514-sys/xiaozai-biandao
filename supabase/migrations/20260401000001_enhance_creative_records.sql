-- 智能推导创作历史记录增强
-- 添加版本链支持和修改记录

-- 1. 添加版本相关字段
ALTER TABLE creative_records 
ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES creative_records(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS action VARCHAR(50) DEFAULT 'generate',
ADD COLUMN IF NOT EXISTS edit_request TEXT,
ADD COLUMN IF NOT EXISTS edit_paragraphs TEXT[],  -- 如 ['②', '③']
ADD COLUMN IF NOT EXISTS edit_context JSONB;  -- 修改前的上下文

-- 2. 添加版本链索引
CREATE INDEX IF NOT EXISTS idx_creative_records_parent ON creative_records(parent_id);
CREATE INDEX IF NOT EXISTS idx_creative_records_version ON creative_records(version);

-- 3. 更新已有记录
UPDATE creative_records SET 
  action = 'generate',
  version = 1
WHERE action IS NULL OR action = '';

-- 4. 创建版本历史视图（方便查看版本链）
CREATE OR REPLACE VIEW creative_records_with_versions AS
WITH RECURSIVE version_chain AS (
  -- 起始记录（没有父版本的）
  SELECT 
    cr.*,
    1 as depth,
    ARRAY[cr.id] as path
  FROM creative_records cr
  WHERE cr.parent_id IS NULL
  
  UNION ALL
  
  -- 后续版本
  SELECT 
    cr.*,
    vc.depth + 1,
    vc.path || cr.id
  FROM creative_records cr
  INNER JOIN version_chain vc ON cr.parent_id = vc.id
)
SELECT * FROM version_chain
ORDER BY path;
