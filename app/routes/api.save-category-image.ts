import { put } from "@vercel/blob";
import fs from "fs";
import path from "path";

export interface ActionFunctionArgs {
  request: Request;
}

/**
 * Standard JSON response helper
 */
export function json(data: any, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...(init?.headers || {}),
    },
    status: init?.status || 200,
  });
}

/**
 * ActionFunction for /api/save-category-image
 * Accepts FormData or JSON payloads, processes uploads via Vercel Blob or local disk,
 * and guarantees a JSON response on all paths.
 */
export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return json({ success: false, error: "Method not allowed. Use POST." }, { status: 405 });
  }

  try {
    const contentType = request.headers.get("content-type") || "";
    let fileToUpload: File | Buffer | Blob | null = null;
    let fileName = `category_${Date.now()}.png`;

    // 1. Handle Multipart / Form Data Uploads
    if (
      contentType.includes("multipart/form-data") ||
      contentType.includes("application/x-www-form-urlencoded")
    ) {
      const formData = await request.formData();
      const imageEntry = formData.get("file") || formData.get("image") || formData.get("data");
      const nameEntry = formData.get("name") || formData.get("filename");

      if (nameEntry && typeof nameEntry === "string") {
        fileName = nameEntry;
      }

      if (imageEntry && typeof imageEntry === "object" && "arrayBuffer" in imageEntry) {
        const fileObj = imageEntry as File | Blob;
        fileToUpload = fileObj;
        if ("name" in fileObj && fileObj.name) fileName = fileObj.name;
      } else if (typeof imageEntry === "string") {
        const cleanBase64 = imageEntry
          .replace(/^data:image\/[^;]+;base64,/, "")
          .replace(/^data:application\/[^;]+;base64,/, "");
        fileToUpload = Buffer.from(cleanBase64, "base64");
      }
    } 
    // 2. Handle JSON Body (Base64 uploads)
    else if (contentType.includes("application/json")) {
      const body = await request.json().catch(() => null);
      if (!body) {
        return json({ success: false, error: "Invalid JSON request body." }, { status: 400 });
      }

      const rawData = body.data || body.image || body.file;
      if (body.name || body.filename) {
        fileName = body.name || body.filename;
      }

      if (!rawData) {
        return json(
          { success: false, error: "No image data found in JSON body." },
          { status: 400 }
        );
      }

      const cleanBase64 = String(rawData)
        .replace(/^data:image\/[^;]+;base64,/, "")
        .replace(/^data:application\/[^;]+;base64,/, "");
      fileToUpload = Buffer.from(cleanBase64, "base64");
    } else {
      return json(
        { success: false, error: `Unsupported Content-Type: ${contentType}` },
        { status: 400 }
      );
    }

    if (!fileToUpload || (fileToUpload instanceof Buffer && fileToUpload.length === 0)) {
      return json(
        { success: false, error: "Failed to parse a valid image file or buffer." },
        { status: 400 }
      );
    }

    const safeFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const blobPath = `category-images/${Date.now()}-${safeFileName}`;

    // 3. Upload directly to Vercel Blob (Production)
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(blobPath, fileToUpload, {
        access: "public",
      });

      return json({
        success: true,
        url: blob.url,
        path: blob.url,
        storage: "vercel-blob",
      });
    }

    // 4. Fallback to local disk (Local Development only)
    const publicDir = path.join(process.cwd(), "public", "images");
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    const localFileName = `${Date.now()}-${safeFileName}`;
    const localFilePath = path.join(publicDir, localFileName);
    
    if (Buffer.isBuffer(fileToUpload)) {
      fs.writeFileSync(localFilePath, fileToUpload);
    } else {
      const arrayBuffer = await fileToUpload.arrayBuffer();
      fs.writeFileSync(localFilePath, Buffer.from(arrayBuffer));
    }

    const relativeUrl = `/images/${localFileName}`;

    return json({
      success: true,
      url: relativeUrl,
      path: relativeUrl,
      storage: "local-disk",
    });

  } catch (error: any) {
    console.error("Error uploading image to Vercel Blob:", error);

    // Guaranteed JSON response on failure
    return json(
      {
        success: false,
        error: error?.message || "An unexpected error occurred while saving the image.",
      },
      { status: 500 }
    );
  }
}

export default action;