import { getPayload } from "payload";
import config from "@payload-config";

export const dynamic = "force-dynamic";

const ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export async function GET(request: Request) {
  try {
    const payload = await getPayload({ config });
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit")) || 50;

    const result = await payload.find({
      collection: "media",
      limit,
      sort: "-createdAt",
    });

    const mediaList = result.docs.map((doc: any) => ({
      id: String(doc.id),
      url: `/api/media/${doc.id}`,
      filename: doc.filename,
      alt: doc.alt,
      caption: doc.caption,
      mimeType: doc.mimeType,
      filesize: doc.filesize,
      width: doc.width,
      height: doc.height,
      createdAt: doc.createdAt,
    }));

    return Response.json({ success: true, media: mediaList, total: result.totalDocs });
  } catch (error: any) {
    console.error("Failed to fetch media list:", error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const alt = (formData.get("alt") as string | null) || "";
    const caption = (formData.get("caption") as string | null) || "";

    if (!file || typeof file === "string") {
      return Response.json({ success: false, error: "Image file is required" }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return Response.json(
        {
          success: false,
          error: `Unsupported file type: ${file.type}. Allowed formats: PNG, JPEG, WebP, GIF, SVG`,
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return Response.json(
        {
          success: false,
          error: `File size exceeds the 10MB limit (size: ${(file.size / 1024 / 1024).toFixed(2)}MB)`,
        },
        { status: 400 }
      );
    }

    const cleanAlt = alt.trim() || file.name.replace(/\.[^/.]+$/, "");
    const cleanCaption = caption.trim() || undefined;

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const payload = await getPayload({ config });
    const createdMedia = await payload.create({
      collection: "media",
      data: {
        alt: cleanAlt,
        caption: cleanCaption,
      },
      file: {
        data: buffer,
        mimetype: file.type,
        name: file.name,
        size: file.size,
      },
    });

    return Response.json(
      {
        success: true,
        media: {
          id: String(createdMedia.id),
          url: `/api/media/${createdMedia.id}`,
          filename: createdMedia.filename,
          alt: createdMedia.alt,
          caption: createdMedia.caption,
          mimeType: createdMedia.mimeType,
          filesize: createdMedia.filesize,
          width: createdMedia.width,
          height: createdMedia.height,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Failed to upload media:", error);
    return Response.json({ success: false, error: error.message || "Failed to upload media" }, { status: 500 });
  }
}
