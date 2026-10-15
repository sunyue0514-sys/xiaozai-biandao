'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function TestSSEPage() {
  const [result, setResult] = useState<string>('');
  const [structuredData, setStructuredData] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toISOString()}] ${msg}`]);
  };

  const testSSE = async () => {
    setResult('');
    setStructuredData(null);
    setLogs([]);
    
    addLog('开始测试 SSE...');
    
    try {
      const response = await fetch('/api/test-sse');
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      let buffer = '';
      let contentBuffer = '';
      let structuredScriptRef: any = null;
      
      if (!reader) {
        addLog('错误: 无法获取 reader');
        return;
      }
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          addLog('流读取完成');
          break;
        }
        
        buffer += decoder.decode(value, { stream: true });
        addLog(`收到 chunk, buffer 长度: ${buffer.length}`);
        
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';
        
        addLog(`分割后事件数: ${events.length}, 剩余 buffer 长度: ${buffer.length}`);
        
        for (const event of events) {
          const line = event.trim();
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              addLog(`解析事件: ${JSON.stringify(data).substring(0, 100)}...`);
              
              if (data.content) {
                contentBuffer += data.content;
                addLog(`累积内容: ${contentBuffer}`);
              }
              
              if (data.done && data.structured && data.script) {
                structuredScriptRef = data.script;
                addLog(`收到结构化数据: ${data.script?.basicInfo?.title}`);
              }
            } catch (e) {
              addLog(`解析失败: ${(e as Error).message}`);
            }
          }
        }
      }
      
      // 处理剩余 buffer
      addLog(`处理剩余 buffer, 长度: ${buffer.length}`);
      if (buffer.trim().startsWith('data: ')) {
        try {
          const data = JSON.parse(buffer.trim().slice(6));
          addLog(`buffer 解析成功: done=${data.done}`);
          
          if (data.done && data.structured && data.script) {
            structuredScriptRef = data.script;
            addLog(`从 buffer 获取结构化数据: ${data.script?.basicInfo?.title}`);
          }
        } catch (e) {
          addLog(`buffer 解析失败: ${(e as Error).message}`);
        }
      }
      
      setResult(contentBuffer);
      setStructuredData(structuredScriptRef);
      addLog(`最终结果 - 内容: "${contentBuffer}", 结构化数据: ${structuredScriptRef ? '有' : '无'}`);
      
    } catch (error) {
      addLog(`错误: ${(error as Error).message}`);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">SSE 测试页面</h1>
      
      <Button onClick={testSSE} className="mb-4">
        测试 SSE
      </Button>
      
      <div className="space-y-4">
        <div className="border rounded-lg p-4">
          <h2 className="font-semibold mb-2">内容结果:</h2>
          <pre className="bg-muted p-2 rounded">{result || '(空)'}</pre>
        </div>
        
        <div className="border rounded-lg p-4">
          <h2 className="font-semibold mb-2">结构化数据:</h2>
          <pre className="bg-muted p-2 rounded text-sm overflow-auto max-h-40">
            {structuredData ? JSON.stringify(structuredData, null, 2) : '(无)'}
          </pre>
        </div>
        
        <div className="border rounded-lg p-4">
          <h2 className="font-semibold mb-2">日志:</h2>
          <div className="bg-muted p-2 rounded text-sm font-mono max-h-60 overflow-auto">
            {logs.map((log, i) => (
              <div key={i}>{log}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
