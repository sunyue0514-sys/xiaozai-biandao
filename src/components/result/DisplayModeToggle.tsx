'use client';

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { LayoutGrid, LayoutList } from 'lucide-react';
import { DisplayMode } from './types';

interface DisplayModeToggleProps {
  mode: DisplayMode;
  onChange: (mode: DisplayMode) => void;
}

/**
 * 展示模式切换组件
 * 支持精简版和详细版切换
 */
export function DisplayModeToggle({ mode, onChange }: DisplayModeToggleProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">展示模式</span>
      <ToggleGroup 
        type="single" 
        value={mode} 
        onValueChange={(value) => value && onChange(value as DisplayMode)}
        className="border rounded-lg p-0.5"
      >
        <ToggleGroupItem 
          value="compact" 
          aria-label="精简版"
          className="px-3 py-1.5 text-sm data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
        >
          <LayoutGrid className="w-4 h-4 mr-1.5" />
          精简版
        </ToggleGroupItem>
        <ToggleGroupItem 
          value="detailed" 
          aria-label="详细版"
          className="px-3 py-1.5 text-sm data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
        >
          <LayoutList className="w-4 h-4 mr-1.5" />
          详细版
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
