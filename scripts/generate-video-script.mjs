#!/usr/bin/env node
/**
 * `npm run video:create -- --topic "主題"` 的入口。
 *
 * 這支腳本本身不產生任何內容 —— 它只是 writing-short-video-script skill 的
 * headless 包裝。流程（查資料、寫四個場景、餵給驗證腳本）唯一的來源是
 * .claude/skills/writing-short-video-script/SKILL.md，這裡不要再複製一份。
 *
 * 互動式使用時直接叫 skill 即可，不必經過這支腳本。
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const CONFIG_PATH = path.join(process.cwd(), 'data', 'video-config.json');

const ALLOWED_TOOLS = [
  'WebSearch',
  'WebFetch',
  'Read',
  'Write',
  'Bash(node scripts/write-video-config.mjs:*)',
];

function parseTopic(args) {
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--topic' || args[i] === '-t') {
      return args[i + 1] || '';
    }
  }
  return args.find((a) => !a.startsWith('-')) || '';
}

function readConfigSnapshot() {
  try {
    return fs.readFileSync(CONFIG_PATH, 'utf-8');
  } catch {
    return null;
  }
}

function main() {
  const topic = parseTopic(process.argv.slice(2));

  if (!topic) {
    console.error('❌ 請指定主題：npm run video:create -- --topic "SwiftUI Observable"');
    process.exit(1);
  }

  const prompt =
    `使用 writing-short-video-script skill，為主題「${topic}」產生短影片內容，` +
    `並依 skill 的流程寫入 data/video-config.json。` +
    `查不到足夠資料時直接說明缺什麼，不要用通用文案補滿。`;

  console.log(`🚀 交給 writing-short-video-script skill 處理：「${topic}」`);

  const before = readConfigSnapshot();

  const result = spawnSync(
    'claude',
    ['-p', prompt, '--permission-mode', 'acceptEdits', '--allowedTools', ...ALLOWED_TOOLS],
    { stdio: 'inherit', cwd: process.cwd() }
  );

  if (result.error?.code === 'ENOENT') {
    console.error(
      '\n❌ 找不到 claude CLI。這支腳本是 skill 的 headless 包裝，需要 claude 在 PATH 上。' +
        '\n   互動式使用請直接叫 writing-short-video-script skill。'
    );
    process.exit(1);
  }

  if (result.error) {
    console.error(`\n❌ 執行 claude 失敗：${result.error.message}`);
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(`\n❌ claude 以 exit code ${result.status} 結束，影片內容未更新。`);
    process.exit(result.status ?? 1);
  }

  // exit 0 不代表真的寫了檔 —— skill 查不到資料時會回報並停手，這也是 exit 0。
  const after = readConfigSnapshot();
  if (after === null || after === before) {
    console.error(
      `\n❌ ${CONFIG_PATH} 沒有被更新。` +
        '\n   多半是 skill 查不到足夠資料而停手（上面應該有說明），影片內容維持原樣。'
    );
    process.exit(1);
  }

  console.log(`\n✅ 影片內容已更新：${CONFIG_PATH}`);
  console.log('   下一步：npm run video:preview');
}

main();
