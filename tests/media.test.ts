import { describe, expect, it } from "vitest";
import React from "react";
import { POST as uploadMedia, GET as listMedia } from "../app/api/media/route";
import { GET as getMediaById } from "../app/api/media/[id]/route";
import { RichMarkdownRenderer } from "../components/RichMarkdownRenderer";

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

  it("拒絕非圖片格式（MIME 白名單防護）", async () => {
    const textBuffer = Buffer.from("Hello world script content");
    const formData = new FormData();
    const file = new File([textBuffer], "script.txt", { type: "text/plain" });
    formData.append("file", file);
    formData.append("alt", "惡意文字檔案");

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
