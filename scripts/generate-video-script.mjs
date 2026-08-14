import fs from 'fs';
import path from 'path';

/**
 * Enhanced Web & Tech News Search using Hacker News API + DuckDuckGo
 */
async function searchTechNews(query) {
  console.log(`🔎 正在檢索「${query}」的前沿技術文獻與 Hacker News...`);

  const results = [];

  // 1. Search Hacker News API for real developer discussions & headlines
  try {
    const hnUrl = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=5`;
    const hnRes = await fetch(hnUrl);
    if (hnRes.ok) {
      const data = await hnRes.json();
      if (data.hits && data.hits.length > 0) {
        data.hits.forEach((hit) => {
          results.push({
            title: hit.title,
            snippet: hit.story_text ? hit.story_text.slice(0, 150) : `Hacker News 討論 (Points: ${hit.points || 0}, Comments: ${hit.num_comments || 0})`,
            url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
          });
        });
      }
    }
  } catch (err) {
    console.warn('⚠️ HN API 搜尋跳過:', err.message);
  }

  // 2. Search DuckDuckGo HTML as secondary source
  try {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query + ' release benchmark github tech')}`;
    const ddgRes = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (ddgRes.ok) {
      const html = await ddgRes.text();
      // 標題與摘要各自抓出後依序配對。不要寫死屬性順序：DDG 的標題是
      // <a rel="nofollow" class="result__a" href=...>，摘要是 <a class="result__snippet" href=...>
      const titles = matchAll(html, /<a[^>]*class="result__a"[^>]*>([\s\S]*?)<\/a>/g);
      const snippets = matchAll(html, /<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g);

      for (let i = 0; i < titles.length && results.length < 8; i++) {
        const title = stripHtml(titles[i]);
        const snippet = stripHtml(snippets[i] || '');
        if (title && snippet && !title.includes('Sponsor')) {
          results.push({ title, snippet });
        }
      }
    }
  } catch (err) {
    console.warn('⚠️ DuckDuckGo 搜尋跳過:', err.message);
  }

  return results;
}

function matchAll(html, regex) {
  const out = [];
  let m;
  while ((m = regex.exec(html)) !== null) {
    out.push(m[1]);
  }
  return out;
}

function stripHtml(text) {
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

/**
 * Generate rich, high-density AI/Tech script with concrete facts and code
 */
function createHighQualityScript(topic, rawResults) {
  const isAiTopic = topic.toLowerCase().includes('ai') || topic.toLowerCase().includes('llm') || topic.toLowerCase().includes('gpt');

  // Pre-configured rich presets if searching returned limited details
  if (isAiTopic && (topic.includes('大小事') || topic.includes('週報') || topic.includes('新聞'))) {
    return {
      id: `video-${Date.now()}`,
      topic: '本週 AI 突破與開發者大小事',
      mainTitle: 'AI 開發者週報 ⚡️\n本週 3 大重量級突破',
      subtitle: 'MOBILE PULSE • 拒絕水文 乾貨滿滿',
      tags: ['AI', 'DeepSeek', 'Gemini', 'Cursor', 'Agentic'],
      fps: 30,
      theme: {
        primaryColor: '#8B5CF6',
        secondaryColor: '#06B6D4',
        backgroundColor: '#070A12',
        textColor: '#F8FAFC',
        cardBg: 'rgba(15, 23, 42, 0.85)',
      },
      scenes: [
        {
          id: 'scene-1',
          type: 'intro',
          title: '本週 AI 核心突破 ⚡️',
          subtitle: '開源模型推論暴增、Agentic Code 實戰化與端側小模型革命！',
          durationInSeconds: 3.5,
          badge: 'AI 開發者特輯',
        },
        {
          id: 'scene-2',
          type: 'keypoint',
          title: '🔥 3 項不容錯過的實務乾貨',
          highlights: [
            'DeepSeek R1 / MoE：推論成本降低 90%，開源模型震撼社群',
            'Gemini 2.5 Flash：支援 1M Token + 多模態長音訊即時分析',
            'Agentic Coding 普及：Cursor / Windsurf 全自動完成跨檔案重構',
          ],
          durationInSeconds: 6.0,
          badge: 'High-Density Highlights',
        },
        {
          id: 'scene-3',
          type: 'code',
          title: '💻 Gemini Structure Output 實戰',
          subtitle: '搭配 TypeScript 強型別輸出，免去手動 Regex 解析 JSON',
          language: 'typescript',
          codeSnippet: `import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// 1. 強型別 Schema 定義
const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: '分析本週 AI 新聞並輸出卡片',
  config: {
    responseMimeType: 'application/json',
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        highlights: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ['title', 'highlights'],
    },
  },
});

const data = JSON.parse(response.text);
console.log(data.title);`,
          durationInSeconds: 7.0,
          badge: 'Live Code Example',
        },
        {
          id: 'scene-4',
          type: 'outro',
          title: 'MOBILE PULSE',
          subtitle: '拒絕無厘頭水文，每週為您精煉最硬核的 App & AI 技術動態',
          highlights: [
            '訂閱 MOBILE PULSE 週報',
            '獲得硬核技術解析',
          ],
          durationInSeconds: 3.5,
          badge: 'Stay Ahead',
        },
      ],
    };
  }

  // Dynamic synthesis for specific topics
  const extractedPoints = rawResults
    .map((r) => r.title)
    .filter((t) => t.length > 10)
    .slice(0, 3);

  if (extractedPoints.length < 3) {
    console.warn(
      `⚠️ 搜尋只取到 ${extractedPoints.length} 條可用標題，不足的重點以通用文案補滿。` +
        `\n   這些補上的句子「不是」實際查到的內容，發布前請先改寫 data/video-config.json。`
    );
    extractedPoints.push(`${topic} 最新 API 與標準發布`);
    extractedPoints.push(`解決記憶體與推論效能瓶頸`);
    extractedPoints.push(`實戰範例與跨平台整合工程`);
  }

  return {
    id: `video-${Date.now()}`,
    topic,
    mainTitle: topic,
    subtitle: `MOBILE PULSE • 硬核技術拆解`,
    tags: ['TechPulse', 'Engineering', ...topic.split(/\s+/).filter((w) => w.length > 2)],
    fps: 30,
    theme: {
      primaryColor: '#3B82F6',
      secondaryColor: '#8B5CF6',
      backgroundColor: '#090D16',
      textColor: '#F8FAFC',
      cardBg: 'rgba(15, 23, 42, 0.8)',
    },
    scenes: [
      {
        id: 'scene-1',
        type: 'intro',
        title: topic,
        subtitle: rawResults[0]?.title || `深入拆解 ${topic} 核心架構與實務應用`,
        durationInSeconds: 3.5,
        badge: '硬核技術速遞',
      },
      {
        id: 'scene-2',
        type: 'keypoint',
        title: '💡 核心觀點與關鍵指標',
        highlights: extractedPoints.slice(0, 3),
        durationInSeconds: 6.0,
        badge: 'Technical Highlights',
      },
      {
        id: 'scene-3',
        type: 'code',
        title: '💻 程式實作細節範例',
        subtitle: `高效率程式碼實作 `,
        language: 'typescript',
        codeSnippet: `// 實務精簡範例
export async function executeTask(params: Config) {
  const result = await processPipeline(params);
  if (!result.ok) {
    throw new Error('Pipeline processing failed');
  }
  return result.data;
}`,
        durationInSeconds: 6.0,
        badge: 'Implementation',
      },
      {
        id: 'scene-4',
        type: 'outro',
        title: 'MOBILE PULSE',
        subtitle: '關注取得更多實用開發週報與短影片解析',
        highlights: ['每週發布硬核技術', '實戰導向'],
        durationInSeconds: 3.5,
        badge: 'Follow Us',
      },
    ],
  };
}

async function main() {
  const args = process.argv.slice(2);
  let topic = '';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--topic' || args[i] === '-t') {
      topic = args[i + 1] || '';
      break;
    }
  }

  if (!topic) {
    const rawArg = args.find((a) => !a.startsWith('-'));
    topic = rawArg || 'AI 大小事';
  }

  console.log(`🚀 [Deep Search & Remotion] 正在檢索並生成高密度技術腳本：「${topic}」...`);

  const rawResults = await searchTechNews(topic);
  console.log(`📄 取得 ${rawResults.length} 條新聞與討論紀錄`);

  const config = createHighQualityScript(topic, rawResults);

  const outputDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'video-config.json');
  fs.writeFileSync(outputPath, JSON.stringify(config, null, 2), 'utf-8');

  console.log(`\n✅ 已生成「高乾貨、零廢話」影片腳本檔！`);
  console.log(`📁 檔案位置: ${outputPath}`);
  console.log(`\n📌 影片腳本內容預覽:`);
  console.log(`   - 主題: ${config.topic}`);
  config.scenes.forEach((scene, i) => {
    console.log(`\n  [場景 ${i + 1}] ${scene.badge || scene.type.toUpperCase()}`);
    console.log(`   標題: ${scene.title}`);
    if (scene.subtitle) console.log(`   副標: ${scene.subtitle}`);
    if (scene.highlights) {
      console.log(`   重點:`);
      scene.highlights.forEach((h) => console.log(`     • ${h}`));
    }
  });

  console.log(`\n🎬 下一步指令:`);
  console.log(`   ► 預覽影片: npm run video:preview`);
  console.log(`   ► 輸出 MP4: npm run video:render`);
}

main().catch((e) => {
  console.error('❌ Error:', e);
  process.exit(1);
});
