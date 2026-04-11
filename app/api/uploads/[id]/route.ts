import { requireAuth } from "@/lib/api-auth";
import { parseIdParam } from "@/lib/validation/helpers";
import { NextRequest, NextResponse } from "next/server";
import { unlink, writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

const ALLOWED_THUMBNAIL_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);
const MAX_THUMBNAIL_SIZE = 2 * 1024 * 1024; // 2MB

/** PATCH — upload a thumbnail for an existing attachment */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;
  const { supabase } = auth;

  const id = parseIdParam(params.id);
  if (id instanceof NextResponse) return id;

  try {
    const { data: attachment } = await supabase
      .from("attachments")
      .select("*")
      .eq("id", id)
      .single();

    if (!attachment) {
      return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const thumbFile = formData.get("thumbnail") as File | null;
    if (!thumbFile) {
      return NextResponse.json({ error: "No thumbnail provided" }, { status: 400 });
    }
    if (thumbFile.size > MAX_THUMBNAIL_SIZE) {
      return NextResponse.json({ error: "Thumbnail too large (max 2MB)" }, { status: 400 });
    }
    if (!ALLOWED_THUMBNAIL_TYPES.has(thumbFile.type)) {
      return NextResponse.json({ error: "Thumbnail must be PNG, JPEG, or WebP" }, { status: 400 });
    }

    const hash = crypto.randomBytes(8).toString("hex");
    const thumbFilename = `thumb-${Date.now()}-${hash}.png`;

    await mkdir(UPLOAD_DIR, { recursive: true });
    const buffer = Buffer.from(await thumbFile.arrayBuffer());
    await writeFile(path.join(UPLOAD_DIR, thumbFilename), buffer);

    await supabase.from("attachments").update({ thumbnail: thumbFilename }).eq("id", id);

    const { data: updated } = await supabase.from("attachments").select("*").eq("id", id).single();
    return NextResponse.json(updated);
  } catch (e) {
    console.error("PATCH /api/uploads/[id] error:", e);
    return NextResponse.json({ error: "Thumbnail upload failed" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;
  const { supabase } = auth;

  const id = parseIdParam(params.id);
  if (id instanceof NextResponse) return id;

  try {
    const { data: attachment } = await supabase
      .from("attachments")
      .select("*")
      .eq("id", id)
      .single();

    if (!attachment) {
      return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
    }

    // Delete file from disk
    try {
      await unlink(path.join(UPLOAD_DIR, attachment.filename));
    } catch {
      // File may already be gone — continue with DB cleanup
    }
    // Delete thumbnail if present
    if (attachment.thumbnail) {
      try {
        await unlink(path.join(UPLOAD_DIR, attachment.thumbnail));
      } catch { /* ok */ }
    }

    // Delete from database
    const { error } = await supabase.from("attachments").delete().eq("id", id);
    if (error) throw error;

    return new NextResponse(null, { status: 204 });
  } catch (e) {
    console.error("DELETE /api/uploads/[id] error:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
