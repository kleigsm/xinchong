import type { PetApi } from "../shared/types";

declare global {
  interface Window {
    /** 由 preload 通过 contextBridge 注入 */
    pet: PetApi;
  }
}

declare module "*.css" {
  const content: string;
  export default content;
}

export {};
