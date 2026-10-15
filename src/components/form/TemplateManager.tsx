'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { FormTemplate } from '@/hooks/useFormTemplates';
import { 
  Save, 
  FolderOpen, 
  Trash2, 
  Clock,
  Check,
  FileText,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface TemplateManagerProps {
  type: FormTemplate['type'];
  templates: FormTemplate[];
  currentData: Record<string, any>;
  onSave: (name: string, data: Record<string, any>) => void;
  onLoad: (data: Record<string, any>) => void;
  onDelete: (id: string) => void;
  isNameExists: (name: string) => boolean;
  defaultName?: string;
  className?: string; // 自定义按钮样式
  buttonClassName?: string; // 单个按钮样式
}

export function TemplateManager({
  type,
  templates,
  currentData,
  onSave,
  onLoad,
  onDelete,
  isNameExists,
  defaultName,
  className,
  buttonClassName,
}: TemplateManagerProps) {
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [nameError, setNameError] = useState('');

  const typeNames: Record<string, string> = {
    topic: '选题',
    writing: '文案',
    qianchuan: '千川',
    feedad: '信息流',
    script: '脚本',
  };

  const handleSave = () => {
    const name = templateName.trim() || defaultName || `模板 ${new Date().toLocaleDateString('zh-CN')}`;
    
    if (isNameExists(name)) {
      setNameError('模板名称已存在');
      return;
    }

    onSave(name, currentData);
    setShowSaveDialog(false);
    setTemplateName('');
    setNameError('');
    toast.success('模板已保存');
  };

  const handleLoad = (template: FormTemplate) => {
    onLoad(template.data);
    setShowLoadDialog(false);
    toast.success(`已加载模板：${template.name}`);
  };

  const handleDelete = (id: string, name: string) => {
    onDelete(id);
    toast.success(`已删除模板：${name}`);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      {/* 操作按钮 */}
      <div className={cn("flex items-center gap-2", className)}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setTemplateName(defaultName || '');
            setShowSaveDialog(true);
          }}
          className={buttonClassName}
        >
          <Save className="w-4 h-4 mr-1.5" />
          保存模板
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowLoadDialog(true)}
          disabled={templates.length === 0}
          className={buttonClassName}
        >
          <FolderOpen className="w-4 h-4 mr-1.5" />
          加载模板
          {templates.length > 0 && (
            <span className="ml-1 text-xs bg-muted/30 px-1.5 rounded-full">
              {templates.length}
            </span>
          )}
        </Button>
      </div>

      {/* 保存模板对话框 */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Save className="w-5 h-5 text-primary" />
              保存{typeNames[type]}模板
            </DialogTitle>
            <DialogDescription>
              保存当前表单配置，下次可快速加载使用
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">模板名称</label>
              <Input
                placeholder={defaultName || '输入模板名称...'}
                value={templateName}
                onChange={(e) => {
                  setTemplateName(e.target.value);
                  setNameError('');
                }}
                className={nameError ? 'border-destructive' : ''}
              />
              {nameError && (
                <p className="text-xs text-destructive">{nameError}</p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                取消
              </Button>
              <Button onClick={handleSave}>
                <Check className="w-4 h-4 mr-1.5" />
                保存
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 加载模板对话框 */}
      <Dialog open={showLoadDialog} onOpenChange={setShowLoadDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-primary" />
              加载{typeNames[type]}模板
            </DialogTitle>
            <DialogDescription>
              选择已保存的模板快速填充表单
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 pt-2 max-h-[400px] overflow-y-auto">
            {templates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>暂无保存的模板</p>
              </div>
            ) : (
              templates.map((template) => (
                <div
                  key={template.id}
                  className="group flex items-center justify-between p-3 rounded-lg border hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => handleLoad(template)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{template.name}</div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(template.updatedAt)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(template.id, template.name);
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                    <Check className="w-5 h-5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              ))
            )}
          </div>
          {templates.length > 0 && (
            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => setShowLoadDialog(false)}>
                取消
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
