import type { PetApi } from "../shared/types";
import type { SettingsApi } from "../shared/settings-api";

declare global {
  interface Window {
    /** 由 preload 通过 contextBridge 注入 */
    pet: PetApi;
    /** 设置类请求-响应接口（桌宠窗口只用其中的 chatSend） */
    api: SettingsApi;
  }
}


export {};
