'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export default function PrivacyPolicyPage() {
  useEffect(() => {
    document.title = '隐私政策 - 短视频智能内容创作平台';
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="container max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/login">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-semibold">隐私政策</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container max-w-4xl mx-auto px-4 py-8">
        <article className="prose prose-slate dark:prose-invert max-w-none">
          <div className="bg-card rounded-xl p-8 border">
            <h1 className="text-2xl font-bold mb-2">隐私政策</h1>
            <p className="text-muted-foreground text-sm mb-6">
              更新日期：2024年1月1日 | 生效日期：2024年1月1日
            </p>

            <Separator className="my-6" />

            <div className="space-y-6 text-sm leading-relaxed">
              <section>
                <h2 className="text-lg font-semibold mb-3">引言</h2>
                <p className="text-muted-foreground">
                  本网页应用（以下简称&quot;我们&quot;）非常重视用户的隐私和个人信息保护。本隐私政策将向您说明我们如何收集、使用、存储、共享和保护您的个人信息，以及您享有的相关权利。
                </p>
                <p className="text-muted-foreground mt-3">
                  请您在使用本网页应用提供的服务前，仔细阅读并充分理解本隐私政策。如果您不同意本隐私政策的任何内容，请您立即停止使用我们的服务。
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold mb-3">一、我们收集的信息</h2>
                <p className="text-muted-foreground">
                  为了向您提供服务，我们会收集以下信息：
                </p>
                <p className="text-muted-foreground mt-3">
                  <strong>1. 账号注册信息</strong>
                </p>
                <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-1">
                  <li>用户名：用于账号登录和身份识别</li>
                  <li>密码：用于账号安全验证（加密存储）</li>
                  <li>注册时间：用于账号管理</li>
                </ul>
                <p className="text-muted-foreground mt-3">
                  <strong>2. 使用记录信息</strong>
                </p>
                <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-1">
                  <li>算力使用记录：包括消费金额、消费时间、消费类型</li>
                  <li>创作内容记录：您使用AI生成的脚本、文案等内容</li>
                  <li>客户管理数据：您创建的客户档案、IP定位信息等</li>
                </ul>
                <p className="text-muted-foreground mt-3">
                  <strong>3. 设备信息</strong>
                </p>
                <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-1">
                  <li>登录设备信息：设备型号、操作系统、浏览器类型</li>
                  <li>登录IP地址：用于安全验证和异常登录检测</li>
                  <li>登录时间：用于账号安全管理</li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg font-semibold mb-3">二、我们如何使用信息</h2>
                <p className="text-muted-foreground">
                  我们收集的信息将用于以下目的：
                </p>
                <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
                  <li>提供、维护和改进我们的服务</li>
                  <li>处理您的订单和算力充值请求</li>
                  <li>保存您的内容创作记录，方便您随时查看和管理</li>
                  <li>保障账号和系统安全，防范欺诈风险</li>
                  <li>向您发送服务相关通知（如系统更新、安全提醒）</li>
                  <li>遵守法律法规要求和政府机关的合法要求</li>
                  <li>经您同意的其他用途</li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg font-semibold mb-3">三、信息存储</h2>
                <p className="text-muted-foreground">
                  3.1 我们将您的个人信息存储在中华人民共和国境内的服务器上。
                </p>
                <p className="text-muted-foreground mt-3">
                  3.2 我们会采取合理的技术和管理措施保护您的个人信息，防止信息丢失、被不当使用或未经授权访问。
                </p>
                <p className="text-muted-foreground mt-3">
                  3.3 我们仅在法律法规规定的期限内或实现服务目的所需的期限内保留您的个人信息。
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold mb-3">四、信息共享、转让、公开披露</h2>
                <p className="text-muted-foreground">
                  4.1 除以下情形外，我们不会与任何第三方共享、转让、公开披露您的个人信息：
                </p>
                <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
                  <li>获得您明确同意后</li>
                  <li>根据法律法规规定或政府机关的合法要求</li>
                  <li>与授权合作伙伴共享：我们可能会与为我们提供服务的合作伙伴共享信息，这些合作伙伴包括云服务提供商、支付服务提供商等，他们需要访问您的信息才能为我们提供服务</li>
                  <li>保护我们或用户的权益、财产或安全</li>
                </ul>
                <p className="text-muted-foreground mt-3">
                  4.2 我们不会将您的个人信息出售给第三方。
                </p>
                <p className="text-muted-foreground mt-3">
                  4.3 我们不会公开披露您的个人信息，除非获得您的明确同意或法律法规另有规定。
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold mb-3">五、您的权利</h2>
                <p className="text-muted-foreground">
                  您对您的个人信息享有以下权利：
                </p>
                <p className="text-muted-foreground mt-3">
                  <strong>1. 访问权</strong>：您有权访问我们持有的您的个人信息。
                </p>
                <p className="text-muted-foreground mt-3">
                  <strong>2. 更正权</strong>：您有权要求我们更正不准确的个人信息。
                </p>
                <p className="text-muted-foreground mt-3">
                  <strong>3. 删除权</strong>：在特定情况下，您有权要求我们删除您的个人信息。
                </p>
                <p className="text-muted-foreground mt-3">
                  <strong>4. 撤回同意权</strong>：您有权撤回之前给予我们的同意。
                </p>
                <p className="text-muted-foreground mt-3">
                  <strong>5. 注销账号权</strong>：您有权注销您的账号。账号注销后，我们将停止为您提供服务，并根据法律法规要求删除或匿名化处理您的个人信息。
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold mb-3">六、未成年人保护</h2>
                <p className="text-muted-foreground">
                  6.1 我们的服务主要面向成年人。如果您是未成年人，请在监护人的陪同下阅读本政策，并在取得监护人对您使用我们的服务和同意后使用我们的服务。
                </p>
                <p className="text-muted-foreground mt-3">
                  6.2 如果您是未成年人的监护人，请您关注未成年人是否是在您的授权同意下使用我们的服务。
                </p>
                <p className="text-muted-foreground mt-3">
                  6.3 我们不会主动收集未成年人的个人信息。如果我们发现在未获得监护人同意的情况下收集了未成年人的个人信息，我们会尽快删除相关信息。
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold mb-3">七、Cookie和类似技术</h2>
                <p className="text-muted-foreground">
                  7.1 我们使用Cookie和类似技术来提供、保护和改进我们的服务。
                </p>
                <p className="text-muted-foreground mt-3">
                  7.2 Cookie是一种小型文本文件，存储在您的设备上，用于记住您的偏好设置和登录状态等。
                </p>
                <p className="text-muted-foreground mt-3">
                  7.3 您可以通过浏览器设置管理Cookie，但这可能影响您使用我们的服务。
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold mb-3">八、信息安全</h2>
                <p className="text-muted-foreground">
                  8.1 我们采用业界标准的安全措施保护您的个人信息，包括但不限于：
                </p>
                <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-1">
                  <li>数据加密传输（HTTPS）</li>
                  <li>密码加密存储</li>
                  <li>访问控制和安全审计</li>
                  <li>安全漏洞监测和修复</li>
                </ul>
                <p className="text-muted-foreground mt-3">
                  8.2 请您妥善保管账号密码，不要将账号密码告知他人。因您个人原因导致的账号泄露，我们不承担责任。
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold mb-3">九、隐私政策的更新</h2>
                <p className="text-muted-foreground">
                  9.1 我们可能会不时更新本隐私政策。更新后的政策将在本网页应用公布。
                </p>
                <p className="text-muted-foreground mt-3">
                  9.2 如果我们对本隐私政策进行重大变更，我们会通过应用内通知或其他方式告知您。
                </p>
                <p className="text-muted-foreground mt-3">
                  9.3 建议您定期查阅本隐私政策，了解我们如何保护您的信息。
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold mb-3">十、联系我们</h2>
                <p className="text-muted-foreground">
                  如果您对本隐私政策有任何疑问、意见或建议，可以通过以下方式联系我们：
                </p>
                <p className="text-muted-foreground mt-3">
                  本网页应用：<Link href="/" className="text-primary hover:underline">访问首页</Link>
                </p>
                <p className="text-muted-foreground mt-3">
                  我们将在收到您的反馈后尽快处理，并在法律法规规定的期限内回复。
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold mb-3">十一、适用范围</h2>
                <p className="text-muted-foreground">
                  本隐私政策适用于本网页应用提供的所有服务。本政策不适用于其他第三方的产品或服务，也不适用于本网页应用中链接到的第三方网站或服务。
                </p>
              </section>
            </div>
          </div>
        </article>
      </main>

      {/* Footer */}
      <footer className="border-t py-6 mt-8">
        <div className="container max-w-4xl mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2024 本网页应用 版权所有</p>
          <div className="flex justify-center gap-4 mt-2">
            <Link href="/legal/user-agreement" className="hover:text-primary">用户协议</Link>
            <Link href="/legal/privacy-policy" className="hover:text-primary">隐私政策</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
