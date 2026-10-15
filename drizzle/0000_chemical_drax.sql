CREATE TABLE "agent_earnings" (
	"id" serial PRIMARY KEY NOT NULL,
	"agent_uid" varchar(36) NOT NULL,
	"user_id" integer NOT NULL,
	"user_name" varchar(100),
	"amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"commission" numeric(10, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE "health_check" (
	"id" serial NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE "sessions" (
	"token" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
CREATE INDEX "agent_earnings_agent_uid_idx" ON "agent_earnings" USING btree ("agent_uid" text_ops);--> statement-breakpoint
CREATE INDEX "agent_earnings_user_id_idx" ON "agent_earnings" USING btree ("user_id" int4_ops);--> statement-breakpoint
CREATE INDEX "agent_invitations_agent_uid_idx" ON "agent_invitations" USING btree ("agent_uid" text_ops);--> statement-breakpoint
CREATE INDEX "agent_invitations_invitee_id_idx" ON "agent_invitations" USING btree ("invitee_id" int4_ops);--> statement-breakpoint
CREATE INDEX "customers_uid_idx" ON "customers" USING btree ("uid" text_ops);--> statement-breakpoint
CREATE INDEX "idx_devices_uid" ON "devices" USING btree ("uid" text_ops);--> statement-breakpoint
CREATE INDEX "idx_login_records_created_at" ON "login_records" USING btree ("created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_login_records_uid" ON "login_records" USING btree ("uid" text_ops);--> statement-breakpoint
CREATE INDEX "materials_customer_id_idx" ON "materials" USING btree ("customer_id" int4_ops);--> statement-breakpoint
CREATE INDEX "materials_uid_idx" ON "materials" USING btree ("uid" text_ops);--> statement-breakpoint
CREATE INDEX "materials_product_id_idx" ON "materials" USING btree ("product_id" int4_ops);--> statement-breakpoint
CREATE INDEX "materials_archive_type_idx" ON "materials" USING btree ("archive_type" text_ops);--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id" int4_ops);--> statement-breakpoint
CREATE INDEX "users_inviter_id_idx" ON "users" USING btree ("inviter_id" int4_ops);--> statement-breakpoint
CREATE INDEX "users_uid_idx" ON "users" USING btree ("uid" text_ops);--> statement-breakpoint
CREATE INDEX "users_username_idx" ON "users" USING btree ("username" text_ops);--> statement-breakpoint
CREATE INDEX "video_analysis_history_user_id_idx" ON "video_analysis_history" USING btree ("user_id" int4_ops);--> statement-breakpoint
CREATE INDEX "video_analysis_history_created_at_idx" ON "video_analysis_history" USING btree ("created_at" timestamptz_ops);