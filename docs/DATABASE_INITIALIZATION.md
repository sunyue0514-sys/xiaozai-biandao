# 新建空测试库初始化

此方案只适用于**新建、可丢弃的测试数据库**。它不是旧生产库升级迁移，不导入原项目数据，不创建真实账号，不连接线上平台。不要在旧库运行，不要先删除旧库对象来通过空库检查。

## 已确定的根因与边界

`src/storage/database/shared/schema.ts` / Drizzle 首次迁移只定义 11 张表，应用的静态 Supabase `.from()` 调用涉及 43 张表。零散历史 SQL 还定义 AI 质量统计表及记忆系统表，不能只运行 Drizzle 后宣称安装完成。历史迁移有对尚不存在表的 ALTER、对尚不存在字段的 UPDATE、前端角色授予以及不完整建表顺序。

`sql/initialize-empty-test-database.sql` 是可直接审查的完整事务：47 张表、源码确认的字段、主键、必要 upsert 唯一约束、PostgREST 外键关系、索引和 5 个当前应用调用的固定 RPC。它同时保留历史创作记录清理函数及灵感 updated_at 触发器。开头检查 public 中的表、视图、序列和非扩展函数为空，并检查 Supabase API 角色存在；任何错误使本次事务失败。第二次运行会明确拒绝。

此数据库继续使用 Next.js 自定义 `users` / `sessions`。浏览器只调用应用 API；服务端验证 session、角色与对象所有权后，用 **server-only service role key** 访问数据库。自定义 session 不能映射成 Supabase `auth.uid()`。所有业务表启用 RLS 且无前端策略，撤销 PUBLIC / anon / authenticated 对表、序列、函数的访问。service_role 必须有 BYPASSRLS，只获 DML、序列读取使用和指定函数执行权限，无 public CREATE。RLS 无法防止 service role 代码中的所有权校验遗漏，因此仍需应用侧测试。

## 执行步骤（本地或明确独立的测试项目）

1. 创建独立空测试数据库。初始化执行者应是具有建表、授权权限的数据库所有者；**不要通过应用 service key 执行初始化**。在普通本地 PostgreSQL 中，测试管理员先创建 `anon`、`authenticated`、带 BYPASSRLS 的 `service_role`；Supabase 自带这些角色。
2. 用数据库管理工具执行 `sql/initialize-empty-test-database.sql`，并启用遇错立即停止。使用 psql 时，可在本地测试连接配置完成后执行 `psql -X -v ON_ERROR_STOP=1 -f sql/initialize-empty-test-database.sql`。连接目标由操作者明确选定，脚本不读取 `.env`，不自动选择任何远程地址。
3. 用同一独立库执行 `tests/database-integration.sql`。该文件使用合成测试数据，结束 ROLLBACK；验证 service role 真实写入、固定 RPC、唯一键 upsert、RLS/权限和前端拒绝。数据库用户须能 SET ROLE 才能完整跑此测试。
4. 服务端私有环境配置对应测试库 URL 和 service role key，重启应用。运行应用登录、客户、素材和创作会话流程，确认跨用户访问拒绝。管理员通过已审查的 `scripts/bootstrap-admin.ts` 单独创建；此 SQL 不包含内置密码或超级管理员身份。

不要叠加运行旧 migrations 或 `drizzle-kit push`：11 表 Drizzle 模型不是整库权威定义。以后新增迁移需按实际创建者重新审查权限；本文件的 ALTER DEFAULT PRIVILEGES 只对执行者生效，未来新表也必须启用 RLS 并授予服务端所需权限。

## 可复现的离线验证

从项目根目录执行：

```sh
node scripts/build-empty-database.cjs
node --test tests/database-contract.test.cjs
node scripts/test-empty-database.cjs
```

构建器从已审查的历史 schema 片段和 `sql/empty-database-additions.sql` / `sql/empty-database-security.sql` 生成完整文件；两个片段不要单独运行。构建器舍弃空库不需要的数据修复 UPDATE、编码损坏的业务种子、不适用的记忆视图/触发器；没有运行任何应用运行时 DDL。

`scripts/database-inventory.cjs` 使用 TypeScript AST 输出**名称、字段、来源路径**，不输出源码值或环境配置。静态测试覆盖字面量 `.from()`、过滤/排序/select 基础字段、对象/数组写入、函数内变量 payload 组装及字段赋值；它不是完整 SQL 解析器，也不证明动态 spread、动态表名、嵌套关系查询或运行时业务语义正确。

PGlite 脚本使用真实 PostgreSQL 引擎创建**内存库**，不联网，不读取凭据，可传入已有包入口，例如 `node scripts/test-empty-database.cjs /path/to/pglite/dist/index.js`。它验证完整 SQL 语法、实际列覆盖、服务端与前端权限、序列插入、upsert、RPC 和重复初始化防护。缺少包时明确失败；不能用 SQLite 或静态检查代替 PostgreSQL 运行结论。

## 尚需独立确认的业务事项

- 创作会话 customer_id 已选定 integer 外键，对齐修复后的客户 API；旧库 UUID 数据未迁移。
- `users.member_expire_at` 是注册路径使用的旧拼写，与 `member_expiry` 并存；没有猜测自动同步。`users.agent_level` 与 `agent_accounts.agent_level` 也没有猜测同步关系。
- `agent_accounts.user_id` 可空，因为既有按 uid upsert 路径确实未提供 user_id；有 user_id 的新建路径保留唯一外键。旧生产库约束差异需另行核实。
- 普通素材允许 customer_id=0，符合现有 general/product 归档代码，因此没有强行添加客户外键。`customer_materials` 是另一条代理 API 使用的独立表，拥有独立 ID 序列；没有猜测与 materials 同步。
- 只初始化源码明确使用的三个新人 task key；总奖励 1000 / 有效期 7 天来自项目说明与领取接口。任务展示文案为测试用英文；真实业务文案须另行确认。成功案例、套餐、系统爆款模板保持空，不编造营销数据。
- `content_performance` 保留 AI 接口显式写入的 is_hit / hit_score，不安装历史按阈值覆写该分类的触发器。旧记忆 SQL 中引用缺失字段的视图未被当前应用调用，因此未公开该视图。
- 不提供任意 `exec_sql` RPC，不进行运行时建表或序列修复。已有充值、兑换、新人奖励和代理积分流程的跨请求原子性仍须由应用/业务专门修复，本初始化只提供源码确实调用的原子计数 RPC，不能宣称解决所有财务竞争条件。
- 本机初始检查未找到 psql / postgres / Docker，PGlite 也未预装；有可用独立 PostgreSQL 工具后必须记录实际执行结果。静态通过不等于部署验证通过。

## 当前后端配置与管理员

数据库客户端已支持私有 SUPABASE_URL 和 SUPABASE_SECRET_KEY，不依赖 Python/Coze 工作负载注入。ADMIN_USERNAME 默认为 admin，ADMIN_PASSWORD 可留空；准备好独立测试库后运行 `pnpm bootstrap-admin`，首次生成密码只显示一次，已存在管理员不会重置。

本次统一测试69项通过，包含静态数据库契约检查。真实PostgreSQL/PGlite执行仍因缺少引擎而未验证通过，请勿据此直接运行于生产环境。
