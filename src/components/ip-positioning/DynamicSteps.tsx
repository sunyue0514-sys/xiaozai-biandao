'use client';

import dynamic from 'next/dynamic';
import { SkeletonWizardStep } from '@/components/ui/skeleton';

// 动态导入步骤组件，优化首屏加载
// AIReportsStep 是最重的组件，需要动态导入
export const AIReportsStepDynamic = dynamic(
  () => import('./steps/AIReportsStep').then((mod) => mod.AIReportsStep),
  {
    loading: () => <SkeletonWizardStep />,
    ssr: false, // AI 报告不需要 SSR
  }
);

// 其他步骤组件也可以动态导入（可选）
// 如果首屏性能仍然有问题，可以取消下面的注释

/*
export const BasicInfoStepDynamic = dynamic(
  () => import('./steps/BasicInfoStep').then((mod) => mod.BasicInfoStep),
  {
    loading: () => <SkeletonWizardStep />,
  }
);

export const CoreValueStepDynamic = dynamic(
  () => import('./steps/CoreValueStep').then((mod) => mod.CoreValueStep),
  {
    loading: () => <SkeletonWizardStep />,
  }
);

export const LifeStoryStepDynamic = dynamic(
  () => import('./steps/LifeStoryStep').then((mod) => mod.LifeStoryStep),
  {
    loading: () => <SkeletonWizardStep />,
  }
);

export const UserPersonaStepDynamic = dynamic(
  () => import('./steps/UserPersonaStep').then((mod) => mod.UserPersonaStep),
  {
    loading: () => <SkeletonWizardStep />,
  }
);

export const ProductsServicesStepDynamic = dynamic(
  () => import('./steps/ProductsServicesStep').then((mod) => mod.ProductsServicesStep),
  {
    loading: () => <SkeletonWizardStep />,
  }
);

export const ContentDirectionStepDynamic = dynamic(
  () => import('./steps/ContentDirectionStep').then((mod) => mod.ContentDirectionStep),
  {
    loading: () => <SkeletonWizardStep />,
  }
);
*/
