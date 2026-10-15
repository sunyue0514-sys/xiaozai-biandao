# 依赖安全状态（2026-10-15）

当前实际安装和锁文件仍为 Next.js / eslint-config-next 16.1.1。没有把“修改版本号”当成实际升级，没有伪造新的 lockfile。

官方在 2026-10-14 发布的修复版本为 Next.js 16.4.1 / 15.5.28，涉及 Cache Components、图像优化和 Server Actions 的上游安全问题。应核对最新公告与 React 配套修复，再升级并完整回归。

来源：https://nextjs.org/blog/nextjs-security-update-october-14-2026

2026-09-30 公告另披露远程图片优化 SSRF；无 remotePatterns 配置不受该项影响。本准备版已清空远程图片白名单、设置 images.unoptimized，并移除原宽泛开发来源白名单。这些是降低暴露面的措施，不能替代框架及传递依赖升级，也不能推断其它漏洞已修复。

来源：https://nextjs.org/blog/september-2026-security-release

本机没有可用的新版 Next.js 离线包。直接调用 pnpm 不在 PATH；通过 Corepack 的审计尝试也未取得依赖审计结果（所需 pnpm 9.0.0 缓存不可用）。当前网络策略不允许 npm registry，未通过其它通道绕过。**全量生产/开发依赖漏洞清单、补丁安装和升级回归均未完成。**

在允许访问官方 npm registry 的干净环境中，需要：

1. 安装项目指定的 pnpm；核对当日官方修复版本及 React 版本要求。
2. 升级 Next.js 与 eslint-config-next 到相同的已修复版本，更新锁文件。
3. 对生产与开发依赖执行 pnpm audit，逐项核对并修复适用的高危/严重漏洞；不要忽略审计退出码。
4. 冻结锁文件重新安装，运行 test、ts-check、lint:build、build，并验证浏览器主要业务路径。
5. 按新安装内容重新生成 THIRD_PARTY_NOTICES.md，保留所有需要的许可证与声明。

已添加 GitHub Actions 检查文件，包含源码扫描、依赖审计、测试、类型、lint 和构建。尚未创建仓库、执行云端 CI 或发布；不能把工作流文件的存在当作 CI 已通过。

## 源码分发说明

该状态随源码公开披露，不代表已完成依赖升级，也不将项目描述为可直接安全部署的产品。使用者应先按 SELF_HOSTING.md 联网升级、审计和回归，再启动对外服务。
