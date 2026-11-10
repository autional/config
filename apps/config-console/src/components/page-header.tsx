import type { ComponentProps } from 'react';
import { AppPageHeader } from '@autional/ui';

/**
 * 控制台页头（设计系统 AppPageHeader 的本地收敛层）。
 *
 * 修两个已知问题，避免每个页面各写一遍：
 * 1) 左侧文本块补 `flex-1`：设计系统只给右侧 `sm:shrink-0`，左侧没有 grow，
 *    右侧操作一多（概览 4 个按钮）就把标题/描述压到 ~240px，英文换行尤其明显。
 * 2) 统一挂载点：后续页头级改动（操作收拢、面包屑）只改这里。
 */
export function PageHeader({ className = '', ...rest }: ComponentProps<typeof AppPageHeader>) {
  return (
    <AppPageHeader
      {...rest}
      className={`[&>div:first-child]:flex-1 [&>div:first-child]:pr-2 ${className}`}
    />
  );
}
