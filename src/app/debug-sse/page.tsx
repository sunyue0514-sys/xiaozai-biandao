'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function DebugSSEPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [scriptData, setScriptData] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const logsRef = useRef<string[]>([]);
  
  const addLog = useCallback((msg: string) => {
    const timestamp = new Date().toLocaleTimeString() + '.' + (Date.now() % 1000);
    const logMsg = `[${timestamp}] ${msg}`;
    logsRef.current = [...logsRef.current, logMsg];
    setLogs([...logsRef.current]);
  }, []);

  // 完全复制前端的 SSE 处理逻辑
  const testRealAPI = async () => {
    logsRef.current = [];
    setLogs([]);
    setScriptData(null);
    setIsGenerating(true);
    
    // 模拟前端的状态变量
    let buffer = '';
    const contentBufferRef = { current: '' };
    const structuredScriptRef: { current: any } = { current: null };
    const type = 'script';
    
    addLog('========== 开始测试真实 API ==========');
    addLog('URL: /api/script/generate-structured');
    
    try {
      const response = await fetch('/api/script/generate-structured', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token_1774450970563_xw4hcciuvl',
        },
        body: JSON.stringify({
          topic: '测试主题',
          scriptType: 'knowledge',
          shootingMethod: 'talking_head',
          wordCount: 10,
        }),
      });
      
      addLog(`响应状态: ${response.status}`);
      
      if (!response.body) {
        addLog('❌ response.body 为空');
        setIsGenerating(false);
        return;
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      addLog('开始读取流...');
      
      // ===== 完全复制前端的 while 循环 =====
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          addLog('流读取完成, buffer长度: ' + buffer.length);
          break;
        }
        
        buffer += decoder.decode(value, { stream: true });
        
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';
        
        for (const event of events) {
          const line = event.trim();
          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.slice(6);
              const data = JSON.parse(jsonStr);
              
              if (data.done !== undefined) {
                addLog('');
                addLog('========== 发现 done 事件 ==========');
                addLog(`done: ${data.done} (${typeof data.done})`);
                addLog(`structured: ${data.structured} (${typeof data.structured})`);
                addLog(`script 存在: ${!!data.script}`);
                
                if (data.script) {
                  addLog(`script.basicInfo 存在: ${!!data.script.basicInfo}`);
                  addLog(`script.shots 存在: ${!!data.script.shots}`);
                  addLog(`script.shots 是数组: ${Array.isArray(data.script.shots)}`);
                  addLog(`标题: "${data.script.basicInfo?.title}"`);
                }
                
                // 前端的条件判断
                if (data.done && data.structured && data.script) {
                  structuredScriptRef.current = data.script;
                  addLog('✅✅✅ structuredScriptRef.current 已设置!');
                } else {
                  addLog('❌ 条件不满足');
                }
              }
              
              if (data.content) {
                contentBufferRef.current += data.content;
              }
            } catch (parseError: any) {
              if (line.includes('"done"')) {
                addLog(`❌ done 事件解析失败: ${parseError.message}`);
              }
            }
          }
        }
      }
      
      // ===== 处理剩余 buffer =====
      addLog('');
      addLog('========== 处理剩余 buffer ==========');
      addLog(`buffer 长度: ${buffer.length}`);
      addLog(`buffer 以 data: 开头: ${buffer.trim().startsWith('data: ')}`);
      
      if (buffer.includes('"done":true')) {
        addLog('在 buffer 中找到 done 事件!');
        
        // 尝试正则匹配
        const doneMatch = buffer.match(/\{"done":true[^}]*"script":\{[\s\S]*\}\}/);
        if (doneMatch) {
          addLog('正则匹配成功');
          try {
            const data = JSON.parse(doneMatch[0]);
            if (data.done && data.structured && data.script) {
              structuredScriptRef.current = data.script;
              addLog('✅ 通过正则设置 structuredScriptRef');
            }
          } catch (e: any) {
            addLog(`正则匹配解析失败: ${e.message}`);
          }
        }
      }
      
      if (buffer.trim().startsWith('data: ')) {
        try {
          const data = JSON.parse(buffer.trim().slice(6));
          if (data.done && data.structured && data.script) {
            structuredScriptRef.current = data.script;
            addLog('✅ 从 buffer 设置 structuredScriptRef');
          }
        } catch (e: any) {
          addLog(`buffer 解析失败: ${e.message}`);
        }
      }
      
      // ===== 最终结果检查 =====
      addLog('');
      addLog('========== 最终结果检查 ==========');
      addLog(`type: ${type}`);
      addLog(`type === "script": ${type === 'script'}`);
      addLog(`contentBuffer 长度: ${contentBufferRef.current.length}`);
      addLog(`structuredScriptRef.current: ${structuredScriptRef.current ? '有数据' : '无数据'}`);
      
      if (structuredScriptRef.current) {
        addLog(`structuredScriptRef.current.basicInfo: ${!!structuredScriptRef.current?.basicInfo}`);
        addLog(`structuredScriptRef.current.shots: ${!!structuredScriptRef.current?.shots}`);
      }
      
      // 前端的最终条件判断
      const scriptRef = structuredScriptRef.current as any;
      const finalCondition = type === 'script' && scriptRef && 
          scriptRef.basicInfo && 
          scriptRef.shots;
      
      addLog('');
      addLog(`最终条件判断: ${finalCondition}`);
      
      if (finalCondition) {
        setScriptData(structuredScriptRef.current);
        addLog('✅✅✅ 测试成功！脚本数据将正确显示 ✅✅✅');
      } else {
        // 检查是否因为 contentBuffer 为空
        if (!contentBufferRef.current || contentBufferRef.current.trim().length === 0) {
          addLog('❌❌❌ 测试失败！contentBuffer 为空，将显示"生成结果为空" ❌❌❌');
        } else {
          addLog('❌❌❌ 测试失败！structuredScriptRef 无数据 ❌❌❌');
        }
      }
      
    } catch (error: any) {
      addLog(`❌ 错误: ${error.message}`);
    }
    
    setIsGenerating(false);
  };

  // 测试模拟 API
  const testMockAPI = async () => {
    logsRef.current = [];
    setLogs([]);
    setScriptData(null);
    setIsGenerating(true);
    
    let buffer = '';
    const contentBufferRef = { current: '' };
    const structuredScriptRef: { current: any } = { current: null };
    const type = 'script';
    
    addLog('========== 测试模拟 API ==========');
    
    try {
      const response = await fetch('/api/test-script-sse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delay: 10, eventCount: 50 }),
      });
      
      addLog(`响应状态: ${response.status}`);
      
      if (!response.body) {
        addLog('❌ response.body 为空');
        setIsGenerating(false);
        return;
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          addLog('流读取完成');
          break;
        }
        
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';
        
        for (const event of events) {
          const line = event.trim();
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.done !== undefined) {
                addLog('');
                addLog('发现 done 事件');
                addLog(`done: ${data.done}, structured: ${data.structured}, script: ${!!data.script}`);
                
                if (data.done && data.structured && data.script) {
                  structuredScriptRef.current = data.script;
                  addLog('✅ structuredScriptRef 已设置');
                  addLog(`标题: ${data.script.basicInfo?.title}`);
                }
              }
              
              if (data.content) {
                contentBufferRef.current += data.content;
              }
            } catch (e: any) {
              addLog(`解析失败: ${e.message}`);
            }
          }
        }
      }
      
      // 最终结果
      addLog('');
      addLog('========== 最终结果 ==========');
      addLog(`structuredScriptRef: ${structuredScriptRef.current ? '有数据' : '无数据'}`);
      
      if (structuredScriptRef.current) {
        setScriptData(structuredScriptRef.current);
        addLog('✅ 测试成功！');
      } else {
        addLog('❌ 测试失败！');
      }
      
    } catch (error: any) {
      addLog(`错误: ${error.message}`);
    }
    
    setIsGenerating(false);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">SSE 流处理调试页面</h1>
      
      <div className="mb-6 flex gap-4">
        <Button onClick={testRealAPI} disabled={isGenerating} variant="default">
          {isGenerating ? '测试中...' : '测试真实 API'}
        </Button>
        <Button onClick={testMockAPI} disabled={isGenerating} variant="outline">
          测试模拟 API
        </Button>
        <Button variant="ghost" onClick={() => { logsRef.current = []; setLogs([]); }}>
          清空日志
        </Button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>调试日志</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-3 rounded text-xs font-mono max-h-[500px] overflow-auto whitespace-pre-wrap">
              {logs.length === 0 ? '(点击上方按钮开始测试)' : logs.join('\n')}
            </pre>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>结构化数据结果</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-[500px]">
              {scriptData ? JSON.stringify(scriptData, null, 2) : '(暂无数据)'}
            </pre>
          </CardContent>
        </Card>
      </div>
      
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>调试说明</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p><strong>测试真实 API：</strong>调用实际的脚本生成 API，测试完整的 SSE 流处理。</p>
          <p className="mt-2"><strong>测试模拟 API：</strong>调用模拟的 API，快速验证 SSE 处理逻辑。</p>
          <p className="mt-4 text-destructive">如果两个测试都成功，说明前端 SSE 处理逻辑正确。问题可能在其他地方。</p>
        </CardContent>
      </Card>
    </div>
  );
}
