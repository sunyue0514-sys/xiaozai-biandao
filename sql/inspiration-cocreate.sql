-- 灵感共创功能数据库表
-- 执行此 SQL 创建必要的表

-- 1. 用户权限表
CREATE TABLE IF NOT EXISTS inspiration_permissions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  total_extended_hours INTEGER DEFAULT 0,
  upload_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 爆款视频库表
CREATE TABLE IF NOT EXISTS inspiration_videos (
  id SERIAL PRIMARY KEY,
  video_url TEXT NOT NULL,
  platform VARCHAR(50) NOT NULL, -- douyin, kuaishou, xiaohongshu, bilibili, weibo
  category VARCHAR(20) NOT NULL, -- content, presentation
  title TEXT,
  author VARCHAR(200),
  likes INTEGER DEFAULT 0,
  description TEXT,
  cover_url TEXT,
  hashtags TEXT[], -- 话题标签数组
  viral_tags TEXT[], -- 爆款标签数组
  track VARCHAR(200), -- 赛道
  content_type VARCHAR(100), -- 内容类型
  highlight TEXT, -- 亮点
  uploaded_by INTEGER REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 上传记录表
CREATE TABLE IF NOT EXISTS inspiration_uploads (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_url TEXT NOT NULL,
  platform VARCHAR(50) NOT NULL,
  category VARCHAR(20) NOT NULL,
  title TEXT,
  author VARCHAR(200),
  likes INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
  reject_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_inspiration_permissions_user ON inspiration_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_inspiration_permissions_expires ON inspiration_permissions(expires_at);
CREATE INDEX IF NOT EXISTS idx_inspiration_videos_status ON inspiration_videos(status);
CREATE INDEX IF NOT EXISTS idx_inspiration_videos_category ON inspiration_videos(category);
CREATE INDEX IF NOT EXISTS idx_inspiration_uploads_user ON inspiration_uploads(user_id);

-- 更新触发器（自动更新 updated_at）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_inspiration_permissions_updated_at
    BEFORE UPDATE ON inspiration_permissions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inspiration_videos_updated_at
    BEFORE UPDATE ON inspiration_videos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
