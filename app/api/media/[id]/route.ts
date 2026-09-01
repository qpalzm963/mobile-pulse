import { getPayload } from "payload";
import config from "@payload-config";
import path from "path";
import { existsSync, readFileSync } from "fs";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  if (!id) {
    return new Response(JSON.stringify({ error: "Invalid media id" }), { status: 400 });
  }

  try {
    const payload = await getPayload({ config });
    
    // Find media by id
    let mediaDoc: any = null;
    try {
      mediaDoc = await payload.findByID({
        collection: "media",
        id: Number(id) || id,
      });
    } catch {
      // If by id fails, try finding by filename
      const found = await payload.find({
        collection: "media",
        where: {
          filename: { equals: id },
        },
        limit: 1,
      });
      mediaDoc = found.docs[0] ?? null;
    }

    if (!mediaDoc) {
      return new Response(JSON.stringify({ error: "Media not found" }), { status: 404 });
    }

    const url = new URL(request.url);
    const formatJson =
      url.searchParams.get("format") === "json" ||
      request.headers.get("accept")?.includes("application/json");

    if (formatJson) {
      return Response.json({
        id: String(mediaDoc.id),
        url: `/api/media/${mediaDoc.id}`,
        filename: mediaDoc.filename,
        alt: mediaDoc.alt,
        caption: mediaDoc.caption,
        mimeType: mediaDoc.mimeType,
        filesize: mediaDoc.filesize,
        width: mediaDoc.width,
        height: mediaDoc.height,
        createdAt: mediaDoc.createdAt,
      });
    }

    // Serve binary file from media directory
    const mediaDir = process.env.MEDIA_DIR
      ? process.env.MEDIA_DIR.startsWith("/")
        ? process.env.MEDIA_DIR
        : path.resolve(process.cwd(), process.env.MEDIA_DIR)
      : path.resolve(process.cwd(), "media");

    const filePath = path.resolve(mediaDir, mediaDoc.filename);

    if (existsSync(filePath)) {
      const fileBuffer = readFileSync(filePath);
      return new Response(fileBuffer, {
        headers: {
          "Content-Type": mediaDoc.mimeType || "application/octet-stream",
          "Content-Length": String(fileBuffer.length),
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }

    // Fallback: If file not in mediaDir, check public/
    const publicPath = path.resolve(process.cwd(), "public", mediaDoc.filename);
    if (existsSync(publicPath)) {
      const fileBuffer = readFileSync(publicPath);
      return new Response(fileBuffer, {
        headers: {
          "Content-Type": mediaDoc.mimeType || "application/octet-stream",
          "Content-Length": String(fileBuffer.length),
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }

    return new Response(JSON.stringify({ error: "File not found on disk" }), { status: 404 });
  } catch (error: any) {
    console.error("Failed to serve media:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
