#!/usr/bin/env node
/**
 * stdin 吃一份影片內容 JSON，驗過 schema 後寫成 data/video-config.json。
 *
 * 內容（重點、程式碼、標題）由 skill 產生；這支腳本只負責兩件事：
 *   1. 把 Remotion 版面撐不住的內容擋下來（重點必須 3 條、程式碼 25 行 / 80 字元）
 *   2. 依主題關鍵字查表補上 theme —— 這是 deterministic transform，不該問模型
 *
 * 用法：node scripts/write-video-config.mjs < payload.json
 */
import fs from 'fs';
import path from 'path';

const SCENE_TYPES = ['intro', 'keypoint', 'code', 'outro'];
const TOP_LEVEL_KEYS = ['topic', 'mainTitle', 'subtitle', 'tags', 'scenes'];
const SCENE_KEYS = [
  'type',
  'title',
  'subtitle',
  'description',
  'highlights',
  'codeSnippet',
  'language',
  'durationInSeconds',
  'badge',
];

// keypoint 版面只容得下 3 條重點，第 4 條會超出畫面。
const REQUIRED_HIGHLIGHTS = 3;
// CodeCard 的 fitCodeFontSize() 下限是 11px，超過這個量級就會縮到看不清楚。
const MAX_CODE_LINES = 25;
const MAX_CODE_LINE_LENGTH = 80;

const BASE_THEME = {
  backgroundColor: '#090D16',
  textColor: '#F8FAFC',
  cardBg: 'rgba(15, 23, 42, 0.8)',
};

// 第一個命中的規則勝出，順序有意義：ios 先於 android 先於 react。
const THEME_RULES = [
  {
    name: 'ios',
    pattern: /\b(ios|swift|swiftui|iphone|ipad|xcode|apple)\b/,
    primaryColor: '#FF9F0A',
    secondaryColor: '#FF375F',
  },
  {
    name: 'android',
    pattern: /\b(android|kotlin|jetpack|compose|gradle|play\s*store)\b/,
    primaryColor: '#3DDC84',
    secondaryColor: '#059669',
  },
  {
    name: 'react',
    pattern: /\b(react|next\.?js|web|frontend|vue|javascript|typescript)\b/,
    primaryColor: '#06B6D4',
    secondaryColor: '#3B82F6',
  },
];

const DEFAULT_THEME_RULE = {
  name: 'default',
  primaryColor: '#8B5CF6',
  secondaryColor: '#3B82F6',
};

export function getThemeForTopic(topic) {
  const haystack = String(topic).toLowerCase();
  const rule = THEME_RULES.find((r) => r.pattern.test(haystack)) || DEFAULT_THEME_RULE;
  return {
    primaryColor: rule.primaryColor,
    secondaryColor: rule.secondaryColor,
    ...BASE_THEME,
  };
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function validateScene(scene, index, errors) {
  const where = `scenes[${index}]`;
  const expectedType = SCENE_TYPES[index];

  if (scene === null || typeof scene !== 'object' || Array.isArray(scene)) {
    errors.push(`${where}：必須是物件`);
    return;
  }

  for (const key of Object.keys(scene)) {
    if (!SCENE_KEYS.includes(key)) {
      errors.push(`${where}.${key}：不認識的欄位（id 由本腳本指派，不要自己給）`);
    }
  }

  if (scene.type !== expectedType) {
    errors.push(
      `${where}.type：必須是 "${expectedType}"，實際是 ${JSON.stringify(scene.type)}。` +
        `場景順序固定為 ${SCENE_TYPES.join(' → ')}`
    );
  }

  if (!isNonEmptyString(scene.title)) {
    errors.push(`${where}.title：必填，且不能是空字串`);
  }

  for (const key of ['subtitle', 'description', 'badge', 'language']) {
    if (scene[key] !== undefined && !isNonEmptyString(scene[key])) {
      errors.push(`${where}.${key}：有給就不能是空字串`);
    }
  }

  if (typeof scene.durationInSeconds !== 'number' || !(scene.durationInSeconds > 0)) {
    errors.push(`${where}.durationInSeconds：必填，且必須是大於 0 的數字`);
  }

  if (scene.type === 'keypoint') {
    validateHighlights(scene.highlights, where, errors, true);
  } else if (scene.highlights !== undefined) {
    validateHighlights(scene.highlights, where, errors, false);
  }

  if (scene.type === 'code') {
    validateCode(scene, where, errors);
  } else if (scene.codeSnippet !== undefined) {
    errors.push(`${where}.codeSnippet：只有 code 場景可以放程式碼`);
  }
}

function validateHighlights(highlights, where, errors, exactlyThree) {
  if (!Array.isArray(highlights)) {
    errors.push(`${where}.highlights：${exactlyThree ? '必填，' : ''}必須是字串陣列`);
    return;
  }
  if (exactlyThree && highlights.length !== REQUIRED_HIGHLIGHTS) {
    errors.push(
      `${where}.highlights：必須剛好 ${REQUIRED_HIGHLIGHTS} 條，實際 ${highlights.length} 條。` +
        `keypoint 版面容不下第 4 條，會超出畫面`
    );
  }
  highlights.forEach((h, i) => {
    if (!isNonEmptyString(h)) {
      errors.push(`${where}.highlights[${i}]：必須是非空字串`);
    }
  });
}

function validateCode(scene, where, errors) {
  if (!isNonEmptyString(scene.language)) {
    errors.push(`${where}.language：code 場景必填（例如 "typescript"、"swift"）`);
  }
  if (!isNonEmptyString(scene.codeSnippet)) {
    errors.push(`${where}.codeSnippet：code 場景必填`);
    return;
  }

  const lines = scene.codeSnippet.split('\n');
  if (lines.length > MAX_CODE_LINES) {
    errors.push(
      `${where}.codeSnippet：${lines.length} 行，超過上限 ${MAX_CODE_LINES} 行。` +
        `影片沒有捲軸，過長會被自動縮到看不清楚`
    );
  }
  lines.forEach((line, i) => {
    if (line.length > MAX_CODE_LINE_LENGTH) {
      errors.push(
        `${where}.codeSnippet 第 ${i + 1} 行：${line.length} 字元，` +
          `超過上限 ${MAX_CODE_LINE_LENGTH} 字元`
      );
    }
  });
}

export function buildConfig(payload, { id = `video-${Date.now()}` } = {}) {
  const errors = [];

  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new ValidationError(['最外層必須是一個 JSON 物件']);
  }

  for (const key of Object.keys(payload)) {
    if (TOP_LEVEL_KEYS.includes(key)) continue;
    if (key === 'theme') {
      errors.push('theme：配色由本腳本依主題查表決定，不要自己給');
    } else if (key === 'fps' || key === 'id') {
      errors.push(`${key}：由本腳本指派，不要自己給`);
    } else {
      errors.push(`${key}：不認識的欄位`);
    }
  }

  for (const key of ['topic', 'mainTitle', 'subtitle']) {
    if (!isNonEmptyString(payload[key])) {
      errors.push(`${key}：必填，且不能是空字串`);
    }
  }

  if (!Array.isArray(payload.tags) || payload.tags.length === 0) {
    errors.push('tags：必填，且必須是至少 1 個字串的陣列');
  } else {
    payload.tags.forEach((t, i) => {
      if (!isNonEmptyString(t)) errors.push(`tags[${i}]：必須是非空字串`);
    });
  }

  if (!Array.isArray(payload.scenes)) {
    errors.push('scenes：必填，且必須是陣列');
  } else if (payload.scenes.length !== SCENE_TYPES.length) {
    errors.push(
      `scenes：必須剛好 ${SCENE_TYPES.length} 個場景（${SCENE_TYPES.join(' → ')}），` +
        `實際 ${payload.scenes.length} 個`
    );
  } else {
    payload.scenes.forEach((scene, i) => validateScene(scene, i, errors));
  }

  if (errors.length > 0) {
    throw new ValidationError(errors);
  }

  return {
    id,
    topic: payload.topic,
    mainTitle: payload.mainTitle,
    subtitle: payload.subtitle,
    tags: payload.tags,
    fps: 30,
    theme: getThemeForTopic(payload.topic),
    scenes: payload.scenes.map((scene, i) => ({ id: `scene-${i + 1}`, ...scene })),
  };
}

export class ValidationError extends Error {
  constructor(errors) {
    super(errors.join('\n'));
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);
  });
}

async function main() {
  const raw = await readStdin();

  if (raw.trim().length === 0) {
    console.error('❌ stdin 是空的。用法：node scripts/write-video-config.mjs < payload.json');
    process.exit(1);
  }

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch (err) {
    console.error(`❌ stdin 不是合法的 JSON：${err.message}`);
    process.exit(1);
  }

  let config;
  try {
    config = buildConfig(payload);
  } catch (err) {
    if (!(err instanceof ValidationError)) throw err;
    console.error(`❌ 影片內容不合格，共 ${err.errors.length} 個問題：`);
    for (const message of err.errors) {
      console.error(`   • ${message}`);
    }
    process.exit(1);
  }

  const outputDir = path.join(process.cwd(), 'data');
  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, 'video-config.json');
  fs.writeFileSync(outputPath, `${JSON.stringify(config, null, 2)}\n`, 'utf-8');

  console.log(`✅ 已寫入 ${outputPath}`);
  console.log(`   主題: ${config.topic}`);
  console.log(`   配色: ${config.theme.primaryColor} → ${config.theme.secondaryColor}`);
  config.scenes.forEach((scene, i) => {
    console.log(`   [${i + 1}] ${scene.type.padEnd(8)} ${scene.durationInSeconds}s  ${scene.title}`);
  });
  console.log('\n下一步：npm run video:preview');
}

// 被 import 當模組用時不要執行 main()（測試會 import buildConfig / getThemeForTopic）。
if (process.argv[1] && process.argv[1].endsWith('write-video-config.mjs')) {
  main().catch((err) => {
    console.error(`❌ ${err.stack || err.message}`);
    process.exit(1);
  });
}
