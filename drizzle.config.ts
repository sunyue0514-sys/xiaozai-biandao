import type { Config } from 'drizzle-kit';

// Drizzle 配置
// 重要：agent_accounts 不在 tablesFilter 中，由 SQL 迁移单独管理
// 这样可以避免部署系统尝试修改该表导致的 NULL 值冲突
export default {
  schema: './src/storage/database/shared/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.PGDATABASE_URL!,
  },
  tablesFilter: [
    // agent_accounts - 由 SQL 迁移管理，不通过 Drizzle 同步
    'agent_earnings', 
    'agent_invitations',
    'health_check',
    'customers',
    'sessions',
    'users',
    'materials',
    'login_records',
    'redemption_codes',
    'devices',
    'video_analysis_history',
  ],
} satisfies Config;
