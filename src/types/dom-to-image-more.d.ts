declare module 'dom-to-image-more' {
  export interface Options {
    width?: number;
    height?: number;
    quality?: number;
    scale?: number;
    backgroundColor?: string;
    style?: Partial<CSSStyleDeclaration>;
    filter?: (node: Node) => boolean;
    cacheBust?: boolean;
    imagePlaceholder?: string;
  }

  export function toPng(node: Node, options?: Options): Promise<string>;
  export function toJpeg(node: Node, options?: Options): Promise<string>;
  export function toBlob(node: Node, options?: Options): Promise<Blob>;
  export function toSvg(node: Node, options?: Options): Promise<string>;
  export function toPixelData(node: Node, options?: Options): Promise<Uint8ClampedArray>;
}
