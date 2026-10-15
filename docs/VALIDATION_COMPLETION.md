> 历史检查记录。当前状态请看 [PREPUBLICATION_STATUS.md](PREPUBLICATION_STATUS.md)，不应以本文旧统计作为本版验收。

# 构建与联调验证进展（2026-10-14）

## 已完成

- npm run build:windows：真实退出码0。Next.js 16.1.1 / Node.js 24.18.0，编译、TypeScript、94项静态输出、页面优化和build traces均完成，生成生产BUILD_ID。
- npm test：88项通过。
- 最近完整ESLint：0错误、888条历史警告；新构建脚本/配置/测试定点lint也无错误。
- npm run verify:runtime：真实加载SDK/tsx/NextRequest，8条匿名接口直接调用均401，断言通过。没有HTTP请求、外部AI请求、SDK替身或成功生成结论。
- 已确认旧敏感值的源码扫描继续未检出；交付ZIP不含依赖、构建缓存或私有配置。

## 为什么构建之前失败

当前Windows受限会话的目录并发创建可复现EPERM。同一工作目录下，200项并发递归mkdir失败，200项顺序mkdir全部成功。Webpack调用栈证实失败来自输出目录mkdir；静态生成也出现相同问题。

兼容模式通过scripts/build-windows.cjs启用：只在构建输出范围串行化callback与Promise mkdir；仅已存在目录的EPERM碰撞可以视为已存在。不存在路径、EACCES、文件目标、输出范围外错误仍保留。Next仅在该命令中使用单worker与单页面并发；未改ACL、未增加系统权限、未改变网络名单。8项专门测试覆盖这些边界。

构建继续后发现真正代码问题：api/agent/commission路由导出commissionRecords不是Next允许的route导出。该数组现在仅内部使用，鉴权拒绝后的数据未修改，通过公开GET行为回归确认。旧内存佣金路径仍不具备数据库持久化/多副本一致性保证，不把构建成功视为生产财务验收。

真实原生接口检查另发现并修复：代理状态在鉴权前初始化数据库导致匿名抛错；搜索接口缺少鉴权可能使用服务器付费AI凭据。两者均先验证身份，再进入数据库/SDK逻辑，匿名返回401。

## 浏览器条件

当前会话网络允许名单没有localhost或127.0.0.1。此前真实Chrome/Playwright导航localhost返回ERR_NETWORK_ACCESS_DENIED。构建和服务器启动不等同于页面交互通过；没有绕过名单或将本机端口隧道到获准域名。

需要允许测试服务器的实际主机（localhost/127.0.0.1及端口），然后验证页面身份、非空内容、无框架覆盖层、控制台、截图与真实交互。可使用已安装的Playwright及本机Chrome；不用个人浏览器profile。

## 数据库条件

本机未找到可用PostgreSQL/psql/Docker/PGlite；pg只是驱动。离线npm/pnpm缓存没有可恢复的PGlite。db:test明确因缺@electric-sql/pglite退出1，静态SQL契约3项通过不能代替执行。
连接工具能列出Supabase账号的4个项目，但均INACTIVE；没有选择或擅自恢复旧项目，未修改数据库。完整HTTP联调需要指定独立测试项目、完成空测试库初始化、配置私有SUPABASE_URL及SUPABASE_SECRET_KEY，并允许应用访问该项目域名。

仅验证SQL/RLS/RPC时，可在允许npm仓库访问的测试环境安装独立工具依赖：

```powershell
npm install --prefix ../db-test-tools --no-save --ignore-scripts --registry=https://registry.npmjs.org @electric-sql/pglite
node scripts/test-empty-database.cjs ../db-test-tools/node_modules/@electric-sql/pglite/dist/index.js
```

脚本使用内存空库，不连接旧库。当前会话没有放行registry.npmjs.org，因此没有运行下载。PGlite执行通过仍不等于Supabase PostgREST或完整注册/登录/改密/兑换流程通过。

## AI条件

真实已安装SDK为coze-coding-dev-sdk 0.7.17。三个私有变量均未配置：COZE_WORKLOAD_IDENTITY_API_KEY、COZE_INTEGRATION_MODEL_BASE_URL、COZE_INTEGRATION_BASE_URL；项目只有空.env.example。SDK构造器接受空配置，Config.validate则明确缺Key，因此构造成功不能视为可用。

已补齐.env.example和README。模型/集成网关没有默认地址，须使用服务提供方给出的合法地址和自己的私有凭据。应写入.env.local或部署平台的服务端环境变量，不贴进聊天、公开日志、仓库，也不使用原包已经暴露的旧Key。
需要允许实际网关域名；视频功能按启用情况还需api.tikhub.io、apis.uctb.cn及视频来源/CDN。当前应用网络名单没有这些服务，未发送生成、搜索或付费请求。

准备好独立测试数据库、测试用户会话和自己的AI私有配置后，才能验证生成、错误/超时、积分扣减、记录写入与视频解析等真实链路。剩余条件不能用mock通过、401检查或构建成功替代。

## 开源条件复查补丁

已修复重复入口/api/web-search的匿名付费SDK调用，新增匿名/过期会话及登录成功响应结构的回归检查。当前88项自动测试、8条原生匿名接口检查、完整类型与定点lint均通过。公开前处理项及真实业务测试优先级见OPEN_SOURCE_READINESS.md；这份说明不代表全部API已完成安全审计。
