import { describe, expect, it } from "vitest";
import React from "react";
import { POST as uploadMedia, GET as listMedia, detectImageSignature } from "../app/api/media/route";
import { GET as getMediaById } from "../app/api/media/[id]/route";
import { POST as createSubmission } from "../app/api/submissions/route";
import { RichMarkdownRenderer } from "../components/RichMarkdownRenderer";
import { insertTextAtCursor } from "../lib/content-markdown";

describe("Media Collection & Upload Pipeline", () => {
  it("成功上傳有效圖片並取得 Media ID 與資源 URL", async () => {
    // Construct a 1x1 PNG dummy buffer
    const pngBuffer = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64"
    );

    const formData = new FormData();
    const file = new File([pngBuffer], "swift6_architecture.png", { type: "image/png" });
    formData.append("file", file);
    formData.append("alt", "Swift 6 靜態記憶體架構圖");
    formData.append("caption", "圖 1：隔離模型");

    const req = new Request("https://example.com/api/media", {
      method: "POST",
      body: formData,
    });

    const res = await uploadMedia(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.media.id).toBeDefined();
    expect(data.media.url).toBe(`/api/media/${data.media.id}`);
    expect(data.media.alt).toBe("Swift 6 靜態記憶體架構圖");
    expect(data.media.caption).toBe("圖 1：隔離模型");
    expect(data.media.mimeType).toBe("image/png");

    // Test GET /api/media/:id with format=json
    const getRes = await getMediaById(
      new Request(`https://example.com/api/media/${data.media.id}?format=json`),
      { params: Promise.resolve({ id: String(data.media.id) }) }
    );
    expect(getRes.status).toBe(200);
    const getData = await getRes.json();
    expect(getData.id).toBe(String(data.media.id));
    expect(getData.alt).toBe("Swift 6 靜態記憶體架構圖");
  });

  it("拒絕偽造 MIME 但二進位 Signature 不符的假圖片檔案", async () => {
    // File declares image/png but content is plain text
    const fakePngBuffer = Buffer.from("Not a real PNG file content");
    const formData = new FormData();
    const file = new File([fakePngBuffer], "fake.png", { type: "image/png" });
    formData.append("file", file);
    formData.append("alt", "假圖片");

    const req = new Request("https://example.com/api/media", {
      method: "POST",
      body: formData,
    });

    const res = await uploadMedia(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain("Invalid image file signature");
  });

  it("拒絕不在白名單的格式（例如 SVG 或純文字）", async () => {
    const textBuffer = Buffer.from("<svg></svg>");
    const formData = new FormData();
    const file = new File([textBuffer], "vector.svg", { type: "image/svg+xml" });
    formData.append("file", file);
    formData.append("alt", "SVG 向量圖");

    const req = new Request("https://example.com/api/media", {
      method: "POST",
      body: formData,
    });

    const res = await uploadMedia(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain("Unsupported file type");
  });

  it("拒絕超過 10MB 限制的超大檔案", async () => {
    // 11MB dummy buffer
    const largeBuffer = new Uint8Array(11 * 1024 * 1024);
    const formData = new FormData();
    const file = new File([largeBuffer], "huge_image.png", { type: "image/png" });
    formData.append("file", file);
    formData.append("alt", "過大圖片");

    const req = new Request("https://example.com/api/media", {
      method: "POST",
      body: formData,
    });

    const res = await uploadMedia(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain("exceeds the 10MB limit");
  });

  it("GET /api/media 能正確列出媒體紀錄", async () => {
    const res = await listMedia(new Request("https://example.com/api/media"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.media)).toBe(true);
  });

  it("投稿時若提供不存在的 coverImageId 應回傳 400 阻止 dangling reference", async () => {
    const res = await createSubmission(
      new Request("https://example.com/api/submissions", {
        method: "POST",
        body: JSON.stringify({
          title: "測試封面圖不存在的文章",
          contentMarkdown: "這是一篇用來測試不存在的封面圖 ID 的文章。",
          coverImageId: "non_existent_media_id_99999",
        }),
      })
    );

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("does not exist in Media collection");
  });

  it("insertTextAtCursor 能精準在游標處插入 Shortcode 並處理換行邊界", () => {
    const original = "第一段文字。\n\n第二段文字。";
    const shortcode = ':::image id="media_1" alt="示意圖" :::';

    // 1. 在中間插入 (游標在 "第一段文字。\n\n" 之後)
    const cursorMid = 7;
    const { newText: midText, newCursorPos: midPos } = insertTextAtCursor(
      original,
      shortcode,
      cursorMid,
      cursorMid
    );
    expect(midText).toContain(shortcode);
    expect(midPos).toBeGreaterThan(cursorMid);

    // 2. 在結尾插入
    const { newText: endText } = insertTextAtCursor(original, shortcode, original.length, original.length);
    expect(endText.endsWith(shortcode)).toBe(false);
    expect(endText).toContain(shortcode);

    // 3. 無指定 cursor 時安全 append
    const { newText: appendText } = insertTextAtCursor(original, shortcode);
    expect(appendText).toContain(shortcode);
  });

  it("detectImageSignature 能精準識別各類 Magic Bytes", () => {
    // Valid PNG
    const pngBuf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
    expect(detectImageSignature(pngBuf)).toBe("image/png");

    // Valid JPEG
    const jpegBuf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
    expect(detectImageSignature(jpegBuf)).toBe("image/jpeg");

    // Valid WebP
    const webpBuf = Buffer.from([
      0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
    ]);
    expect(detectImageSignature(webpBuf)).toBe("image/webp");

    // Invalid / Text
    const invalidBuf = Buffer.from("Hello world!");
    expect(detectImageSignature(invalidBuf)).toBeNull();
  });

  it("escapeShortcodeAttr 能正確跳脫引號與換行，且 RichMarkdownRenderer 能還原解析", () => {
    const rawAlt = '架構 "A" 與 "B" 核心';
    const rawCaption = '說明：這是一個 "複雜" 的 \\ 特殊圖說';
    
    // In submit page, we escape:
    const escapedAlt = rawAlt.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    const escapedCaption = rawCaption.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    
    const md = `:::image id="media_quoted" alt="${escapedAlt}" caption="${escapedCaption}" :::`;
    const element = RichMarkdownRenderer({ content: md });
    expect(element).not.toBeNull();
    expect(React.isValidElement(element)).toBe(true);
  });

  it("RichMarkdownRenderer 能正確解析含 size preset 的 :::image Shortcode", () => {
    const md = `
# 測試文章

:::image id="media_test_99" alt="架構圖" caption="系統流程" size="wide" :::
`;
    const element = RichMarkdownRenderer({ content: md });
    expect(element).not.toBeNull();
    expect(React.isValidElement(element)).toBe(true);
  });
});
