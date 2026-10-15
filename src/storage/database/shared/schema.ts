import { pgTable, varchar, numeric, integer, timestamp, index, serial, text, unique, boolean, bigint } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

// ============================================================
// 注意：agent_accounts 表不由 Drizzle ORM 管理
// 该表在代码中通过原始 SQL 字符串 'agent_accounts' 使用
// 表结构由生产数据库直接管理，避免部署时的 NULL 值冲突
// ============================================================

export const agentEarnings = pgTable("agent_earnings", {
	id: serial().primaryKey().notNull(),
	agentUid: varchar("agent_uid", { length: 36 }).notNull(),
	userId: integer("user_id").notNull(),
	userName: varchar("user_name", { length: 100 }),
	amount: numeric({ precision: 10, scale:  2 }).default('0').notNull(),
	commission: numeric({ precision: 10, scale:  2 }).default('0').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("agent_earnings_agent_uid_idx").using("btree", table.agentUid.asc().nullsLast().op("text_ops")),
	index("agent_earnings_user_id_idx").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
]);

export const agentInvitations = pgTable("agent_invitations", {
	id: serial().primaryKey().notNull(),
	agentUid: varchar("agent_uid", { length: 36 }).notNull(),
	inviteeId: integer("invitee_id").notNull(),
	inviteeName: varchar("invitee_name", { length: 100 }),
	inviteePhone: varchar("invitee_phone", { length: 20 }),
	status: varchar({ length: 20 }).default('active').notNull(),
	totalSpent: numeric("total_spent", { precision: 10, scale:  2 }).default('0').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("agent_invitations_agent_uid_idx").using("btree", table.agentUid.asc().nullsLast().op("text_ops")),
	index("agent_invitations_invitee_id_idx").using("btree", table.inviteeId.asc().nullsLast().op("int4_ops")),
]);

export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const customers = pgTable("customers", {
	id: serial().primaryKey().notNull(),
	uid: varchar({ length: 36 }).notNull(),
	name: varchar({ length: 200 }).notNull(),
	description: text().notNull(),
	personaProfile: text("persona_profile"),
	accountPlan: text("account_plan"),
	ipPositioning: text("ip_positioning"),
	businessAnalysis: text("business_analysis"),
	businessFormData: text("business_form_data"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("customers_uid_idx").using("btree", table.uid.asc().nullsLast().op("text_ops")),
]);

export const sessions = pgTable("sessions", {
	token: varchar({ length: 255 }).primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("sessions_user_id_idx").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
]);

export const users = pgTable("users", {
	id: serial().primaryKey().notNull(),
	uid: varchar({ length: 36 }).notNull(),
	username: varchar({ length: 100 }).notNull(),
	password: varchar({ length: 255 }).notNull(),
	role: varchar({ length: 20 }).default('user').notNull(),
	memberType: varchar("member_type", { length: 20 }).default('none').notNull(),
	phone: varchar({ length: 20 }),
	maxCustomers: integer("max_customers").default(3).notNull(),
	maxDevices: integer("max_devices").default(1).notNull(),
	powerQuota: integer("power_quota").default(0).notNull(),
	memberExpiry: timestamp("member_expiry", { withTimezone: true, mode: 'string' }),
	usedPower: integer("used_power").default(0).notNull(),
	inviterId: integer("inviter_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	lastLoginAt: timestamp("last_login_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("users_inviter_id_idx").using("btree", table.inviterId.asc().nullsLast().op("int4_ops")),
	index("users_uid_idx").using("btree", table.uid.asc().nullsLast().op("text_ops")),
	index("users_username_idx").using("btree", table.username.asc().nullsLast().op("text_ops")),
	unique("users_uid_unique").on(table.uid),
	unique("users_username_unique").on(table.username),
]);

export const materials = pgTable("materials", {
	id: serial().primaryKey().notNull(),
	uid: varchar({ length: 36 }).notNull(),
	customerId: integer("customer_id").notNull(),
	topic: varchar({ length: 500 }).notNull(),
	title: varchar({ length: 500 }),
	scriptType: varchar("script_type", { length: 100 }).notNull(),
	shootingMethod: varchar("shooting_method", { length: 100 }),
	status: varchar({ length: 50 }).default('draft').notNull(),
	isDeleted: boolean("is_deleted").default(false).notNull(),
	customerName: varchar("customer_name", { length: 200 }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	content: text(),
	materialType: varchar("material_type", { length: 20 }),
	archiveType: varchar("archive_type", { length: 20 }).default('customer'),
	productId: integer("product_id"),
	productName: varchar("product_name", { length: 200 }),
	sourceType: varchar("source_type", { length: 20 }),
	// 爆款分析相关字段 - 使用 bigint 类型匹配数据库
	viewCount: bigint("view_count", { mode: 'number' }),
	likeCount: bigint("like_count", { mode: 'number' }),
	commentCount: bigint("comment_count", { mode: 'number' }),
	shareCount: bigint("share_count", { mode: 'number' }),
	collectCount: bigint("collect_count", { mode: 'number' }),
	finishRate: numeric("finish_rate", { precision: 5, scale: 2 }),
	publishPlatform: text("publish_platform"),
	publishUrl: text("publish_url"),
	publishedAt: timestamp("published_at", { withTimezone: true, mode: 'string' }),
	isHit: boolean("is_hit"),
	hitFactors: text("hit_factors"),  // 数据库中使用 text 存储 JSON
	openingType: text("opening_type"),
}, (table) => [
	index("materials_customer_id_idx").using("btree", table.customerId.asc().nullsLast().op("int4_ops")),
	index("materials_uid_idx").using("btree", table.uid.asc().nullsLast().op("text_ops")),
	index("materials_product_id_idx").using("btree", table.productId.asc().nullsLast().op("int4_ops")),
	index("materials_archive_type_idx").using("btree", table.archiveType.asc().nullsLast().op("text_ops")),
]);

export const loginRecords = pgTable("login_records", {
	id: varchar({ length: 100 }).primaryKey().notNull(),
	uid: varchar({ length: 50 }).notNull(),
	device: varchar({ length: 255 }).notNull(),
	os: varchar({ length: 100 }),
	browser: varchar({ length: 100 }),
	location: varchar({ length: 255 }),
	ip: varchar({ length: 50 }),
	status: varchar({ length: 20 }).default('success'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_login_records_created_at").using("btree", table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	index("idx_login_records_uid").using("btree", table.uid.asc().nullsLast().op("text_ops")),
]);

export const redemptionCodes = pgTable("redemption_codes", {
	id: serial().primaryKey().notNull(),
	code: varchar({ length: 20 }).notNull(),
	createdBy: varchar("created_by", { length: 50 }).notNull(),
	createdByUsername: varchar("created_by_username", { length: 100 }),
	type: varchar({ length: 20 }).default('trial'),
	rewardType: varchar("reward_type", { length: 20 }).default('membership'),
	rewardDays: integer("reward_days").default(1),
	rewardPower: integer("reward_power").default(1000),
	maxUses: integer("max_uses").default(1),
	usedCount: integer("used_count").default(0),
	usedBy: integer("used_by").array(),
	status: varchar({ length: 20 }).default('active'),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	unique("redemption_codes_code_key").on(table.code),
]);

export const devices = pgTable("devices", {
	id: varchar({ length: 50 }).primaryKey().notNull(),
	uid: varchar({ length: 50 }).notNull(),
	name: varchar({ length: 100 }),
	type: varchar({ length: 50 }),
	os: varchar({ length: 50 }),
	browser: varchar({ length: 50 }),
	location: varchar({ length: 100 }),
	ip: varchar({ length: 50 }),
	lastActive: timestamp("last_active", { withTimezone: true, mode: 'string' }).defaultNow(),
	current: boolean().default(false),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_devices_uid").using("btree", table.uid.asc().nullsLast().op("text_ops")),
]);

// 视频分析历史记录表
export const videoAnalysisHistory = pgTable("video_analysis_history", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	
	// 视频基础信息
	videoUrl: varchar("video_url", { length: 1000 }).notNull(),
	videoTitle: varchar("video_title", { length: 500 }),
	videoCover: varchar("video_cover", { length: 1000 }),
	platform: varchar({ length: 50 }).notNull(),
	platformName: varchar("platform_name", { length: 50 }),
	
	// 作者信息
	author: varchar({ length: 200 }),
	authorId: varchar("author_id", { length: 100 }),
	authorAvatar: varchar("author_avatar", { length: 500 }),
	
	// 互动数据
	likes: integer().default(0),
	comments: integer().default(0),
	shares: integer().default(0),
	collects: integer().default(0),
	views: integer().default(0),
	
	// 口播文案
	scriptContent: text("script_content"),
	
	// 分析报告（完整JSON）
	analysisReport: text("analysis_report"),
	
	// 综合评分（方便排序和展示）
	totalScore: numeric("total_score", { precision: 3, scale: 1 }),
	
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	
	// 分析状态相关字段
	status: varchar({ length: 50 }),
	progress: integer().default(0),
	progressMessage: text("progress_message"),
	errorMessage: text("error_message"),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("video_analysis_history_user_id_idx").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
	index("video_analysis_history_created_at_idx").using("btree", table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
]);
