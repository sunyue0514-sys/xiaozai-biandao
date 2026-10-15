'use client';

import { useState, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Download, Loader2, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

interface PosterGeneratorProps {
  agentPath: string;
  trigger?: React.ReactNode;
}

/**
 * 推广海报生成组件
 */
export function SimplePosterGenerator({ agentPath, trigger }: PosterGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const getDomain = useCallback(() => {
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return process.env.NEXT_PUBLIC_DOMAIN || 'https://example.com';
  }, []);

  const referralUrl = `${getDomain()}/login?ref=${agentPath}`;

  const svgToImage = useCallback((svgElement: SVGSVGElement): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('SVG 转图片失败'));
      };
      img.src = url;
    });
  }, []);

  const generateQRCodeImage = useCallback(async (url: string, size: number): Promise<HTMLImageElement> => {
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    document.body.appendChild(container);

    const root = createRoot(container);
    
    return new Promise((resolve, reject) => {
      root.render(
        <QRCodeSVG 
          value={url}
          size={size}
          level="H"
          includeMargin={false}
          bgColor="white"
          fgColor="black"
        />
      );

      setTimeout(async () => {
        const svgElement = container.querySelector('svg');
        if (!svgElement) {
          document.body.removeChild(container);
          reject(new Error('二维码 SVG 生成失败'));
          return;
        }

        try {
          const img = await svgToImage(svgElement);
          document.body.removeChild(container);
          resolve(img);
        } catch (error) {
          document.body.removeChild(container);
          reject(error);
        }
      }, 100);
    });
  }, [svgToImage]);

  const roundRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ) => {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  };

  const generatePoster = useCallback(async () => {
    setIsLoading(true);
    
    try {
      const canvas = canvasRef.current;
      if (!canvas) throw new Error('Canvas 初始化失败');

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context 初始化失败');

      // 加载底图
      const bgImage = new Image();
      bgImage.crossOrigin = 'anonymous';
      
      await new Promise<void>((resolve, reject) => {
        bgImage.onload = () => resolve();
        bgImage.onerror = () => reject(new Error('底图加载失败'));
        bgImage.src = `/images/poster-bg.svg?t=${Date.now()}`;
      });

      canvas.width = bgImage.width;
      canvas.height = bgImage.height;
      ctx.drawImage(bgImage, 0, 0);

      // 二维码尺寸：22% 宽度
      const qrSize = Math.floor(canvas.width * 0.22);
      
      // 二维码白色背景的内边距
      const qrPadding = Math.floor(qrSize * 0.08);
      
      // 二维码白色背景尺寸
      const qrBgSize = qrSize + qrPadding * 2;
      
      // 链接文字高度
      const textHeight = Math.floor(canvas.height * 0.025);
      
      // 二维码和文字之间的间距
      const gap = Math.floor(canvas.height * 0.012);

      // 二维码位置（水平居中）
      const qrBgX = (canvas.width - qrBgSize) / 2;
      
      // 链接文字位置（贴近底部，只留很小边距）
      const textY = canvas.height - textHeight / 2 - Math.floor(canvas.height * 0.008);
      
      // 二维码位置（在文字上方）
      const qrBgY = textY - textHeight / 2 - gap - qrBgSize;
      const qrX = qrBgX + qrPadding;
      const qrY = qrBgY + qrPadding;

      // 生成二维码图片
      const qrImage = await generateQRCodeImage(referralUrl, qrSize);

      // 绘制二维码白色背景（圆角）
      ctx.fillStyle = 'white';
      roundRect(ctx, qrBgX, qrBgY, qrBgSize, qrBgSize, 12);
      ctx.fill();

      // 绘制二维码
      ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);

      // 绘制链接文字（黑色，无背景，一行）
      let fontSize = Math.floor(canvas.width * 0.028);
      ctx.font = `bold ${fontSize}px Arial, sans-serif`;
      
      // 如果文字太长，缩小字体
      const maxWidth = canvas.width * 0.9;
      while (ctx.measureText(referralUrl).width > maxWidth && fontSize > 12) {
        fontSize -= 1;
        ctx.font = `bold ${fontSize}px Arial, sans-serif`;
      }
      
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(referralUrl, canvas.width / 2, textY);

      // 转换为图片
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      setPosterUrl(dataUrl);
      toast.success('海报生成成功');
    } catch (error) {
      console.error('[海报生成] 错误:', error);
      toast.error(error instanceof Error ? error.message : '海报生成失败');
    } finally {
      setIsLoading(false);
    }
  }, [referralUrl, generateQRCodeImage]);

  const handleDownload = useCallback(() => {
    if (!posterUrl) return;
    
    const link = document.createElement('a');
    link.download = `推广海报_${agentPath}.jpg`;
    link.href = posterUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('海报已下载');
  }, [posterUrl, agentPath]);

  const handleOpenChange = useCallback((open: boolean) => {
    setIsOpen(open);
    if (open && !posterUrl) {
      setTimeout(generatePoster, 100);
    }
  }, [posterUrl, generatePoster]);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <ImageIcon className="w-4 h-4 mr-2" />
            生成海报
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>推广海报</DialogTitle>
          <DialogDescription>扫描二维码或访问链接即可推广</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="relative aspect-[3/4] bg-muted rounded-lg overflow-hidden flex items-center justify-center">
            {isLoading && (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">正在生成海报...</span>
              </div>
            )}
            
            {posterUrl && !isLoading && (
              <img src={posterUrl} alt="推广海报" className="w-full h-full object-contain" />
            )}

            {!posterUrl && !isLoading && (
              <Button onClick={generatePoster}>生成海报</Button>
            )}
          </div>

          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">推广链接：</p>
            <p className="text-sm font-mono break-all select-all">{referralUrl}</p>
          </div>

          <div className="flex gap-2">
            <Button onClick={generatePoster} disabled={isLoading} variant="outline" className="flex-1">
              {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              重新生成
            </Button>
            <Button onClick={handleDownload} disabled={!posterUrl || isLoading} className="flex-1">
              <Download className="w-4 h-4 mr-2" />
              下载海报
            </Button>
          </div>
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </DialogContent>
    </Dialog>
  );
}

export default SimplePosterGenerator;
