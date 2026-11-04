/**
 * 性格列表：主进程（托盘菜单）和渲染层（角色包映射）共用。
 * 加新性格时，这里加一条，再在 renderer/pets 里加一个角色包即可。
 */
export const PERSONALITIES = [
  { id: "shy", label: "害羞" },
  { id: "cheerful", label: "开朗" },
  { id: "tsundere", label: "傲娇" },
] as const;

export type PersonalityId = (typeof PERSONALITIES)[number]["id"];

export const DEFAULT_PERSONALITY: PersonalityId = "shy";

export function isPersonalityId(value: string): value is PersonalityId {
  return PERSONALITIES.some((p) => p.id === value);
}
