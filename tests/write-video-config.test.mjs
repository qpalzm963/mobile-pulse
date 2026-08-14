import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  ValidationError,
  buildConfig,
  getThemeForTopic,
} from "../scripts/write-video-config.mjs";

const scriptPath = fileURLToPath(new URL("../scripts/write-video-config.mjs", import.meta.url));

function validPayload(overrides = {}) {
  return {
    topic: "SwiftUI Observable",
    mainTitle: "SwiftUI 的新觀察機制",
    subtitle: "MOBILE PULSE • 硬核技術拆解",
    tags: ["SwiftUI", "iOS"],
    scenes: [
      { type: "intro", title: "片頭", durationInSeconds: 3.5 },
      {
        type: "keypoint",
        title: "重點",
        highlights: ["第一條", "第二條", "第三條"],
        durationInSeconds: 6,
      },
      {
        type: "code",
        title: "範例",
        language: "swift",
        codeSnippet: "@Observable\nfinal class Model {\n  var count = 0\n}",
        durationInSeconds: 6,
      },
      { type: "outro", title: "MOBILE PULSE", durationInSeconds: 3.5 },
    ],
    ...overrides,
  };
}

/** 取出驗證錯誤陣列，順便斷言「真的擋下來了」而不是靜靜放行。 */
function errorsFrom(payload) {
  try {
    buildConfig(payload);
  } catch (err) {
    assert.ok(err instanceof ValidationError, `預期 ValidationError，實際 ${err}`);
    return err.errors;
  }
  assert.fail("預期驗證失敗，但 buildConfig 放行了");
}

test("合格的內容會補上 id / fps / theme / 場景 id，其餘原封不動", () => {
  const config = buildConfig(validPayload(), { id: "video-fixed" });

  // Root.tsx 直接 import 這份 JSON 當 VideoConfig 用，這幾個欄位少一個就編譯不過。
  assert.equal(config.id, "video-fixed");
  assert.equal(config.fps, 30);
  assert.deepEqual(
    config.scenes.map((s) => s.id),
    ["scene-1", "scene-2", "scene-3", "scene-4"]
  );
  assert.equal(config.mainTitle, "SwiftUI 的新觀察機制");
  assert.equal(config.scenes[1].highlights.length, 3);
  assert.ok(config.theme.primaryColor.startsWith("#"));
});

test("缺必填欄位時，錯誤訊息要指名是哪一欄", () => {
  const payload = validPayload();
  delete payload.mainTitle;
  payload.subtitle = "   ";

  const errors = errorsFrom(payload);
  assert.ok(errors.some((e) => e.startsWith("mainTitle：")), errors.join("\n"));
  // 只有空白的字串等同沒填 —— 影片上會開天窗，不能當有效值放行。
  assert.ok(errors.some((e) => e.startsWith("subtitle：")), errors.join("\n"));
});

test("場景型別與順序固定，錯了就擋下來", () => {
  // 版面元件是按 type 分派的，順序錯掉會渲染出不對的場景而不是報錯。
  const wrongType = validPayload();
  wrongType.scenes[2].type = "quiz";
  assert.ok(errorsFrom(wrongType).some((e) => e.includes("scenes[2].type")));

  const swapped = validPayload();
  [swapped.scenes[1], swapped.scenes[2]] = [swapped.scenes[2], swapped.scenes[1]];
  assert.ok(errorsFrom(swapped).some((e) => e.includes(".type")));

  const tooFew = validPayload();
  tooFew.scenes = tooFew.scenes.slice(0, 3);
  assert.ok(errorsFrom(tooFew).some((e) => e.startsWith("scenes：")));
});

test("重點不是剛好 3 條就擋下來 —— 第 4 條會超出 keypoint 版面", () => {
  const fourPoints = validPayload();
  fourPoints.scenes[1].highlights = ["一", "二", "三", "四"];
  assert.ok(
    errorsFrom(fourPoints).some((e) => e.includes("剛好 3 條")),
    "4 條重點必須被擋下"
  );

  const twoPoints = validPayload();
  twoPoints.scenes[1].highlights = ["一", "二"];
  assert.ok(errorsFrom(twoPoints).some((e) => e.includes("剛好 3 條")));

  const missing = validPayload();
  delete missing.scenes[1].highlights;
  assert.ok(errorsFrom(missing).some((e) => e.includes("highlights")));
});

test("程式碼超過 25 行或單行超過 80 字元就擋下來 —— 影片沒有捲軸", () => {
  const tooLong = validPayload();
  tooLong.scenes[2].codeSnippet = Array.from({ length: 26 }, (_, i) => `let x${i} = 0`).join("\n");
  assert.ok(
    errorsFrom(tooLong).some((e) => e.includes("超過上限 25 行")),
    "26 行必須被擋下"
  );

  const tooWide = validPayload();
  tooWide.scenes[2].codeSnippet = `let veryLongName = ${"a".repeat(80)}`;
  const errors = errorsFrom(tooWide);
  assert.ok(errors.some((e) => e.includes("第 1 行") && e.includes("80 字元")), errors.join("\n"));

  // 邊界：剛好 25 行 / 80 字元要放行，否則 skill 會被無謂地卡住。
  const atLimit = validPayload();
  atLimit.scenes[2].codeSnippet = Array.from({ length: 25 }, () => "x".repeat(80)).join("\n");
  assert.doesNotThrow(() => buildConfig(atLimit));
});

test("payload 不准自己帶 theme / fps / id —— 那是程式的職責", () => {
  const errors = errorsFrom(
    validPayload({ theme: { primaryColor: "#FFFFFF" }, fps: 60, id: "custom" })
  );
  assert.ok(errors.some((e) => e.startsWith("theme：")), errors.join("\n"));
  assert.ok(errors.some((e) => e.startsWith("fps：")));
  assert.ok(errors.some((e) => e.startsWith("id：")));
});

test("配色依主題關鍵字查表，不靠模型判斷", () => {
  const purple = getThemeForTopic("量子運算入門").primaryColor;
  assert.equal(getThemeForTopic("SwiftUI 6 有什麼新東西").primaryColor, "#FF9F0A");
  assert.equal(getThemeForTopic("Jetpack Compose 效能").primaryColor, "#3DDC84");
  assert.equal(getThemeForTopic("React Server Components").primaryColor, "#06B6D4");
  assert.equal(purple, "#8B5CF6");

  // 用詞邊界比對，"axios" 不該被當成 iOS 主題。
  assert.equal(getThemeForTopic("axios 攔截器實戰").primaryColor, purple);

  // 背景與卡片底色是共用的，只有漸層兩色隨主題變。
  assert.equal(getThemeForTopic("SwiftUI").backgroundColor, getThemeForTopic("Vue").backgroundColor);
});

test("CLI：合格內容寫出檔案並 exit 0，不合格 exit 1 並在 stderr 指出欄位", () => {
  const workDir = mkdtempSync(path.join(tmpdir(), "video-config-"));
  try {
    const ok = spawnSync("node", [scriptPath], {
      input: JSON.stringify(validPayload()),
      cwd: workDir,
      encoding: "utf-8",
    });
    assert.equal(ok.status, 0, ok.stderr);
    const written = JSON.parse(readFileSync(path.join(workDir, "data", "video-config.json"), "utf-8"));
    assert.equal(written.fps, 30);
    assert.equal(written.scenes.length, 4);

    const bad = validPayload();
    bad.scenes[1].highlights = ["只有一條"];
    const failed = spawnSync("node", [scriptPath], {
      input: JSON.stringify(bad),
      cwd: workDir,
      encoding: "utf-8",
    });
    // skill 靠這個 exit code 判斷要不要重做，靜靜寫出壞檔案是最糟的結果。
    assert.equal(failed.status, 1);
    assert.match(failed.stderr, /highlights/);

    const notJson = spawnSync("node", [scriptPath], { input: "不是 JSON", cwd: workDir, encoding: "utf-8" });
    assert.equal(notJson.status, 1);
    assert.match(notJson.stderr, /JSON/);
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
});
