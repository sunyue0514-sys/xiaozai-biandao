'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export default function UserAgreementPage() {
  useEffect(() => {
    document.title = '用户协议 - 短视频智能内容创作平台';
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
            <FileText className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-semibold">用户协议</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container max-w-4xl mx-auto px-4 py-8">
        <article className="prose prose-slate dark:prose-invert max-w-none">
          <div className="bg-card rounded-xl p-8 border">
            <h1 className="text-2xl font-bold mb-2">用户服务协议</h1>
            <p className="text-muted-foreground text-sm mb-6">
              更新日期：2024年1月1日 | 生效日期：2024年1月1日
            </p>

            <Separator className="my-6" />

            <div className="space-y-6 text-sm leading-relaxed">
              <section>
                <h2 className="text-lg font-semibold mb-3">一、总则</h2>
                <p className="text-muted-foreground">
                  欢迎您使用本网页应用。为使用本网页应用服务（以下简称&quot;本服务&quot;），您应当阅读并遵守《用户服务协议》（以下简称&quot;本协议&quot;）。请您务必审慎阅读、充分理解各条款内容，特别是免除或限制责任的相应条款。
                </p>
                <p className="text-muted-foreground mt-3">
                  除非您已阅读并接受本协议所有条款，否则您无权使用本服务。您的使用行为将被视为对本协议的全部接受，即表示您已阅读并同意接受本协议各项条款的约束。如果您不同意本协议的任何内容，您应立即停止使用本服务。
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold mb-3">二、服务内容</h2>
                <p className="text-muted-foreground">
                  2.1 本网页应用为用户提供智能内容创作服务，包括但不限于AI脚本创作、选题策划、文案生成、运营分析、客户管理等功能。
                </p>
                <p className="text-muted-foreground mt-3">
                  2.2 本服务采用算力积分制，用户需要充值获取算力后方可使用相关功能。具体计费规则以平台公示为准。
                </p>
                <p className="text-muted-foreground mt-3">
                  2.3 我们保留随时修改、中断或终止部分或全部服务的权利，恕不另行通知。
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold mb-3">三、账号注册与使用</h2>
                <p className="text-muted-foreground">
                  3.1 用户在使用本服务前需要注册账号。注册时，您应提供真实、准确、完整的信息，并对所提供信息的真实性、准确性、完整性负责。
                </p>
                <p className="text-muted-foreground mt-3">
                  3.2 用户账号应自行维护账号及密码的安全，因用户保管不善可能导致的账号被盗、密码泄露等后果由用户自行承担。
                </p>
                <p className="text-muted-foreground mt-3">
                  3.3 用户不得将账号转让、出借给他人使用。因账号转让、出借所产生的一切后果，由用户自行承担。
                </p>
                <p className="text-muted-foreground mt-3">
                  3.4 若发现任何未经授权使用您账号的情况，请立即通知我们。
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold mb-3">四、用户行为规范</h2>
                <p className="text-muted-foreground">
                  4.1 您承诺在使用本服务时，不会从事以下行为：
                </p>
                <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
                  <li>发布、传输、传播任何违法违规内容，包括但不限于危害国家安全、泄露国家秘密、颠覆国家政权、破坏国家统一的内容</li>
                  <li>发布、传输、传播任何侮辱或者诽谤他人、侵害他人名誉权、隐私权等合法权益的内容</li>
                  <li>发布、传输、传播任何淫秽、色情、赌博、暴力、凶杀、恐怖或者教唆犯罪的内容</li>
                  <li>发布、传输、传播任何虚假信息、诈骗信息、垃圾信息</li>
                  <li>侵犯他人知识产权、商业秘密等合法权益</li>
                  <li>利用本服务进行任何危害计算机系统安全的行为</li>
                  <li>利用本服务进行任何商业推广、广告宣传等行为</li>
                  <li>违反任何法律法规、政策、行业规范的行为</li>
                </ul>
                <p className="text-muted-foreground mt-3">
                  4.2 您理解并同意，我们有权对您使用本服务生成的内容进行审核，对于违反上述规定的内容，我们有权采取删除、屏蔽、终止服务等措施。
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold mb-3">五、知识产权</h2>
                <p className="text-muted-foreground">
                  5.1 本网页应用的所有内容，包括但不限于软件、技术、程序、网页、文字、图片、图像、音频、视频、图表、版面设计、电子文档等，均受中华人民共和国著作权法、商标法、专利法、反不正当竞争法等法律法规及国际条约的保护。
                </p>
                <p className="text-muted-foreground mt-3">
                  5.2 未经我们书面许可，您不得以任何形式复制、传播、展示、修改、创作衍生作品或以其他方式使用上述内容。
                </p>
                <p className="text-muted-foreground mt-3">
                  5.3 用户使用本服务生成的内容，其知识产权归用户所有，但用户不得将生成内容用于违法违规用途。
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold mb-3">六、服务费用与退款</h2>
                <p className="text-muted-foreground">
                  6.1 本服务采用预付费模式，用户需先充值获取算力后使用相关功能。
                </p>
                <p className="text-muted-foreground mt-3">
                  6.2 算力一经充值使用，概不退款。如有特殊情况，请与客服联系处理。
                </p>
                <p className="text-muted-foreground mt-3">
                  6.3 我们有权根据运营成本等因素调整服务价格，调整后的价格将提前在平台公示。
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold mb-3">七、免责声明</h2>
                <p className="text-muted-foreground">
                  7.1 本服务由人工智能技术驱动，生成的内容仅供参考，不构成任何形式的建议或承诺。用户对使用生成内容所做出的决策及产生的后果自行负责。
                </p>
                <p className="text-muted-foreground mt-3">
                  7.2 因不可抗力、网络状况、通讯线路、系统维护、黑客攻击等任何原因导致的服务中断或无法正常使用，我们不承担责任。
                </p>
                <p className="text-muted-foreground mt-3">
                  7.3 用户因违反本协议或任何法律法规而导致的任何后果，由用户自行承担，我们不承担任何责任。
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold mb-3">八、协议修改</h2>
                <p className="text-muted-foreground">
                  8.1 我们有权随时修改本协议，修改后的协议将在本网页应用公布。您继续使用本服务即表示您已阅读并同意接受修改后的协议。
                </p>
                <p className="text-muted-foreground mt-3">
                  8.2 如您不同意修改后的协议，有权停止使用本服务。
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold mb-3">九、法律适用与争议解决</h2>
                <p className="text-muted-foreground">
                  9.1 本协议的订立、执行、解释及争议解决均适用中华人民共和国法律。
                </p>
                <p className="text-muted-foreground mt-3">
                  9.2 如双方就本协议内容或其执行发生任何争议，双方应尽力友好协商解决；协商不成时，任何一方均可向我们所在地有管辖权的人民法院提起诉讼。
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold mb-3">十、联系我们</h2>
                <p className="text-muted-foreground">
                  如您对本协议有任何疑问，可通过以下方式联系我们：
                </p>
                <p className="text-muted-foreground mt-3">
                  本网页应用：<Link href="/" className="text-primary hover:underline">访问首页</Link>
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
