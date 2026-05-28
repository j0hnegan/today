import { requireAuth } from "@/lib/api-auth";
import { storageClient } from "@/lib/storage";
import { validateSearchParams } from "@/lib/validation/helpers";
import { uploadFormSchema, uploadsQuerySchema } from "@/lib/validation/upload";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

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
  // Text
  "text/plain", "text/csv", "text/markdown",
]);

const BUCKET = "attachments";

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

    const buffer = Buffer.from(await file.arrayBuffer());

    // Generate unique filename
    const lastDot = file.name.lastIndexOf(".");
    const ext = lastDot >= 0 ? file.name.slice(lastDot) : "";
    const hash = crypto.randomBytes(8).toString("hex");
    const filename = `${Date.now()}-${hash}${ext}`;

    // Upload to Supabase Storage (uses service role to bypass RLS)
    const { error: storageError } = await storageClient()
      .from(BUCKET)
      .upload(filename, buffer, { contentType: file.type, upsert: false });
    if (storageError) throw storageError;

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
