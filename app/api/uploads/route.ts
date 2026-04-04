import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const ALLOWED_TYPES = new Set([
  // Images
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml",
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

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const entityType = formData.get("entity_type") as string | null;
    const entityId = formData.get("entity_id") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!entityType || !entityId) {
      return NextResponse.json({ error: "entity_type and entity_id required" }, { status: 400 });
    }
    if (!["note", "document", "task"].includes(entityType)) {
      return NextResponse.json({ error: "Invalid entity_type" }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: `File type not allowed: ${file.type}` }, { status: 400 });
    }

    // Generate unique filename
    const ext = path.extname(file.name) || "";
    const hash = crypto.randomBytes(8).toString("hex");
    const filename = `${Date.now()}-${hash}${ext}`;

    // Ensure upload directory exists
    await mkdir(UPLOAD_DIR, { recursive: true });

    // Write file to disk
    const buffer = Buffer.from(await file.arrayBuffer());
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
        entity_id: parseInt(entityId, 10),
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
  try {
    const entityType = request.nextUrl.searchParams.get("entity_type");
    const entityId = request.nextUrl.searchParams.get("entity_id");

    if (!entityType || !entityId) {
      return NextResponse.json({ error: "entity_type and entity_id required" }, { status: 400 });
    }

    const { data: attachments, error } = await supabase
      .from("attachments")
      .select("*")
      .eq("entity_type", entityType)
      .eq("entity_id", parseInt(entityId, 10))
      .order("created_at", { ascending: false });
    if (error) throw error;

    return NextResponse.json(attachments);
  } catch (e) {
    console.error("GET /api/uploads error:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
