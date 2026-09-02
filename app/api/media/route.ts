import { getPayload } from "payload";
import config from "@payload-config";

export const dynamic = "force-dynamic";

// TODO(security): This endpoint is currently intended for internal/editorial deployment with trusted authors.
// In upcoming issues (Auth/Permissions & Remote MCP), implement authentication check, user ownership binding, and rate limiting.

import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
  MAX_REQUEST_SIZE,
  detectImageSignature,
} from "@/lib/media";

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

    const mediaList = result.docs.map((doc) => ({
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
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Failed to fetch media list";
    console.error("Failed to fetch media list:", error);
    return Response.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  // Early check Content-Length header before processing stream (with 12MB buffer for multipart overhead)
  const contentLength = request.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_REQUEST_SIZE) {
    return Response.json(
      {
        success: false,
        error: `Request size exceeds the 12MB limit (size: ${(parseInt(contentLength, 10) / 1024 / 1024).toFixed(2)}MB)`,
      },
      { status: 400 }
    );
  }

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
          error: `Unsupported file type: ${file.type}. Allowed formats: PNG, JPEG, WebP`,
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

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Deep Magic Byte Signature Verification
    const detectedType = detectImageSignature(buffer);
    if (!detectedType) {
      return Response.json(
        {
          success: false,
          error: "Invalid image file signature. The uploaded file does not match a valid PNG, JPEG, or WebP format.",
        },
        { status: 400 }
      );
    }

    const cleanAlt = alt.trim() || file.name.replace(/\.[^/.]+$/, "");
    const cleanCaption = caption.trim() || undefined;

    const payload = await getPayload({ config });
    const createdMedia = await payload.create({
      collection: "media",
      data: {
        alt: cleanAlt,
        caption: cleanCaption,
      },
      file: {
        data: buffer,
        mimetype: detectedType,
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
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Failed to upload media";
    console.error("Failed to upload media:", error);
    return Response.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
