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
