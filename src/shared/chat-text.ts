/**
 * 聊天回复长度器（P2-7 7d）。
 *
 * 为什么单独一个文件：这段逻辑要能单测，而 `main/chat.ts` 依赖 electron，测不了。
 *
 * 老实现是 `slice(0, 60)`：中文能到 40+ 字，气泡一行放不下，
 * 而且经常切在半个词上（"…那我们就一起摸会儿" / "鱼吧"）。
 */

/** 气泡里一句话最多多少字符 */
export const REPLY_MAX_CHARS = 20;

/** 可以作为截断点的标点（切在它**后面**） */
const END_PUNCT = ["，", "。", "！", "？", "、", "；", ",", ".", "!", "?", "~", "～"];

/**
 * 把回复压成一行并限长：
 * 1. 先把换行 / 连续空白压成一个空格
 * 2. 不超过 max 就原样返回
 * 3. 超长时优先切在最近的标点后面（标点要保留）
 * 4. 没有合适标点（或标点太靠前）就硬切 + 省略号
 */
export function clipReply(text: string, max: number = REPLY_MAX_CHARS): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  if (oneLine.length <= max) return oneLine;

  const head = oneLine.slice(0, max);

  // 从后往前找最近的标点：越靠后保留的信息越多
  let cut = -1;
  for (let index = head.length - 1; index >= 0; index -= 1) {
    if (END_PUNCT.includes(head[index])) {
      cut = index + 1;
      break;
    }
  }

  // 标点后面只剩一两个字（比如「好，……」）会显得很怪，那就干脆硬切
  if (cut >= Math.ceil(max / 2)) return head.slice(0, cut).trim();

  return `${head.trim()}…`;
}
