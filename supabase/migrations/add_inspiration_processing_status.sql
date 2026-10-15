-- 添加灵感共创视频处理状态字段
-- 用于异步处理视频解析和文案提取

-- 添加 processing_status 字段
ALTER TABLE inspiration_videos 
ADD COLUMN IF NOT EXISTS processing_status text DEFAULT 'pending';

-- 添加 processing_error 字段（存储处理失败原因）
ALTER TABLE inspiration_videos 
ADD COLUMN IF NOT EXISTS processing_error text;

-- 添加 processing_started_at 字段（处理开始时间）
ALTER TABLE inspiration_videos 
ADD COLUMN IF NOT EXISTS processing_started_at timestamptz;

-- 添加 processing_completed_at 字段（处理完成时间）
ALTER TABLE inspiration_videos 
ADD COLUMN IF NOT EXISTS processing_completed_at timestamptz;

-- 添加索引以加速查询
CREATE INDEX IF NOT EXISTS idx_inspiration_videos_processing_status 
ON inspiration_videos(processing_status);

-- 更新现有记录的状态为 completed
UPDATE inspiration_videos 
SET processing_status = 'completed',
    processing_completed_at = COALESCE(approved_at, created_at)
WHERE processing_status = 'pending' AND script_content IS NOT NULL;
