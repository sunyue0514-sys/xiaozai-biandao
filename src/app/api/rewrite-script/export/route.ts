import { guardAIRequest } from '@/app/api/ai/_security';
import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx-js-style';

interface QAPair {
  question: string;
  answerHints?: string[];
}

interface HookOpening {
  content?: string;
  hookTechnique?: string;
  emotionPoint?: string;
}

interface FullScript {
  content?: string;
  duration?: string;
  keyPoints?: string[];
  emotionCurve?: string;
}

interface DialogueVersion {
  qaList?: QAPair[];
  shootingTips?: string;
}

interface CallToAction {
  content?: string;
  actionType?: string;
  valuePromise?: string;
}

interface RewriteScriptData {
  hookOpening: HookOpening | string;
  fullScript: FullScript | string;
  dialogueVersion?: DialogueVersion;
  callToAction: CallToAction | string;
}

function getContent(field: unknown): string {
  if (typeof field === 'string') return field;
  if (typeof field === 'object' && field !== null && 'content' in field) {
    return (field as { content: string }).content || '';
  }
  return '';
}

export async function POST(request: NextRequest) {
  const securityResponse = await guardAIRequest(request, {"paid":false});
  if (securityResponse) return securityResponse;

  try {
    const { script } = await request.json() as { script: RewriteScriptData };
    
    if (!script) {
      return NextResponse.json({ error: '缺少脚本数据' }, { status: 400 });
    }

    // 准备所有内容
    const hookContent = getContent(script.hookOpening);
    const fullContent = getContent(script.fullScript);
    const ctaContent = getContent(script.callToAction);
    const qaList = script.dialogueVersion?.qaList || [];
    
    // 构建工作表数据
    const allData: (string | number)[][] = [
      ['仿写脚本'],
      [],
    ];
    
    // 第一部分：爆款开头
    allData.push(['爆款开头（黄金3秒钩子）']);
    allData.push([]);
    allData.push(['文案内容', hookContent]);
    if (typeof script.hookOpening === 'object') {
      if (script.hookOpening.hookTechnique) {
        allData.push(['钩子技巧', script.hookOpening.hookTechnique]);
      }
      if (script.hookOpening.emotionPoint) {
        allData.push(['情绪触发点', script.hookOpening.emotionPoint]);
      }
    }
    allData.push(['字数', `${hookContent.length}字（建议15-30字）`]);
    allData.push([]);
    allData.push([]);
    
    // 第二部分：完整口播
    allData.push(['完整口播文案']);
    allData.push([]);
    if (typeof script.fullScript === 'object' && script.fullScript.duration) {
      allData.push(['预估时长', script.fullScript.duration]);
    }
    allData.push(['字数', `${fullContent.length}字`]);
    allData.push([]);
    allData.push(['文案内容', fullContent]);
    if (typeof script.fullScript === 'object') {
      if (script.fullScript.keyPoints?.length) {
        allData.push(['核心观点', script.fullScript.keyPoints.join('、')]);
      }
      if (script.fullScript.emotionCurve) {
        allData.push(['情绪曲线', script.fullScript.emotionCurve]);
      }
    }
    allData.push([]);
    allData.push([]);
    
    // 第三部分：问答对话版
    allData.push(['问答对话版（无脚本拍摄）']);
    allData.push([]);
    allData.push(['序号', '问题', '回答要点']);
    qaList.forEach((qa, index) => {
      const answers = qa.answerHints?.join('\n• ') || '';
      allData.push([`${index + 1}`, qa.question || '', `• ${answers}`]);
    });
    if (script.dialogueVersion?.shootingTips) {
      allData.push([]);
      allData.push(['拍摄建议', script.dialogueVersion.shootingTips]);
    }
    allData.push([]);
    allData.push([]);
    
    // 第四部分：行动号召
    allData.push(['行动号召（引导互动）']);
    allData.push([]);
    allData.push(['文案内容', ctaContent]);
    if (typeof script.callToAction === 'object') {
      if (script.callToAction.actionType) {
        allData.push(['引导类型', script.callToAction.actionType]);
      }
      if (script.callToAction.valuePromise) {
        allData.push(['价值承诺', script.callToAction.valuePromise]);
      }
    }
    allData.push(['字数', `${ctaContent.length}字（建议20-40字）`]);
    
    // 创建工作表
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet(allData);
    
    // 设置列宽
    sheet['!cols'] = [{ wch: 12 }, { wch: 50 }, { wch: 50 }];
    
    // 设置行高
    const rowHeights: { hpt?: number }[] = [];
    allData.forEach((row, index) => {
      if (row.length === 1 && typeof row[0] === 'string' && 
          (row[0].includes('爆款开头') || row[0].includes('完整口播') || 
           row[0].includes('问答对话') || row[0].includes('行动号召') || row[0] === '仿写脚本')) {
        rowHeights[index] = { hpt: 28 };
      } else if (row.length === 3 && row[0] === '序号') {
        rowHeights[index] = { hpt: 22 };
      } else {
        rowHeights[index] = {};
      }
    });
    sheet['!rows'] = rowHeights;
    
    // 定义样式
    const sectionTitleStyle: XLSX.CellStyle = {
      font: { bold: true, sz: 14, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '4F46E5' } },
      alignment: { horizontal: 'center', vertical: 'center' }
    };
    
    const mainTitleStyle: XLSX.CellStyle = {
      font: { bold: true, sz: 18, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '1E293B' } },
      alignment: { horizontal: 'center', vertical: 'center' }
    };
    
    const headerStyle: XLSX.CellStyle = {
      font: { bold: true, sz: 11 },
      fill: { fgColor: { rgb: 'E0E7FF' } },
      alignment: { horizontal: 'center', vertical: 'center' }
    };
    
    const labelStyle: XLSX.CellStyle = {
      font: { bold: true, sz: 11 },
      fill: { fgColor: { rgb: 'F1F5F9' } },
      alignment: { vertical: 'center' }
    };
    
    // 应用样式
    const merges: XLSX.Range[] = [];
    
    allData.forEach((row, rowIndex) => {
      const cellRef = XLSX.utils.encode_cell({ r: rowIndex, c: 0 });
      
      if (row[0] === '仿写脚本') {
        sheet[cellRef] = { v: row[0], s: mainTitleStyle };
        merges.push({ s: { r: rowIndex, c: 0 }, e: { r: rowIndex, c: 2 } });
      } else if (row.length === 1 && typeof row[0] === 'string') {
        const title = row[0];
        if (title.includes('爆款开头') || title.includes('完整口播') || 
            title.includes('问答对话') || title.includes('行动号召')) {
          sheet[cellRef] = { v: title, s: sectionTitleStyle };
          merges.push({ s: { r: rowIndex, c: 0 }, e: { r: rowIndex, c: 2 } });
        }
      } else if (row.length === 3 && row[0] === '序号') {
        ['A', 'B', 'C'].forEach((col, colIndex) => {
          const ref = `${col}${rowIndex + 1}`;
          if (sheet[ref]) {
            sheet[ref].s = headerStyle;
          }
        });
      } else if (row.length === 2 && typeof row[0] === 'string') {
        const labelCell = XLSX.utils.encode_cell({ r: rowIndex, c: 0 });
        const valueCell = XLSX.utils.encode_cell({ r: rowIndex, c: 1 });
        
        if (sheet[labelCell]) {
          sheet[labelCell].s = labelStyle;
        }
        
        if (row[0] === '文案内容' && typeof row[1] === 'string') {
          if (sheet[valueCell]) {
            sheet[valueCell].s = {
              font: { sz: 11 },
              alignment: { wrapText: true, vertical: 'top' },
              fill: { fgColor: { rgb: 'FFFBEB' } }
            };
          }
        }
      } else if (row.length === 3 && typeof row[0] === 'number') {
        const numCell = XLSX.utils.encode_cell({ r: rowIndex, c: 0 });
        if (sheet[numCell]) {
          sheet[numCell].s = { alignment: { horizontal: 'center', vertical: 'center' } };
        }
      }
    });
    
    sheet['!merges'] = merges;
    
    XLSX.utils.book_append_sheet(workbook, sheet, '仿写脚本');
    
    // 生成文件
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
    
    // 设置响应头
    const fileName = `仿写脚本_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.xlsx`;
    
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('API operation event');
    return NextResponse.json({ error: '导出失败' }, { status: 500 });
  }
}
