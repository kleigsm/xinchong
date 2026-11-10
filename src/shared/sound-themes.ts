/**
 * 音效主题的 id 与显示名。
 *
 * 单独放 shared 里，是为了让设置面板能列出选项而**不用引入 40 个音频文件**。
 * 真正的音频 URL 在 `src/renderer/sound-packs.ts`。
 */

/** "personality" = 跟随当前角色的性格音效 */
export type SoundTheme = "personality" | "dog" | "cat" | "bird" | "pig";

export const SOUND_THEMES: Array<{ id: SoundTheme; label: string }> = [
  { id: "personality", label: "跟随性格" },
  { id: "dog", label: "狗狗" },
  { id: "cat", label: "猫咪" },
  { id: "bird", label: "小鸟" },
  { id: "pig", label: "小猪" },
];
