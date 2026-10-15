import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ShadingType,
  LevelFormat,
} from 'docx';
import { saveAs } from 'file-saver';
import { Packer } from 'docx';

/**
 * 解析文本内容中的段落和列表
 */
function parseContent(content: string): Array<{ type: 'title' | 'subtitle' | 'text' | 'list'; text: string; level?: number }> {
  const lines = content.split('\n');
  const result: Array<{ type: 'title' | 'subtitle' | 'text' | 'list'; text: string; level?: number }> = [];

  for (const line of lines) {
    const trimmedLine = line.trim();
    
    if (!trimmedLine) continue;

    // 主标题 【xxx】
    if (trimmedLine.startsWith('【') && trimmedLine.endsWith('】')) {
      result.push({
        type: 'title',
        text: trimmedLine.slice(1, -1),
      });
    }
    // 子标题 【xxx 或 【xxx】后面没有结束
    else if (trimmedLine.startsWith('【')) {
      const match = trimmedLine.match(/【(.+?)】?/);
      if (match) {
        result.push({
          type: 'subtitle',
          text: match[1] || trimmedLine.slice(1),
        });
      } else {
        result.push({
          type: 'subtitle',
          text: trimmedLine.slice(1),
        });
      }
    }
    // 列表项（数字开头）
    else if (/^\d+\./.test(trimmedLine)) {
      result.push({
        type: 'list',
        text: trimmedLine,
        level: 0,
      });
    }
    // 列表项（bullet开头）
    else if (/^[•·\-]/.test(trimmedLine)) {
      result.push({
        type: 'list',
        text: trimmedLine,
        level: 1,
      });
    }
    // 缩进的内容作为二级列表
    else if (line.startsWith('   ') || line.startsWith('\t')) {
      result.push({
        type: 'list',
        text: trimmedLine,
        level: 2,
      });
    }
    // 普通文本
    else {
      result.push({
        type: 'text',
        text: trimmedLine,
      });
    }
  }

  return result;
}

/**
 * 创建标题段落
 */
function createTitle(text: string) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    spacing: {
      before: 400,
      after: 200,
    },
    style: 'Title',
  });
}

/**
 * 创建副标题段落
 */
function createSubtitle(text: string) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: {
      before: 300,
      after: 150,
    },
  });
}

/**
 * 创建普通段落
 */
function createParagraph(text: string) {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        size: 22, // 11pt
      }),
    ],
    spacing: {
      before: 100,
      after: 100,
    },
  });
}

/**
 * 创建列表项
 */
function createListItem(text: string, level: number = 0) {
  const indent = level * 400 + 400;
  const prefix = level === 0 ? '' : '   ';
  
  return new Paragraph({
    children: [
      new TextRun({
        text: prefix + text,
        size: 22,
      }),
    ],
    spacing: {
      before: 50,
      after: 50,
    },
    indent: {
      left: indent,
    },
  });
}

/**
 * 将内容块转换为Word段落
 */
function contentToParagraphs(
  title: string,
  content: string,
  color: string = '4F46E5' // 默认主题色
): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  // 模块标题 - 带背景色的表格
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: title,
          bold: true,
          size: 28,
          color: 'FFFFFF',
        }),
      ],
      spacing: {
        before: 400,
        after: 0,
      },
      shading: {
        fill: color,
        type: ShadingType.CLEAR,
      },
      border: {
        bottom: {
          color: color,
          style: BorderStyle.SINGLE,
          size: 1,
        },
      },
    })
  );

  // 解析内容
  const parsed = parseContent(content);

  for (const item of parsed) {
    switch (item.type) {
      case 'title':
        paragraphs.push(createSubtitle(item.text));
        break;
      case 'subtitle':
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: item.text,
                bold: true,
                size: 24,
              }),
            ],
            spacing: {
              before: 200,
              after: 100,
            },
          })
        );
        break;
      case 'list':
        paragraphs.push(createListItem(item.text, item.level));
        break;
      default:
        paragraphs.push(createParagraph(item.text));
    }
  }

  return paragraphs;
}

interface PlanResult {
  accountSetup?: string;
  painPointSolutions?: string;
  firstWeekPlan?: string;
  contentTemplates?: string;
  engagementScripts?: string;
  conversionFlow?: string;
  liveStreamPlan?: string;
  sensitiveWordsGuide?: string;
  realisticGoals?: string;
}

/**
 * 导出账号规划为Word文档
 */
export async function exportAccountPlanToWord(
  planResult: PlanResult,
  customerName: string
) {
  const sections: { title: string; content: string; color: string }[] = [];

  // 账号搭建建议
  if (planResult.accountSetup) {
    sections.push({
      title: '账号搭建建议',
      content: planResult.accountSetup,
      color: '4F46E5', // 主题蓝
    });
  }

  // 现实目标
  if (planResult.realisticGoals) {
    sections.push({
      title: '现实目标',
      content: planResult.realisticGoals,
      color: '059669', // 翠绿
    });
  }

  // 痛点解决方案
  if (planResult.painPointSolutions) {
    sections.push({
      title: '痛点解决方案',
      content: planResult.painPointSolutions,
      color: 'EA580C', // 橙色
    });
  }

  // 第一周执行计划
  if (planResult.firstWeekPlan) {
    sections.push({
      title: '第一周执行计划',
      content: planResult.firstWeekPlan,
      color: '2563EB', // 蓝色
    });
  }

  // 内容模板
  if (planResult.contentTemplates) {
    sections.push({
      title: '内容模板',
      content: planResult.contentTemplates,
      color: '9333EA', // 紫色
    });
  }

  // 敏感词规避
  if (planResult.sensitiveWordsGuide) {
    sections.push({
      title: '敏感词规避',
      content: planResult.sensitiveWordsGuide,
      color: 'DC2626', // 红色
    });
  }

  // 互动话术
  if (planResult.engagementScripts) {
    sections.push({
      title: '互动话术',
      content: planResult.engagementScripts,
      color: '0891B2', // 青色
    });
  }

  // 转化流程
  if (planResult.conversionFlow) {
    sections.push({
      title: '转化流程',
      content: planResult.conversionFlow,
      color: '16A34A', // 绿色
    });
  }

  // 直播运营计划
  if (planResult.liveStreamPlan) {
    sections.push({
      title: '直播运营计划',
      content: planResult.liveStreamPlan,
      color: 'DB2777', // 粉色
    });
  }

  // 创建文档
  const doc = new Document({
    styles: {
      paragraphStyles: [
        {
          id: 'Title',
          name: 'Title',
          basedOn: 'Normal',
          next: 'Normal',
          run: {
            size: 40,
            bold: true,
            color: '1F2937',
          },
          paragraph: {
            alignment: AlignmentType.CENTER,
            spacing: {
              before: 200,
              after: 200,
            },
          },
        },
        {
          id: 'Heading1',
          name: 'Heading 1',
          basedOn: 'Normal',
          next: 'Normal',
          run: {
            size: 32,
            bold: true,
            color: '374151',
          },
          paragraph: {
            spacing: {
              before: 400,
              after: 200,
            },
          },
        },
        {
          id: 'Heading2',
          name: 'Heading 2',
          basedOn: 'Normal',
          next: 'Normal',
          run: {
            size: 26,
            bold: true,
            color: '4B5563',
          },
          paragraph: {
            spacing: {
              before: 300,
              after: 150,
            },
          },
        },
      ],
    },
    sections: [
      {
        properties: {},
        children: [
          // 文档标题
          new Paragraph({
            children: [
              new TextRun({
                text: '账号运营规划',
                bold: true,
                size: 48,
                color: '1F2937',
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: {
              before: 200,
              after: 100,
            },
          }),
          // 客户名称
          new Paragraph({
            children: [
              new TextRun({
                text: `客户：${customerName}`,
                size: 28,
                color: '6B7280',
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: {
              before: 100,
              after: 100,
            },
          }),
          // 生成时间
          new Paragraph({
            children: [
              new TextRun({
                text: `生成时间：${new Date().toLocaleString('zh-CN')}`,
                size: 22,
                color: '9CA3AF',
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: {
              before: 0,
              after: 400,
            },
          }),
          // 分隔线
          new Paragraph({
            border: {
              bottom: {
                color: 'E5E7EB',
                style: BorderStyle.SINGLE,
                size: 1,
              },
            },
            spacing: {
              after: 300,
            },
          }),
          // 内容模块
          ...sections.flatMap((section) => contentToParagraphs(section.title, section.content, section.color)),
        ],
      },
    ],
  });

  // 生成并下载
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `账号规划_${customerName}_${new Date().toLocaleDateString('zh-CN')}.docx`);
}
