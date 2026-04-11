import { requireAuth } from "@/lib/api-auth";
import { validateSearchParams } from "@/lib/validation/helpers";
import { uploadFormSchema, uploadsQuerySchema } from "@/lib/validation/upload";
import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { fileTypeFromBuffer } from "file-type";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Types where we trust the client-supplied MIME because file-type can't sniff
// them (plain text, CSV, markdown have no magic bytes). For these we still
// allow upload but skip the byte-level cross-check.
const UNSNIFFABLE_TYPES = new Set([
  "text/plain", "text/csv", "text/markdown",
]);

const ALLOWED_TYPES = new Set<string>([
  // Images
  "image/jpeg", "image/png", "image/gif", "image/webp",
  // Videos
  "video/mp4", "video/webm", "video/quicktime",
  // Documents
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  // Text (no magic bytes — see UNSNIFFABLE_TYPES)
  "text/plain", "text/csv", "text/markdown",
]);

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;
  const { supabase } = auth;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const formParsed = uploadFormSchema.safeParse({
      entity_type: formData.get("entity_type"),
      entity_id: formData.get("entity_id"),
    });
    if (!formParsed.success) {
      return NextResponse.json(
        { error: "Invalid form data", issues: formParsed.error.issues },
        { status: 400 }
      );
    }
    const { entity_type: entityType, entity_id: entityId } = formParsed.data;

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: `File type not allowed: ${file.type}` }, { status: 400 });
    }

    // Read into memory once so we can both byte-sniff and persist.
    const buffer = Buffer.from(await file.arrayBuffer());

    // Cross-check the client-supplied MIME against the file's actual magic
    // bytes. Without this, an attacker could rename a `.html` payload as
    // `evil.png` with `Content-Type: image/png` and we'd happily serve it
    // back from /uploads. Sniffable types must match; unsniffable text
    // formats fall through (no magic bytes to check against).
    if (!UNSNIFFABLE_TYPES.has(file.type)) {
      const sniffed = await fileTypeFromBuffer(buffer);
      if (!sniffed || !ALLOWED_TYPES.has(sniffed.mime) || sniffed.mime !== file.type) {
        return NextResponse.json(
          { error: `File contents don't match declared type ${file.type}` },
          { status: 400 }
        );
      }
    }

    // Generate unique filename
    const ext = path.extname(file.name) || "";
    const hash = crypto.randomBytes(8).toString("hex");
    const filename = `${Date.now()}-${hash}${ext}`;

    // Ensure upload directory exists
    await mkdir(UPLOAD_DIR, { recursive: true });

    // Write file to disk
    const filePath = path.join(UPLOAD_DIR, filename);
    await writeFile(filePath, buffer);

    // Record in database
    const { data: attachment, error } = await supabase
      .from("attachments")
      .insert({
        filename,
        original_name: file.name,
        mime_type: file.type,
        size: file.size,
        entity_type: entityType,
        entity_id: entityId,
      })
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json(attachment, { status: 201 });
  } catch (e) {
    console.error("POST /api/uploads error:", e);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;
  const { supabase } = auth;

  const params = validateSearchParams(request.nextUrl.searchParams, uploadsQuerySchema);
  if (params instanceof NextResponse) return params;
  const { entity_type: entityType, entity_id: entityId } = params;

  try {
    const { data: attachments, error } = await supabase
      .from("attachments")
      .select("*")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .order("created_at", { ascending: false });
    if (error) throw error;

    return NextResponse.json(attachments);
  } catch (e) {
    console.error("GET /api/uploads error:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
