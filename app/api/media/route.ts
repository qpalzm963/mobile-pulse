import { getPayload } from "payload";
import config from "@payload-config";

export const dynamic = "force-dynamic";

// TODO(security): This endpoint is currently intended for internal/editorial deployment with trusted authors.
// In upcoming issues (Auth/Permissions & Remote MCP), implement authentication check, user ownership binding, and rate limiting.

const ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB file limit
const MAX_REQUEST_SIZE = 12 * 1024 * 1024; // 12MB request limit (allows multipart boundaries, headers, alt/caption metadata)

/**
 * Validates actual binary image signatures (Magic Bytes) to prevent spoofed MIME types.
 */
export function detectImageSignature(buffer: Buffer): "image/png" | "image/jpeg" | "image/webp" | null {
  if (!buffer || buffer.length < 12) return null;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  // WebP: RIFF .... WEBP
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return "image/webp";
  }

  return null;
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

    const mediaList = result.docs.map((doc: Record<string, unknown>) => ({
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
