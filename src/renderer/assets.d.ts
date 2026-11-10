// 这个文件不能有顶层 import/export，否则 declare module 会变成模块扩展而失效。

declare module "*.png" {
  const src: string;
  export default src;
}

declare module "*.webp" {
  const src: string;
  export default src;
}

// 音效文件（C2）：Vite 会把它们转成 URL 字符串
declare module "*.wav" {
  const src: string;
  export default src;
}

declare module "*.ogg" {
  const src: string;
  export default src;
}

declare module "*.mp3" {
  const src: string;
  export default src;
}

declare module "*.css" {
  const content: string;
  export default content;
}
