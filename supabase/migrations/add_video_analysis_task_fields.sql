-- 视频分析历史表添加异步任务状态字段
-- 执行此SQL以支持异步任务功能

-- 添加状态字段
ALTER TABLE video_analysis_history 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'completed';

-- 添加进度字段
ALTER TABLE video_analysis_history 
ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0;

-- 添加进度消息字段
ALTER TABLE video_analysis_history 
ADD COLUMN IF NOT EXISTS progress_message TEXT;

-- 添加错误消息字段
ALTER TABLE video_analysis_history 
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- 添加更新时间字段
ALTER TABLE video_analysis_history 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 为现有记录设置默认值
UPDATE video_analysis_history 
SET status = 'completed', 
    progress = 100, 
    progress_message = '分析完成',
    updated_at = created_at
WHERE status IS NULL OR status = '';

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_video_analysis_status ON video_analysis_history(status);
CREATE INDEX IF NOT EXISTS idx_video_analysis_user_status ON video_analysis_history(user_id, status);
