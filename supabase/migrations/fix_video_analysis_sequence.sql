-- 修复 video_analysis_history 表的序列
-- 解决 "duplicate key value violates unique constraint" 错误

-- 方法1：直接设置序列为最大ID+1
SELECT setval('video_analysis_history_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM video_analysis_history));

-- 验证修复结果
SELECT 
  (SELECT MAX(id) FROM video_analysis_history) as max_id,
  (SELECT last_value FROM video_analysis_history_id_seq) as seq_value;
