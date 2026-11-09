#!/usr/bin/env node
/**
 * 列出问题池里的待修条目，按严重度排序。
 *
 * 用法：pnpm issues        只列待修的
 *       pnpm issues --all  全部列出
 *       pnpm issues P0     只看 P0
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const file = join(root, "docs/testing/issues.md");

const text = readFileSync(file, "utf8");
const args = process.argv.slice(2);
const showAll = args.includes("--all");
const onlyLevel = args.find((a) => /^P[0-3]$/.test(a));

/** 按 "### BUG-001 标题" 切块；跳过代码块里的示例 */
const blocks = [];
const lines = text.split(/\r?\n/);
let current = null;
let inFence = false;

for (const line of lines) {
  if (/^```/.test(line)) {
    inFence = !inFence;
    continue;
  }
  if (inFence) continue;

  const head = line.match(/^###\s+(BUG-\d+)\s+(.+)$/);
  if (head) {
    current = { id: head[1], title: head[2].trim(), fields: {} };
    blocks.push(current);
    continue;
  }
  if (current) {
    const field = line.match(/^-\s+\*\*(.+?)\*\*[：:]\s*(.*)$/);
    if (field) current.fields[field[1].trim()] = field[2].trim();
  }
}

const issues = blocks.map((b) => ({
  id: b.id,
  title: b.title,
  level: (b.fields["严重度"] ?? "P3").match(/P[0-3]/)?.[0] ?? "P3",
  status: b.fields["状态"] ?? "⬜ 待修",
  who: b.fields["发现"] ?? "",
}));

const open = issues.filter((i) => !i.status.includes("已修") && !i.status.includes("不修"));

const pool = showAll ? issues : open;
const filtered = onlyLevel ? pool.filter((i) => i.level === onlyLevel) : pool;

const order = { P0: 0, P1: 1, P2: 2, P3: 3 };
filtered.sort((a, b) => order[a.level] - order[b.level] || a.id.localeCompare(b.id));

const count = (level) => issues.filter((i) => i.level === level && open.includes(i)).length;

console.log("");
console.log(`问题池：共 ${issues.length} 条，待修 ${open.length} 条`);
console.log(`        待修 P0 ${count("P0")} · P1 ${count("P1")} · P2 ${count("P2")} · P3 ${count("P3")}`);
console.log("");

if (filtered.length === 0) {
  console.log("  （没有符合条件的条目）");
} else {
  for (const i of filtered) {
    const mark = i.status.replace(/\s+/g, " ").trim();
    console.log(`  ${i.level}  ${i.id}  ${i.title}`);
    console.log(`        ${mark}`);
  }
}

console.log("");
console.log(`详见 ${file}`);
console.log("");

if (count("P0") > 0) {
  console.log("⚠️  有 P0 未修，先处理它们。");
  console.log("");
  process.exitCode = 1;
}
