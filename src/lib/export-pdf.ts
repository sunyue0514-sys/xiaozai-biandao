/**
 * PDF/图片导出工具
 * 
 * 使用纯Canvas API绘制DOM元素
 * 完全绕过html2canvas的CSS解析问题
 */

import jsPDF from 'jspdf';

export interface ExportPDFOptions {
  filename?: string;
  title?: string;
  orientation?: 'portrait' | 'landscape';
  format?: 'a4' | 'letter';
  padding?: number;
  scale?: number;
  backgroundColor?: string;
  onProgress?: (progress: number, message: string) => void;
}

/**
 * 将颜色转换为标准hex格式
 */
function normalizeColor(color: string): string {
  if (!color || color === 'transparent' || color === 'rgba(0, 0, 0, 0)') {
    return '';
  }
  
  // 如果是rgb/rgba格式，转换为hex
  const rgbMatch = color.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/i);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]);
    const g = parseInt(rgbMatch[2]);
    const b = parseInt(rgbMatch[3]);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
  
  // 如果已经是hex格式，直接返回
  if (color.startsWith('#')) {
    return color;
  }
  
  // 颜色名称（如 white, black 等）保持不变
  return color;
}

/**
 * 将计算样式内联到元素
 */
function inlineAllStyles(source: HTMLElement, target: HTMLElement): void {
  const computedStyle = window.getComputedStyle(source);
  
  // 需要内联的关键样式属性
  const props = [
    // 盒模型
    'width', 'height', 'min-width', 'max-width', 'min-height', 'max-height',
    'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
    'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
    
    // 边框
    'border-width', 'border-style', 'border-color',
    'border-top-width', 'border-top-style', 'border-top-color',
    'border-right-width', 'border-right-style', 'border-right-color',
    'border-bottom-width', 'border-bottom-style', 'border-bottom-color',
    'border-left-width', 'border-left-style', 'border-left-color',
    'border-radius', 'border-top-left-radius', 'border-top-right-radius',
    'border-bottom-left-radius', 'border-bottom-right-radius',
    
    // 布局
    'display', 'position', 'top', 'right', 'bottom', 'left',
    'flex', 'flex-direction', 'flex-wrap', 'flex-grow', 'flex-shrink', 'flex-basis',
    'justify-content', 'align-items', 'align-content', 'align-self', 'gap', 
    'grid', 'grid-template-columns', 'grid-template-rows', 'grid-gap',
    'float', 'clear', 'overflow', 'overflow-x', 'overflow-y',
    
    // 背景
    'background-color', 'background-image', 'background-size', 'background-position', 'background-repeat',
    
    // 文字
    'color', 'font-size', 'font-weight', 'font-family', 'font-style',
    'line-height', 'text-align', 'text-decoration', 'text-transform',
    'letter-spacing', 'word-spacing', 'white-space', 'word-break', 'word-wrap',
    
    // 视觉效果
    'opacity', 'visibility', 'z-index', 'box-shadow', 'transform',
    'outline', 'outline-width', 'outline-style', 'outline-color', 'outline-offset',
    'list-style', 'list-style-type', 'list-style-position',
    'vertical-align', 'object-fit', 'object-position',
  ];
  
  props.forEach(prop => {
    let value = computedStyle.getPropertyValue(prop);
    
    // 特殊处理颜色属性 - 转换为标准格式
    if (prop.includes('color') || prop.includes('background') && prop.includes('color')) {
      value = normalizeColor(value);
    }
    
    if (value && value !== 'initial' && value !== 'inherit' && value !== 'normal') {
      target.style.setProperty(prop, value, 'important');
    }
  });
  
  // 单独处理背景颜色
  const bgColor = computedStyle.backgroundColor;
  if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
    target.style.backgroundColor = normalizeColor(bgColor);
  }
  
  // 单独处理文字颜色
  const textColor = computedStyle.color;
  if (textColor) {
    target.style.color = normalizeColor(textColor);
  }
  
  // 处理渐变背景 - 需要特殊处理
  const bgImage = computedStyle.backgroundImage;
  if (bgImage && bgImage !== 'none') {
    // 检查是否包含oklch或color-mix，如果是则移除
    if (bgImage.includes('oklch') || bgImage.includes('color-mix')) {
      // 使用背景色替代渐变
      target.style.backgroundImage = 'none';
    } else {
      target.style.backgroundImage = bgImage;
    }
  }
  
  // 递归处理子元素
  const sourceChildren = source.children;
  const targetChildren = target.children;
  
  for (let i = 0; i < sourceChildren.length; i++) {
    if (sourceChildren[i] instanceof HTMLElement && targetChildren[i] instanceof HTMLElement) {
      inlineAllStyles(
        sourceChildren[i] as HTMLElement,
        targetChildren[i] as HTMLElement
      );
    }
  }
}

/**
 * 使用纯Canvas绘制DOM元素
 */
async function renderToCanvas(
  element: HTMLElement,
  options: {
    scale: number;
    backgroundColor: string;
  }
): Promise<HTMLCanvasElement> {
  const { scale, backgroundColor } = options;
  const width = element.scrollWidth;
  const height = element.scrollHeight;
  
  // 创建canvas
  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(width * scale);
  canvas.height = Math.floor(height * scale);
  
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('无法创建Canvas上下文');
  }
  
  // 填充背景
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // 使用foreignObject方式渲染
  // 创建一个包含内联样式的克隆
  const clone = element.cloneNode(true) as HTMLElement;
  
  // 内联所有样式
  inlineAllStyles(element, clone);
  
  // 设置克隆元素的基础样式
  clone.style.cssText = `
    position: absolute;
    left: 0;
    top: 0;
    width: ${width}px;
    height: ${height}px;
    overflow: visible;
    transform-origin: top left;
  `;
  
  // 创建SVG foreignObject
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', String(canvas.width));
  svg.setAttribute('height', String(canvas.height));
  svg.innerHTML = `
    <foreignObject width="100%" height="100%">
      <div xmlns="http://www.w3.org/1999/xhtml" style="transform: scale(${scale}); transform-origin: top left;">
        ${clone.outerHTML}
      </div>
    </foreignObject>
  `;
  
  // 将SVG转换为图片
  const svgData = new XMLSerializer().serializeToString(svg);
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      resolve(canvas);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(new Error('SVG渲染失败'));
    };
    img.src = url;
  });
}

/**
 * 使用DOM截图方式导出（更可靠的方案）
 */
async function captureDOM(
  element: HTMLElement,
  options: {
    scale: number;
    backgroundColor: string;
  }
): Promise<HTMLCanvasElement> {
  const { scale, backgroundColor } = options;
  const width = element.scrollWidth;
  const height = element.scrollHeight;
  
  console.log('[captureDOM] 元素尺寸:', width, 'x', height);
  
  // 创建一个完全独立的克隆
  const wrapper = document.createElement('div');
  wrapper.style.cssText = `
    position: fixed;
    left: -10000px;
    top: 0;
    width: ${width}px;
    z-index: -9999;
    background: ${backgroundColor};
  `;
  
  const clone = element.cloneNode(true) as HTMLElement;
  clone.id = 'export-clone';
  clone.style.cssText = `
    width: ${width}px;
    height: ${height}px;
    overflow: visible;
    position: relative;
  `;
  
  // 内联所有样式
  console.log('[captureDOM] 开始内联样式...');
  inlineAllStyles(element, clone);
  console.log('[captureDOM] 样式内联完成');
  
  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);
  
  try {
    // 动态导入html2canvas，并在调用前清除样式表
    const html2canvas = (await import('html2canvas')).default;
    
    console.log('[captureDOM] 开始渲染...');
    
    const canvas = await html2canvas(clone, {
      scale,
      backgroundColor,
      useCORS: true,
      allowTaint: true,
      logging: false,
      scrollX: 0,
      scrollY: 0,
      width,
      height,
      foreignObjectRendering: false,
      removeContainer: false,
      imageTimeout: 15000,
      ignoreElements: (el) => {
        const tag = el.tagName.toLowerCase();
        return ['button', 'input', 'textarea', 'select'].includes(tag);
      },
      // 关键：在克隆后移除所有样式表
      onclone: (clonedDoc: Document, clonedElement: HTMLElement) => {
        console.log('[captureDOM] onclone回调执行');
        
        // 移除所有link样式表
        const linkStyles = clonedDoc.querySelectorAll('link[rel="stylesheet"]');
        linkStyles.forEach(link => link.remove());
        
        // 移除所有style标签
        const styleTags = clonedDoc.querySelectorAll('style');
        styleTags.forEach(style => style.remove());
        
        // 移除可能存在的class属性（只保留内联样式）
        // 注意：不完全移除class，因为某些布局可能依赖它
        // const allElements = clonedDoc.querySelectorAll('[class]');
        // allElements.forEach(el => el.removeAttribute('class'));
        
        console.log('[captureDOM] 样式表清理完成');
      },
    });
    
    console.log('[captureDOM] 渲染完成:', canvas.width, 'x', canvas.height);
    
    return canvas;
    
  } finally {
    document.body.removeChild(wrapper);
  }
}

/**
 * 将 DOM 元素导出为 PDF
 */
export async function exportToPDF(
  element: HTMLElement,
  options: ExportPDFOptions = {}
): Promise<void> {
  const {
    filename = '导出文档',
    title,
    orientation = 'portrait',
    format = 'a4',
    padding = 15,
    scale = 2,
    backgroundColor = '#ffffff',
    onProgress,
  } = options;

  console.log('[PDF导出] 开始导出:', filename);

  try {
    onProgress?.(10, '准备导出...');
    
    element.style.overflow = 'visible';
    element.style.maxHeight = 'none';

    onProgress?.(30, '生成图像...');
    
    const canvas = await captureDOM(element, { scale, backgroundColor });

    onProgress?.(60, '创建 PDF...');
    
    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format,
    });
    
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const contentWidth = pageWidth - padding * 2;
    
    const ratio = canvas.width / canvas.height;
    const imgDisplayWidth = contentWidth;
    const imgDisplayHeight = imgDisplayWidth / ratio;
    
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    
    let yOffset = padding;
    
    if (title) {
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text(title, pageWidth / 2, padding + 5, { align: 'center' });
      yOffset = padding + 15;
    }
    
    onProgress?.(80, '处理分页...');
    
    const availableHeight = pageHeight - yOffset - padding;
    
    if (imgDisplayHeight <= availableHeight) {
      pdf.addImage(imgData, 'JPEG', padding, yOffset, imgDisplayWidth, imgDisplayHeight);
    } else {
      let remainingHeight = imgDisplayHeight;
      let currentPosition = 0;
      let pageNumber = 1;
      
      while (remainingHeight > 0) {
        if (pageNumber > 1) {
          pdf.addPage();
        }
        
        const heightOnPage = Math.min(remainingHeight, pageHeight - padding * 2);
        const sourceY = (currentPosition / imgDisplayHeight) * canvas.height;
        const sourceHeight = (heightOnPage / imgDisplayHeight) * canvas.height;
        
        const croppedCanvas = document.createElement('canvas');
        croppedCanvas.width = canvas.width;
        croppedCanvas.height = Math.max(1, Math.floor(sourceHeight));
        
        const ctx = croppedCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(canvas, 0, sourceY, canvas.width, sourceHeight, 0, 0, canvas.width, sourceHeight);
          const croppedImgData = croppedCanvas.toDataURL('image/jpeg', 0.95);
          pdf.addImage(croppedImgData, 'JPEG', padding, padding, imgDisplayWidth, heightOnPage);
        }
        
        currentPosition += heightOnPage;
        remainingHeight -= heightOnPage;
        pageNumber++;
      }
    }
    
    onProgress?.(95, '保存文件...');
    pdf.save(`${filename}.pdf`);
    
    element.style.overflow = '';
    element.style.maxHeight = '';
    
    onProgress?.(100, '导出完成');
    
  } catch (error) {
    console.error('[PDF导出] 失败:', error);
    throw error;
  }
}

/**
 * 导出为图片（PNG）
 */
export async function exportToImage(
  element: HTMLElement,
  options: Omit<ExportPDFOptions, 'orientation' | 'format' | 'padding'> = {}
): Promise<void> {
  const {
    filename = '导出图片',
    scale = 2,
    backgroundColor = '#ffffff',
    onProgress,
  } = options;

  console.log('[图片导出] 开始导出:', filename);
  console.log('[图片导出] 元素:', element.scrollWidth, 'x', element.scrollHeight);

  try {
    onProgress?.(10, '准备导出...');
    
    if (element.scrollWidth === 0 || element.scrollHeight === 0) {
      throw new Error('元素内容为空，无法导出');
    }

    onProgress?.(30, '生成图像...');
    
    const canvas = await captureDOM(element, { scale, backgroundColor });

    onProgress?.(80, '保存文件...');
    
    const dataUrl = canvas.toDataURL('image/png', 1.0);
    
    if (!dataUrl || dataUrl === 'data:,') {
      throw new Error('生成图片数据失败');
    }
    
    console.log('[图片导出] 数据URL长度:', dataUrl.length);
    
    // 下载图片
    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log('[图片导出] 导出完成');
    onProgress?.(100, '导出完成');
    
  } catch (error) {
    console.error('[图片导出] 失败:', error);
    throw error;
  }
}

/**
 * 格式化日期为文件名
 */
export function formatDateFilename(prefix: string): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).replace(/\//g, '-');
  
  const timeStr = now.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  }).replace(/:/g, '-');
  
  return `${prefix}_${dateStr}_${timeStr}`;
}
