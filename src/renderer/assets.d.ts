// 这个文件不能有顶层 import/export，否则 declare module 会变成模块扩展而失效。

declare module "*.png" {
  const src: string;
  export default src;
}

declare module "*.css" {
  const content: string;
  export default content;
}
