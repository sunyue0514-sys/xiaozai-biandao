'use client';

import { useState, useEffect } from 'react';
import { Sparkles, X, Gift, Zap, Users, Target, Award, CreditCard, Clock, CheckCircle } from 'lucide-react';

// 更新公告版本号 - 每次更新时修改此值
const ANNOUNCEMENT_VERSION = '2.0-2026-05-15';

export const showUpdateAnnouncement = () => {
  window.dispatchEvent(new CustomEvent('show-update-announcement'));
};

export function UpdateAnnouncement() {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    const lastClosedVersion = localStorage.getItem('update-announcement-version');
    
    if (lastClosedVersion !== ANNOUNCEMENT_VERSION) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 500);
      return () => clearTimeout(timer);
    }
    
    const handleShow = () => {
      setIsVisible(true);
      setIsClosing(false);
    };
    window.addEventListener('show-update-announcement', handleShow);
    return () => window.removeEventListener('show-update-announcement', handleShow);
  }, []);

  const handleClose = () => {
    setIsClosing(true);
    localStorage.setItem('update-announcement-version', ANNOUNCEMENT_VERSION);
    setTimeout(() => {
      setIsVisible(false);
      setIsClosing(false);
    }, 300);
  };

  if (!isVisible) return null;

  return (
    <div className={`fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4 transition-all duration-300 ${isClosing ? 'opacity-0 scale-105' : 'opacity-100 scale-100'}`}>
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-border">
        {/* 头部 */}
        <div className="px-6 py-4 border-b border-border/50 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 via-orange-500 to-pink-500 flex items-center justify-center shadow-lg">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-lg">🎉 V2.0 重磅更新</h3>
                <p className="text-xs text-muted-foreground">算力系统上线，创作更自由</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-full bg-muted hover:bg-muted/80 transition-colors flex items-center justify-center"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">更新时间：2026 年 5 月 15 日</p>
        </div>
        
        {/* 内容 */}
        <div className="p-5 overflow-y-auto max-h-[calc(90vh-180px)] space-y-4">
          {/* 核心变化 */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border border-blue-200/50 dark:border-blue-800/30">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-blue-700 dark:text-blue-400">💡 核心变化：会员制度升级为算力系统</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              我们取消了原有的会员等级制度，全面升级为算力系统。现在您可以按需购买算力，用多少充多少，不再受会员期限限制！
            </p>
          </div>

          {/* 新功能上线 */}
          <div>
            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Gift className="w-4 h-4 text-green-600" />
              🆕 新功能上线
            </h4>
            <div className="space-y-2">
              {/* 1. 新用户福利 */}
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded">新用户福利</span>
                </div>
                <ul className="text-sm text-muted-foreground space-y-1 ml-1">
                  <li>• 注册即送 <strong className="text-foreground">3000 算力</strong>（1 天有效）</li>
                  <li>• 完成新手任务额外奖励 <strong className="text-foreground">1000 算力</strong>（7 天有效）</li>
                </ul>
              </div>

              {/* 2. 首充双倍 */}
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 px-2 py-0.5 rounded">首充双倍</span>
                </div>
                <ul className="text-sm text-muted-foreground space-y-1 ml-1">
                  <li>• 首次使用兑换码充值，自动获得双倍算力</li>
                  <li>• 例如：充值 10000 算力 → 实际到账 <strong className="text-foreground">20000 算力</strong></li>
                </ul>
              </div>

              {/* 3. IP36计 */}
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 px-2 py-0.5 rounded">IP36计文案创作</span>
                </div>
                <ul className="text-sm text-muted-foreground space-y-1 ml-1">
                  <li>• 全新升级「文案创作」功能</li>
                  <li>• <strong className="text-foreground">36 种专业创作策略</strong>，覆盖 6 大场景</li>
                  <li>• 结合您的 IP 定位，生成更贴合的文案</li>
                </ul>
              </div>

              {/* 4. 新手任务 */}
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded">新手任务引导</span>
                </div>
                <ul className="text-sm text-muted-foreground space-y-1 ml-1">
                  <li>• 3 步完成：提取爆款文案 → 生成仿写脚本 → 保存素材库</li>
                  <li>• 任务完成奖励 <strong className="text-foreground">1000 算力</strong></li>
                </ul>
              </div>

              {/* 5. 邀请奖励 */}
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400 px-2 py-0.5 rounded">邀请分享奖励</span>
                </div>
                <ul className="text-sm text-muted-foreground space-y-1 ml-1">
                  <li>• 分享专属邀请链接给好友</li>
                  <li>• 好友完成新手任务后，双方各得 <strong className="text-foreground">2000 算力</strong></li>
                  <li>• 每人最多邀请 <strong className="text-foreground">10 人</strong> 获得奖励</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 会员补偿 */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 border border-amber-200/50 dark:border-amber-800/30">
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-5 h-5 text-amber-600" />
              <span className="font-semibold text-amber-700 dark:text-amber-400">🎁 会员用户补偿</span>
            </div>
            <p className="text-sm text-muted-foreground mb-2">为感谢老用户支持，取消会员制度后，现有未到期会员将获得算力补偿：</p>
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-1">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>月度会员：<strong className="text-foreground">20000 算力</strong>（365天）</span>
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>年度会员：<strong className="text-foreground">100000 算力</strong>（365天）</span>
              </div>
            </div>
          </div>

          {/* 算力包说明 */}
          <div>
            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-blue-600" />
              📊 算力包说明
            </h4>
            <div className="grid grid-cols-4 gap-2 text-center text-sm">
              <div className="p-2 rounded-lg bg-muted border border-border">
                <div className="font-semibold text-foreground">1万算力</div>
                <div className="text-muted-foreground">¥28.9</div>
                <div className="text-xs text-muted-foreground">365天</div>
              </div>
              <div className="p-2 rounded-lg bg-muted border border-border">
                <div className="font-semibold text-foreground">5万算力</div>
                <div className="text-muted-foreground">¥99.9</div>
                <div className="text-xs text-muted-foreground">365天</div>
              </div>
              <div className="p-2 rounded-lg bg-muted border border-border">
                <div className="font-semibold text-foreground">10万算力</div>
                <div className="text-muted-foreground">¥199</div>
                <div className="text-xs text-muted-foreground">365天</div>
              </div>
              <div className="p-2 rounded-lg bg-muted border border-border">
                <div className="font-semibold text-foreground">40万算力</div>
                <div className="text-muted-foreground">¥699</div>
                <div className="text-xs text-muted-foreground">365天</div>
              </div>
            </div>
          </div>

          {/* 有效期说明 */}
          <div className="p-3 rounded-lg bg-muted/30 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium text-sm">⚠️ 算力有效期说明</span>
            </div>
            <ul className="text-xs text-muted-foreground space-y-1 ml-1">
              <li>• 赠送算力有效期：注册赠送 <strong>1天</strong>，邀请奖励 <strong>7天</strong>，任务奖励 <strong>7天</strong></li>
              <li>• 充值算力有效期：<strong>365天</strong></li>
              <li>• 过期后算力不清零，充值后可继续使用原有余额</li>
            </ul>
          </div>
        </div>
        
        {/* 底部 */}
        <div className="px-6 py-3 border-t border-border bg-muted/30">
          <button
            onClick={handleClose}
            className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-lg font-medium transition-all shadow-sm"
          >
            我知道了
          </button>
          <p className="text-center text-xs text-muted-foreground mt-2">
            超级编导团队让每个创作者都能用 AI 量产爆款内容
          </p>
        </div>
      </div>
    </div>
  );
}
