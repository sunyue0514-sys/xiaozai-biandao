-- EMPTY TEST DATABASE ONLY. Not an upgrade migration. See docs/DATABASE_INITIALIZATION.md.
BEGIN;
SET LOCAL search_path = public, pg_catalog;
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','S','f')) OR EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid='pg_proc'::regclass AND d.objid=p.oid AND d.deptype='e')) THEN
  RAISE EXCEPTION 'Refusing initialization: public schema is not empty';
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role' AND rolbypassrls) THEN
  RAISE EXCEPTION 'Supabase service_role with BYPASSRLS is required';
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
  RAISE EXCEPTION 'Supabase API roles are required';
 END IF;
END $$;

-- Source: drizzle/0000_chemical_drax.sql
CREATE TABLE "agent_earnings" (
	"id" serial PRIMARY KEY NOT NULL,
	"agent_uid" varchar(36) NOT NULL,
	"user_id" integer NOT NULL,
	"user_name" varchar(100),
	"amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"commission" numeric(10, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "agent_invitations" (
	"id" serial PRIMARY KEY NOT NULL,
	"agent_uid" varchar(36) NOT NULL,
	"invitee_id" integer NOT NULL,
	"invitee_name" varchar(100),
	"invitee_phone" varchar(20),
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"total_spent" numeric(10, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" varchar(36) NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text NOT NULL,
	"persona_profile" text,
	"account_plan" text,
	"ip_positioning" text,
	"business_analysis" text,
	"business_form_data" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "devices" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"uid" varchar(50) NOT NULL,
	"name" varchar(100),
	"type" varchar(50),
	"os" varchar(50),
	"browser" varchar(50),
	"location" varchar(100),
	"ip" varchar(50),
	"last_active" timestamp with time zone DEFAULT now(),
	"current" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE "health_check" (
	"id" serial NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE "login_records" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"uid" varchar(50) NOT NULL,
	"device" varchar(255) NOT NULL,
	"os" varchar(100),
	"browser" varchar(100),
	"location" varchar(255),
	"ip" varchar(50),
	"status" varchar(20) DEFAULT 'success',
	"created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE "materials" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" varchar(36) NOT NULL,
	"customer_id" integer NOT NULL,
	"topic" varchar(500) NOT NULL,
	"title" varchar(500),
	"script_type" varchar(100) NOT NULL,
	"shooting_method" varchar(100),
	"status" varchar(50) DEFAULT 'draft' NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"customer_name" varchar(200) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"content" text,
	"material_type" varchar(20),
	"archive_type" varchar(20) DEFAULT 'customer',
	"product_id" integer,
	"product_name" varchar(200),
	"source_type" varchar(20),
	"view_count" bigint,
	"like_count" bigint,
	"comment_count" bigint,
	"share_count" bigint,
	"collect_count" bigint,
	"finish_rate" numeric(5, 2),
	"publish_platform" text,
	"publish_url" text,
	"published_at" timestamp with time zone,
	"is_hit" boolean,
	"hit_factors" text,
	"opening_type" text
);
CREATE TABLE "redemption_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(20) NOT NULL,
	"created_by" varchar(50) NOT NULL,
	"created_by_username" varchar(100),
	"type" varchar(20) DEFAULT 'trial',
	"reward_type" varchar(20) DEFAULT 'membership',
	"reward_days" integer DEFAULT 1,
	"reward_power" integer DEFAULT 1000,
	"max_uses" integer DEFAULT 1,
	"used_count" integer DEFAULT 0,
	"used_by" integer[],
	"status" varchar(20) DEFAULT 'active',
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "redemption_codes_code_key" UNIQUE("code")
);
CREATE TABLE "sessions" (
	"token" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" varchar(36) NOT NULL,
	"username" varchar(100) NOT NULL,
	"password" varchar(255) NOT NULL,
	"role" varchar(20) DEFAULT 'user' NOT NULL,
	"member_type" varchar(20) DEFAULT 'none' NOT NULL,
	"phone" varchar(20),
	"max_customers" integer DEFAULT 3 NOT NULL,
	"max_devices" integer DEFAULT 1 NOT NULL,
	"power_quota" integer DEFAULT 0 NOT NULL,
	"member_expiry" timestamp with time zone,
	"used_power" integer DEFAULT 0 NOT NULL,
	"inviter_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone,
	CONSTRAINT "users_uid_unique" UNIQUE("uid"),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
CREATE TABLE "video_analysis_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"video_url" varchar(1000) NOT NULL,
	"video_title" varchar(500),
	"video_cover" varchar(1000),
	"platform" varchar(50) NOT NULL,
	"platform_name" varchar(50),
	"author" varchar(200),
	"author_id" varchar(100),
	"author_avatar" varchar(500),
	"likes" integer DEFAULT 0,
	"comments" integer DEFAULT 0,
	"shares" integer DEFAULT 0,
	"collects" integer DEFAULT 0,
	"views" integer DEFAULT 0,
	"script_content" text,
	"analysis_report" text,
	"total_score" numeric(3, 1),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" varchar(50),
	"progress" integer DEFAULT 0,
	"progress_message" text,
	"error_message" text,
	"updated_at" timestamp with time zone
);
CREATE INDEX "agent_earnings_agent_uid_idx" ON "agent_earnings" USING btree ("agent_uid" text_ops);
CREATE INDEX "agent_earnings_user_id_idx" ON "agent_earnings" USING btree ("user_id" int4_ops);
CREATE INDEX "agent_invitations_agent_uid_idx" ON "agent_invitations" USING btree ("agent_uid" text_ops);
CREATE INDEX "agent_invitations_invitee_id_idx" ON "agent_invitations" USING btree ("invitee_id" int4_ops);
CREATE INDEX "customers_uid_idx" ON "customers" USING btree ("uid" text_ops);
CREATE INDEX "idx_devices_uid" ON "devices" USING btree ("uid" text_ops);
CREATE INDEX "idx_login_records_created_at" ON "login_records" USING btree ("created_at" timestamptz_ops);
CREATE INDEX "idx_login_records_uid" ON "login_records" USING btree ("uid" text_ops);
CREATE INDEX "materials_customer_id_idx" ON "materials" USING btree ("customer_id" int4_ops);
CREATE INDEX "materials_uid_idx" ON "materials" USING btree ("uid" text_ops);
CREATE INDEX "materials_product_id_idx" ON "materials" USING btree ("product_id" int4_ops);
CREATE INDEX "materials_archive_type_idx" ON "materials" USING btree ("archive_type" text_ops);
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id" int4_ops);
CREATE INDEX "users_inviter_id_idx" ON "users" USING btree ("inviter_id" int4_ops);
CREATE INDEX "users_uid_idx" ON "users" USING btree ("uid" text_ops);
CREATE INDEX "users_username_idx" ON "users" USING btree ("username" text_ops);
CREATE INDEX "video_analysis_history_user_id_idx" ON "video_analysis_history" USING btree ("user_id" int4_ops);
CREATE INDEX "video_analysis_history_created_at_idx" ON "video_analysis_history" USING btree ("created_at" timestamptz_ops);

-- Source: sql/inspiration-cocreate.sql

CREATE TABLE IF NOT EXISTS inspiration_permissions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  total_extended_hours INTEGER DEFAULT 0,
  upload_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS inspiration_videos (
  id SERIAL PRIMARY KEY,
  video_url TEXT NOT NULL,
  platform VARCHAR(50) NOT NULL, 
  category VARCHAR(20) NOT NULL, 
  title TEXT,
  author VARCHAR(200),
  likes INTEGER DEFAULT 0,
  description TEXT,
  cover_url TEXT,
  hashtags TEXT[], 
  viral_tags TEXT[], 
  track VARCHAR(200), 
  content_type VARCHAR(100), 
  highlight TEXT, 
  uploaded_by INTEGER REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'pending', 
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS inspiration_uploads (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_url TEXT NOT NULL,
  platform VARCHAR(50) NOT NULL,
  category VARCHAR(20) NOT NULL,
  title TEXT,
  author VARCHAR(200),
  likes INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending', 
  reject_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_inspiration_permissions_user ON inspiration_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_inspiration_permissions_expires ON inspiration_permissions(expires_at);
CREATE INDEX IF NOT EXISTS idx_inspiration_videos_status ON inspiration_videos(status);
CREATE INDEX IF NOT EXISTS idx_inspiration_videos_category ON inspiration_videos(category);
CREATE INDEX IF NOT EXISTS idx_inspiration_uploads_user ON inspiration_uploads(user_id);
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


-- Source: supabase/migrations/agent_distribution_system.sql

ALTER TABLE users ADD COLUMN IF NOT EXISTS agent_path VARCHAR(50);
CREATE TABLE IF NOT EXISTS agent_subscriptions (
    id SERIAL PRIMARY KEY,
    agent_id INT NOT NULL,                    
    agent_uid VARCHAR(50) NOT NULL,           
    user_id INT NOT NULL,                     
    user_name VARCHAR(100),                   
    user_phone VARCHAR(20),                   
    plan_id INT NOT NULL,
    plan_name VARCHAR(100),
    original_price DECIMAL(10,2),             
    commission_rate DECIMAL(3,2),             
    commission_amount DECIMAL(10,2),          
    platform_amount DECIMAL(10,2),            
    settlement_status VARCHAR(20) DEFAULT 'pending', 
    settled_at TIMESTAMP,
    operator_ip VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS commission_records (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,                     
    user_name VARCHAR(100),                   
    plan_id INT,
    plan_name VARCHAR(100),
    original_price DECIMAL(10,2),             
    source_type VARCHAR(20) NOT NULL,         
    source_id INT,                            
    beneficiary_id INT NOT NULL,              
    beneficiary_uid VARCHAR(50) NOT NULL,     
    beneficiary_role VARCHAR(20),             
    amount DECIMAL(10,2) NOT NULL,            
    commission_rate DECIMAL(3,2),             
    settlement_status VARCHAR(20) DEFAULT 'pending', 
    settled_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS agent_settlements (
    id SERIAL PRIMARY KEY,
    agent_id INT NOT NULL,
    agent_uid VARCHAR(50) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,            
    commission_ids INT[],                     
    payment_method VARCHAR(50),               
    payment_proof TEXT,                       
    status VARCHAR(20) DEFAULT 'pending',     
    confirmed_by INT,
    confirmed_at TIMESTAMP,
    rejected_reason VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_agent_path ON users(agent_path);
CREATE INDEX IF NOT EXISTS idx_users_inviter_id ON users(inviter_id);
CREATE INDEX IF NOT EXISTS idx_agent_subscriptions_agent_id ON agent_subscriptions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_subscriptions_user_id ON agent_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_subscriptions_settlement_status ON agent_subscriptions(settlement_status);
CREATE INDEX IF NOT EXISTS idx_commission_records_beneficiary_id ON commission_records(beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_commission_records_source_type ON commission_records(source_type);
CREATE INDEX IF NOT EXISTS idx_commission_records_settlement_status ON commission_records(settlement_status);
CREATE INDEX IF NOT EXISTS idx_agent_settlements_agent_id ON agent_settlements(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_settlements_status ON agent_settlements(status);
COMMENT ON TABLE agent_subscriptions IS '代理开通记录：代理为下级开通会员的记录';
COMMENT ON TABLE commission_records IS '佣金记录：所有佣金分成记录，包括代理开通和兑换码';
COMMENT ON TABLE agent_settlements IS '结算记录：代理与平台的结算记录';


-- Source: supabase/migrations/008_ai_quality_tables.sql

CREATE TABLE IF NOT EXISTS ai_call_logs (
  id SERIAL PRIMARY KEY,
  feature VARCHAR(100) NOT NULL,        
  user_id INTEGER,                       
  input TEXT,                            
  output TEXT,                           
  success BOOLEAN DEFAULT true,          
  error_type VARCHAR(100),               
  error_message TEXT,                    
  duration_ms INTEGER,                   
  tokens_used INTEGER DEFAULT 0,         
  model VARCHAR(100),                    
  quality_score DECIMAL(3,2),            
  created_at TIMESTAMP DEFAULT NOW(),    
  CONSTRAINT valid_quality_score CHECK (quality_score IS NULL OR (quality_score >= 0 AND quality_score <= 5))
);
CREATE INDEX IF NOT EXISTS idx_ai_call_logs_feature ON ai_call_logs(feature);
CREATE INDEX IF NOT EXISTS idx_ai_call_logs_created_at ON ai_call_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_call_logs_success ON ai_call_logs(success);
CREATE INDEX IF NOT EXISTS idx_ai_call_logs_user_id ON ai_call_logs(user_id);
CREATE TABLE IF NOT EXISTS ai_quality_metrics (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,                    
  feature VARCHAR(100) NOT NULL,         
  total_calls INTEGER DEFAULT 0,         
  success_calls INTEGER DEFAULT 0,       
  failed_calls INTEGER DEFAULT 0,        
  avg_duration_ms DECIMAL(10,2),         
  max_duration_ms INTEGER,               
  min_duration_ms INTEGER,               
  total_tokens BIGINT DEFAULT 0,         
  avg_quality_score DECIMAL(3,2),        
  error_types JSONB,                     
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(date, feature)
);
CREATE INDEX IF NOT EXISTS idx_ai_quality_metrics_date ON ai_quality_metrics(date);
CREATE INDEX IF NOT EXISTS idx_ai_quality_metrics_feature ON ai_quality_metrics(feature);
CREATE TABLE IF NOT EXISTS ai_optimization_suggestions (
  id SERIAL PRIMARY KEY,
  feature VARCHAR(100) NOT NULL,         
  priority VARCHAR(20) NOT NULL,         
  issue TEXT NOT NULL,                   
  suggestion TEXT NOT NULL,              
  code_example TEXT,                     
  status VARCHAR(20) DEFAULT 'pending',  
  created_at TIMESTAMP DEFAULT NOW(),
  applied_at TIMESTAMP,
  CONSTRAINT valid_priority CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'applied', 'ignored'))
);
CREATE INDEX IF NOT EXISTS idx_ai_optimization_suggestions_feature ON ai_optimization_suggestions(feature);
CREATE INDEX IF NOT EXISTS idx_ai_optimization_suggestions_status ON ai_optimization_suggestions(status);
CREATE TABLE IF NOT EXISTS ai_quality_reports (
  id SERIAL PRIMARY KEY,
  report_id VARCHAR(100) UNIQUE NOT NULL, 
  type VARCHAR(20) NOT NULL,              
  period_start DATE NOT NULL,             
  period_end DATE NOT NULL,               
  summary JSONB NOT NULL,                 
  details JSONB,                          
  highlights TEXT[],                      
  actions TEXT[],                         
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT valid_report_type CHECK (type IN ('daily', 'weekly', 'monthly'))
);
CREATE INDEX IF NOT EXISTS idx_ai_quality_reports_type ON ai_quality_reports(type);
CREATE INDEX IF NOT EXISTS idx_ai_quality_reports_period ON ai_quality_reports(period_start, period_end);
COMMENT ON TABLE ai_call_logs IS 'AI调用日志表，记录每次AI调用的详细信息';
COMMENT ON TABLE ai_quality_metrics IS 'AI质量指标汇总表，按天聚合统计';
COMMENT ON TABLE ai_optimization_suggestions IS 'AI优化建议记录表';
COMMENT ON TABLE ai_quality_reports IS 'AI质量报告表';


-- Source: supabase/migrations/20260331000001_create_creative_records.sql

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
CREATE INDEX IF NOT EXISTS idx_creative_records_user_id ON creative_records(user_id);
CREATE INDEX IF NOT EXISTS idx_creative_records_created_at ON creative_records(created_at);
CREATE INDEX IF NOT EXISTS idx_creative_records_expires_at ON creative_records(expires_at);
CREATE OR REPLACE FUNCTION cleanup_expired_creative_records()
RETURNS void AS $$
BEGIN
  DELETE FROM creative_records WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;
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


-- Source: supabase/migrations/20260401000001_enhance_creative_records.sql

ALTER TABLE creative_records 
ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES creative_records(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS action VARCHAR(50) DEFAULT 'generate',
ADD COLUMN IF NOT EXISTS edit_request TEXT,
ADD COLUMN IF NOT EXISTS edit_paragraphs TEXT[],  
ADD COLUMN IF NOT EXISTS edit_context JSONB;  
CREATE INDEX IF NOT EXISTS idx_creative_records_parent ON creative_records(parent_id);
CREATE INDEX IF NOT EXISTS idx_creative_records_version ON creative_records(version);
UPDATE creative_records SET 
  action = 'generate',
  version = 1
WHERE action IS NULL OR action = '';
CREATE OR REPLACE VIEW creative_records_with_versions AS
WITH RECURSIVE version_chain AS (
  SELECT 
    cr.*,
    1 as depth,
    ARRAY[cr.id] as path
  FROM creative_records cr
  WHERE cr.parent_id IS NULL
  UNION ALL
  SELECT 
    cr.*,
    vc.depth + 1,
    vc.path || cr.id
  FROM creative_records cr
  INNER JOIN version_chain vc ON cr.parent_id = vc.id
)
SELECT * FROM version_chain
ORDER BY path;


-- Source: supabase/migrations/add_inspiration_processing_status.sql

ALTER TABLE inspiration_videos 
ADD COLUMN IF NOT EXISTS processing_status text DEFAULT 'pending';
ALTER TABLE inspiration_videos 
ADD COLUMN IF NOT EXISTS processing_error text;
ALTER TABLE inspiration_videos 
ADD COLUMN IF NOT EXISTS processing_started_at timestamptz;
ALTER TABLE inspiration_videos 
ADD COLUMN IF NOT EXISTS processing_completed_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_inspiration_videos_processing_status 
ON inspiration_videos(processing_status);


-- Source: src/lib/memory-system/schema.sql

CREATE TABLE IF NOT EXISTS content_performance (
  id BIGSERIAL PRIMARY KEY,
  uid TEXT NOT NULL,                    
  material_id BIGINT,                    
  customer_id BIGINT,                    
  title TEXT,                            
  topic TEXT,                            
  script_type TEXT,                      
  opening_type TEXT,                     
  content_preview TEXT,                  
  platform TEXT,                         
  publish_url TEXT,                      
  published_at TIMESTAMP WITH TIME ZONE, 
  view_count BIGINT DEFAULT 0,           
  like_count BIGINT DEFAULT 0,           
  comment_count BIGINT DEFAULT 0,        
  share_count BIGINT DEFAULT 0,          
  collect_count BIGINT DEFAULT 0,        
  finish_rate DECIMAL(5,2),              
  is_hit BOOLEAN DEFAULT FALSE,          
  hit_score DECIMAL(5,2),                
  hit_factors JSONB,                     
  ai_analysis TEXT,                      
  user_rating INTEGER,                   
  user_tags TEXT[],                      
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_performance_uid ON content_performance(uid);
CREATE INDEX IF NOT EXISTS idx_performance_customer ON content_performance(customer_id);
CREATE INDEX IF NOT EXISTS idx_performance_material ON content_performance(material_id);
CREATE INDEX IF NOT EXISTS idx_performance_is_hit ON content_performance(is_hit);
CREATE INDEX IF NOT EXISTS idx_performance_platform ON content_performance(platform);
CREATE TABLE IF NOT EXISTS hit_patterns (
  id BIGSERIAL PRIMARY KEY,
  uid TEXT NOT NULL,                     
  customer_id BIGINT,                    
  pattern_type TEXT NOT NULL,            
  pattern_name TEXT NOT NULL,            
  pattern_value TEXT,                    
  description TEXT,                      
  success_count INTEGER DEFAULT 1,       
  total_usage INTEGER DEFAULT 1,         
  success_rate DECIMAL(5,2),             
  example_titles TEXT[],                 
  example_material_ids BIGINT[],         
  applicable_scenes TEXT[],              
  applicable_platforms TEXT[],           
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_patterns_uid ON hit_patterns(uid);
CREATE INDEX IF NOT EXISTS idx_patterns_type ON hit_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_patterns_customer ON hit_patterns(customer_id);
CREATE TABLE IF NOT EXISTS user_style_profile (
  id BIGSERIAL PRIMARY KEY,
  uid TEXT NOT NULL UNIQUE,              
  writing_style TEXT,                    
  tone_preference TEXT,                  
  language_style TEXT,                   
  title_formulas TEXT[],                 
  title_length_preference TEXT,          
  title_number_preference BOOLEAN,       
  title_emotion_words TEXT[],            
  preferred_opening_types TEXT[],        
  opening_hook_patterns TEXT[],          
  preferred_script_types TEXT[],         
  avg_content_length INTEGER,            
  emoji_usage_rate DECIMAL(5,2),         
  question_usage_rate DECIMAL(5,2),      
  dominant_emotions TEXT[],              
  emotion_intensity TEXT,                
  total_contents INTEGER DEFAULT 0,      
  total_hits INTEGER DEFAULT 0,          
  hit_rate DECIMAL(5,2),                 
  avg_views BIGINT,                      
  avg_likes BIGINT,                      
  learning_progress INTEGER DEFAULT 0,   
  last_learned_at TIMESTAMP WITH TIME ZONE, 
  confidence_score DECIMAL(5,2),         
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS creation_sessions (
  id BIGSERIAL PRIMARY KEY,
  uid TEXT NOT NULL,
  session_type TEXT NOT NULL,            
  input_context JSONB,                   
  memory_context JSONB,                  
  generation_params JSONB,               
  generation_count INTEGER DEFAULT 1,    
  regenerate_count INTEGER DEFAULT 0,    
  final_output TEXT,                     
  final_material_id BIGINT,              
  user_actions TEXT[],                   
  user_edits TEXT,                       
  user_feedback TEXT,                    
  satisfaction_score INTEGER,            
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sessions_uid ON creation_sessions(uid);
CREATE INDEX IF NOT EXISTS idx_sessions_type ON creation_sessions(session_type);
CREATE INDEX IF NOT EXISTS idx_sessions_created ON creation_sessions(created_at DESC);

-- Included by initialize-empty-test-database.sql; do not run separately.
-- New tables reconstructed from explicit API payloads, interfaces and row mappings.
-- No real accounts, external credentials, paid plans or customer data are seeded.

ALTER TABLE users
 ADD COLUMN credits integer NOT NULL DEFAULT 0,
 ADD COLUMN power_expiry timestamptz,
 ADD COLUMN referral_code text UNIQUE,
 ADD COLUMN is_first_login boolean NOT NULL DEFAULT true,
 ADD COLUMN member_expire_at timestamptz,
 ADD COLUMN agent_level integer;
-- member_expire_at is a legacy spelling still written by register; no automatic
-- synchronization with member_expiry is inferred.
ALTER TABLE customers ADD COLUMN avatar_url text;
ALTER TABLE materials ADD COLUMN summary text, ADD COLUMN tags text[],
 ADD COLUMN platform text, ADD COLUMN is_starred boolean DEFAULT false;
ALTER TABLE inspiration_videos
 ADD COLUMN video_id text, ADD COLUMN industry text, ADD COLUMN cover text,
 ADD COLUMN author_avatar text, ADD COLUMN script_content text,
 ADD COLUMN comments bigint DEFAULT 0, ADD COLUMN shares bigint DEFAULT 0,
 ADD COLUMN collects bigint DEFAULT 0, ADD COLUMN views bigint DEFAULT 0,
 ADD COLUMN quick_analysis_result jsonb;
ALTER TABLE commission_records ADD COLUMN settlement_id integer;
ALTER TABLE agent_settlements ADD COLUMN remark text,
 ADD COLUMN reviewed_by text, ADD COLUMN reviewed_at timestamptz,
 ADD COLUMN review_remark text, ADD COLUMN paid_at timestamptz;

CREATE TABLE agent_accounts (
 id serial PRIMARY KEY, user_id integer UNIQUE REFERENCES users(id),
 uid varchar(50) NOT NULL UNIQUE, agent_path text UNIQUE,
 parent_id integer, parent_uid text, referral_code text UNIQUE,
 commission_rate numeric(5,4) DEFAULT 0.5, platform_rate numeric(5,4) DEFAULT 0.5,
 agent_level integer DEFAULT 1, can_create_code boolean DEFAULT true,
 can_create_user boolean DEFAULT true, status text DEFAULT 'active',
 points_balance integer DEFAULT 0, points_total integer DEFAULT 0,
 points_used integer DEFAULT 0, invite_count integer DEFAULT 0,
 active_users integer DEFAULT 0, paid_user_count integer DEFAULT 0,
 total_earnings numeric(12,2) DEFAULT 0, this_month_earnings numeric(12,2) DEFAULT 0,
 withdrawn numeric(12,2) DEFAULT 0, total_sales numeric(12,2) DEFAULT 0,
 total_commission numeric(12,2) DEFAULT 0, settled_amount numeric(12,2) DEFAULT 0,
 pending_amount numeric(12,2) DEFAULT 0, created_by integer,
 created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
-- user_id intentionally nullable: legacy account upsert supplies uid only.
CREATE INDEX agent_accounts_parent_idx ON agent_accounts(parent_id);
CREATE INDEX agent_accounts_level_idx ON agent_accounts(agent_level);

CREATE TABLE product_profiles (
 id serial PRIMARY KEY, uid text NOT NULL, name text NOT NULL,
 category text DEFAULT 'other', price text, selling_points text[] DEFAULT '{}',
 target_users text, user_pain_points text, usage_scenario text, promotion text,
 brand_story text, competitor_analysis text, ai_positioning text,
 user_age_range text, user_gender text, user_consumption_level text,
 user_interests text[], value_ladder_basic text, value_ladder_advanced text,
 value_ladder_top text, pain_points_json text, purchase_barriers_json text,
 trust_proof_sales text, trust_proof_ratings text, trust_proof_certifications text[],
 trust_proof_cases text, trust_proof_endorsements text,
 analysis_completed boolean DEFAULT false, analysis_at timestamptz,
 created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE INDEX product_profiles_owner_idx ON product_profiles(uid, created_at DESC);

CREATE TABLE inspirations (
 id serial PRIMARY KEY, uid text NOT NULL, content text NOT NULL,
 image_url text, link text, category text DEFAULT 'topic', tags text[] DEFAULT '{}',
 expansion_type text, expansion_result text, status text DEFAULT 'draft',
 converted_to jsonb, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE INDEX inspirations_owner_idx ON inspirations(uid, created_at DESC);
CREATE TABLE operation_logs (
 id serial PRIMARY KEY, operator_id integer, operator_uid text,
 operator_name text, operator_role text, action_type text NOT NULL,
 target_type text, target_id integer, target_name text, target_uid text,
 details jsonb, ip_address text, user_agent text, created_at timestamptz DEFAULT now()
);
CREATE INDEX operation_logs_created_idx ON operation_logs(created_at DESC);
CREATE INDEX operation_logs_operator_idx ON operation_logs(operator_id);
CREATE INDEX operation_logs_action_idx ON operation_logs(action_type);

CREATE TABLE points_transactions (
 id serial PRIMARY KEY, agent_id integer, agent_uid text NOT NULL,
 type text NOT NULL, points integer NOT NULL, balance_after integer,
 related_id integer, related_uid text, remark text, created_by integer,
 created_at timestamptz DEFAULT now()
);
CREATE INDEX points_transactions_owner_idx ON points_transactions(agent_id, created_at DESC);
CREATE TABLE code_consumption_records (
 id serial PRIMARY KEY, agent_id integer, agent_uid text, parent_id integer,
 parent_uid text, code_id integer, code text, code_type text,
 points_cost integer, created_at timestamptz DEFAULT now()
);
CREATE INDEX code_consumption_records_owner_idx ON code_consumption_records(agent_id, created_at DESC);
CREATE TABLE power_records (
 id serial PRIMARY KEY, user_id integer NOT NULL, amount integer NOT NULL,
 source_type text NOT NULL, description text, created_at timestamptz DEFAULT now()
);
CREATE INDEX power_records_owner_idx ON power_records(user_id, created_at DESC);

CREATE TABLE scriptless_conversations (
 id serial PRIMARY KEY, uid text NOT NULL, title text,
 created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE INDEX scriptless_conversations_owner_idx ON scriptless_conversations(uid, updated_at DESC);
CREATE TABLE scriptless_messages (
 id serial PRIMARY KEY, conversation_id integer NOT NULL REFERENCES scriptless_conversations(id) ON DELETE CASCADE,
 role text NOT NULL, content text NOT NULL, customer_id integer, result jsonb,
 created_at timestamptz DEFAULT now()
);
CREATE INDEX scriptless_messages_conversation_idx ON scriptless_messages(conversation_id, created_at);
CREATE TABLE credit_usage_logs (
 id serial PRIMARY KEY, uid text NOT NULL, amount integer NOT NULL,
 action text, conversation_id integer, created_at timestamptz DEFAULT now()
);
CREATE INDEX credit_usage_logs_owner_idx ON credit_usage_logs(uid, created_at DESC);

CREATE TABLE customer_materials (
 LIKE materials INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING STORAGE
);
-- LIKE would share materials.id's sequence; give this independently used table its own.
CREATE SEQUENCE customer_materials_id_seq OWNED BY customer_materials.id;
ALTER TABLE customer_materials ALTER COLUMN id SET DEFAULT nextval('public.customer_materials_id_seq');
ALTER TABLE customer_materials ADD PRIMARY KEY (id);
CREATE INDEX customer_materials_owner_idx ON customer_materials(uid, created_at DESC);

CREATE TABLE creative_sessions (
 id serial PRIMARY KEY, user_id integer NOT NULL,
 customer_id integer REFERENCES customers(id) ON DELETE SET NULL, content_type text, target_users text, differentiator text,
 title text, status text DEFAULT 'draft', step integer DEFAULT 1,
 topic_direction text, topic_direction_raw text, topics jsonb, topic text,
 opening text, opening_choice text, framework jsonb,
 final_content text, refine_history jsonb DEFAULT '[]',
 created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE INDEX creative_sessions_owner_idx ON creative_sessions(user_id, updated_at DESC);
-- Matches the corrected customer API's integer identifiers and ownership validation.

CREATE TABLE onboarding_tasks (
 id serial PRIMARY KEY, task_key text NOT NULL UNIQUE, title text, description text,
 step_order integer NOT NULL, reward_power integer DEFAULT 0,
 reward_valid_days integer DEFAULT 7, is_active boolean DEFAULT true
);
CREATE TABLE user_onboarding_progress (
 id serial PRIMARY KEY, user_id integer NOT NULL, task_key text NOT NULL REFERENCES onboarding_tasks(task_key),
 status text DEFAULT 'pending', completed_at timestamptz, claimed_at timestamptz,
 created_at timestamptz DEFAULT now(), UNIQUE(user_id, task_key)
);
CREATE TABLE invite_records (
 id serial PRIMARY KEY, inviter_id integer NOT NULL REFERENCES users(id),
 invitee_id integer NOT NULL UNIQUE REFERENCES users(id), invite_code text,
 reward_power integer DEFAULT 2000, reward_status text DEFAULT 'pending',
 created_at timestamptz DEFAULT now()
);
CREATE INDEX invite_records_inviter_idx ON invite_records(inviter_id, reward_status);
CREATE TABLE user_generation_stats (
 id serial PRIMARY KEY, user_id integer NOT NULL UNIQUE,
 total_materials integer DEFAULT 0, total_rewrites integer DEFAULT 0,
 total_scripts integer DEFAULT 0, last_generated_at timestamptz,
 created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE TABLE success_cases (
 id serial PRIMARY KEY, user_nickname text, user_avatar text, platform text,
 case_type text, case_data jsonb, used_feature text, testimonial text, is_displayed boolean DEFAULT false,
 sort_order integer DEFAULT 0, created_at timestamptz DEFAULT now()
);
-- success_cases payload is unconstrained and has no checked-in business seed.
CREATE TABLE user_feedback (
 id serial PRIMARY KEY, user_id integer NOT NULL REFERENCES users(id),
 type text NOT NULL, title text, content text NOT NULL,
 contact text, screenshots text[], status text DEFAULT 'pending',
 admin_reply text, replied_by integer REFERENCES users(id), replied_at timestamptz,
 created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE INDEX user_feedback_owner_idx ON user_feedback(user_id, created_at DESC);

CREATE TABLE agent_api_keys (
 id serial PRIMARY KEY, user_id integer, name text, api_key text UNIQUE,
 key_hash text UNIQUE, secret_key text, status text DEFAULT 'active', rate_limit integer DEFAULT 100,
 created_by integer, expires_at timestamptz, last_used_at timestamptz,
 created_at timestamptz DEFAULT now()
);
CREATE TABLE agent_users (
 id serial PRIMARY KEY, agent_type text NOT NULL, agent_user_id text NOT NULL,
 system_user_id integer NOT NULL REFERENCES users(id), nickname text, avatar_url text,
 last_active_at timestamptz, created_at timestamptz DEFAULT now(), UNIQUE(agent_type,agent_user_id)
);
CREATE TABLE agent_call_logs (
 id serial PRIMARY KEY, agent_user_id integer, api_key_id integer,
 endpoint text, action text, power_consumed integer DEFAULT 0,
 success boolean, error_message text, request_params jsonb, response_time_ms integer,
 created_at timestamptz DEFAULT now()
);
CREATE INDEX agent_call_logs_key_time_idx ON agent_call_logs(api_key_id, created_at DESC);
CREATE INDEX agent_call_logs_user_idx ON agent_call_logs(agent_user_id);

-- Seed only task keys/rewards explicitly documented and used by current routes.
INSERT INTO onboarding_tasks(task_key,title,step_order,reward_power,reward_valid_days) VALUES
 ('extract_script','Extract script',1,0,7),
 ('generate_rewrite','Generate rewrite',2,0,7),
 ('save_material','Save material',3,1000,7);

-- RPCs run with caller privileges. Only service_role receives EXECUTE below.
CREATE FUNCTION increment_used_power(user_id integer, increment_amount integer)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public AS $$
BEGIN
 IF increment_amount < 0 THEN RAISE EXCEPTION 'increment_amount must be nonnegative'; END IF;
 UPDATE public.users SET used_power = COALESCE(used_power,0) + increment_amount, updated_at = now() WHERE id = user_id;
END $$;
CREATE FUNCTION increment_pattern_success(pattern_id bigint)
RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path = pg_catalog, public AS $$
 UPDATE public.hit_patterns SET success_count = COALESCE(success_count,0)+1,
 updated_at=now() WHERE id=pattern_id;
$$;
CREATE FUNCTION get_operation_log_action_stats()
RETURNS TABLE(action_type text, count bigint)
LANGUAGE sql SECURITY INVOKER SET search_path = pg_catalog, public AS $$
 SELECT l.action_type, count(*) FROM public.operation_logs l GROUP BY l.action_type;
$$;
CREATE FUNCTION get_database_size()
RETURNS bigint LANGUAGE sql SECURITY INVOKER SET search_path = pg_catalog, public AS $$
 SELECT pg_database_size(current_database());
$$;
CREATE FUNCTION get_table_sizes()
RETURNS TABLE(table_name text,size_bytes bigint)
LANGUAGE sql SECURITY INVOKER SET search_path = pg_catalog, public AS $$
 SELECT c.relname::text, pg_total_relation_size(c.oid)
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relkind IN ('r','p');
$$;
-- No exec_sql RPC: DDL must never be exposed through the application's API key.
-- Included by initialize-empty-test-database.sql; do not run separately.
-- Custom sessions are verified in Next.js, not Supabase Auth. No auth.uid policies.
DO $$ DECLARE item record; BEGIN
 FOR item IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relkind IN ('r','p') LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',item.relname);
  EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated',item.relname);
  EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO service_role',item.relname);
 END LOOP;
END $$;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC, anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_used_power(integer,integer),
 public.increment_pattern_success(bigint), public.get_operation_log_action_stats(),
 public.get_database_size(), public.get_table_sizes(),
 public.cleanup_expired_creative_records() TO service_role;
GRANT USAGE ON SCHEMA public TO service_role;
REVOKE CREATE ON SCHEMA public FROM PUBLIC, anon, authenticated, service_role;
-- These defaults apply to the role executing this file. Future migrations run by
-- another owner MUST reapply the same rules under that owner.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
