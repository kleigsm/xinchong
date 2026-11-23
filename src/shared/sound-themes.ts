/**
 * 音效主题的 id 与显示名。
 *
 * 单独放 shared 里，是为了让设置面板能列出选项，**不用引入 40 个音频文件**。
 * 真正的音频 URL 在 `src/renderer/sound-packs.ts`。
 *
 * P2-11：除了内置主题，用户还可以导入自己的音效包，id 形如 `user:<包id>`。
 */

/** "personality" = 跟随当前角色的性格音效 */
export type BuiltinSoundTheme = "personality" | "dog" | "cat" | "bird" | "pig";

/** 设置项里存的值：内置主题，或用户导入的包 `user:<id>` */
export type SoundTheme = BuiltinSoundTheme | `user:${string}`;

export const SOUND_THEMES: Array<{ id: BuiltinSoundTheme; label: string }> = [
  { id: "personality", label: "跟随性格" },
  { id: "dog", label: "狗狗" },
  { id: "cat", label: "猫咪" },
  { id: "bird", label: "小鸟" },
  { id: "pig", label: "小猪" },
];

export function isUserSoundTheme(theme: string): theme is `user:${string}` {
  return theme.startsWith("user:");
}

/** `user:my-pack` → `my-pack`；不是用户包就返回 null */
export function userSoundId(theme: string): string | null {
  return isUserSoundTheme(theme) ? theme.slice("user:".length) : null;
}
