"use client";

import { useRef, useCallback, useState } from "react";
import { Paperclip, Upload, X, FileText, Film, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { mutate } from "swr";
import type { Attachment } from "@/lib/types";

interface FileUploadProps {
  entityType: "note" | "document" | "task";
  entityId: number | null;
  attachments: Attachment[];
  /** Called after a successful upload so parent can refresh */
  onUploadComplete?: () => void;
  /** If true, show a compact inline version */
  compact?: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImage(mime: string) {
  return mime.startsWith("image/");
}

function isVideo(mime: string) {
  return mime.startsWith("video/");
}

function FileIcon({ mime }: { mime: string }) {
  if (isImage(mime)) return <ImageIcon className="h-3.5 w-3.5" />;
  if (isVideo(mime)) return <Film className="h-3.5 w-3.5" />;
  return <FileText className="h-3.5 w-3.5" />;
}

export function FileUpload({
  entityType,
  entityId,
  attachments,
  onUploadComplete,
  compact,
}: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const uploadFile = useCallback(
    async (file: File) => {
      if (!entityId) {
        toast.error("Save first before attaching files");
        return;
      }

      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("entity_type", entityType);
        formData.append("entity_id", String(entityId));

        const res = await fetch("/api/uploads", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Upload failed");
        }

        toast.success(`Uploaded ${file.name}`);
        mutate(
          (key: unknown) =>
            typeof key === "string" &&
            (key.startsWith("/api/uploads") || key.startsWith("/api/notes"))
        );
        onUploadComplete?.();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [entityType, entityId, onUploadComplete]
  );

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      for (let i = 0; i < files.length; i++) {
        uploadFile(files[i]);
      }
    },
    [uploadFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  async function handleDelete(attachment: Attachment) {
    try {
      const res = await fetch(`/api/uploads/${attachment.id}`, {
        method: "DELETE",
      });
      if (!res.ok && res.status !== 204) throw new Error();
      toast.success("Attachment removed");
      mutate(
        (key: unknown) =>
          typeof key === "string" &&
          (key.startsWith("/api/uploads") || key.startsWith("/api/notes"))
      );
      onUploadComplete?.();
    } catch {
      toast.error("Failed to remove attachment");
    }
  }

  return (
    <div>
      {/* Drop zone / upload button */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`
          rounded-lg border border-dashed transition-colors cursor-pointer
          ${dragOver ? "border-foreground/40 bg-accent/30" : "border-border hover:border-border"}
          ${compact ? "px-3 py-2" : "px-4 py-3"}
        `}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className={`flex items-center gap-2 text-muted-foreground ${compact ? "text-xs" : "text-sm"}`}>
          {uploading ? (
            <Upload className="h-3.5 w-3.5 animate-pulse" />
          ) : (
            <Paperclip className="h-3.5 w-3.5" />
          )}
          <span>{uploading ? "Uploading..." : "Drop files here or click to attach"}</span>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {/* Attachment list */}
      {attachments.length > 0 && (
        <div className="mt-2 space-y-1">
          {attachments.map((att) => (
            <AttachmentItem
              key={att.id}
              attachment={att}
              onDelete={() => handleDelete(att)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AttachmentItem({
  attachment,
  onDelete,
}: {
  attachment: Attachment;
  onDelete: () => void;
}) {
  const url = `/uploads/${attachment.filename}`;

  return (
    <div className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent/30 transition-colors">
      {isImage(attachment.mime_type) ? (
        <a href={url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={attachment.original_name}
            className="h-10 w-10 rounded object-cover"
          />
        </a>
      ) : (
        <div className="flex-shrink-0 h-10 w-10 rounded bg-accent flex items-center justify-center text-muted-foreground">
          <FileIcon mime={attachment.mime_type} />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-foreground hover:underline truncate block"
        >
          {attachment.original_name}
        </a>
        <span className="text-[10px] text-muted-foreground">
          {formatFileSize(attachment.size)}
        </span>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-all"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

/** Renders attachments inline in content areas — images as imgs, videos as players, files as links */
export function InlineAttachments({ attachments }: { attachments: Attachment[] }) {
  if (attachments.length === 0) return null;

  const images = attachments.filter((a) => isImage(a.mime_type));
  const videos = attachments.filter((a) => isVideo(a.mime_type));
  const files = attachments.filter((a) => !isImage(a.mime_type) && !isVideo(a.mime_type));

  return (
    <div className="space-y-3 mt-3">
      {/* Image grid */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((img) => (
            <a
              key={img.id}
              href={`/uploads/${img.filename}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/uploads/${img.filename}`}
                alt={img.original_name}
                className="rounded-lg max-h-48 object-contain border border-border"
              />
            </a>
          ))}
        </div>
      )}

      {/* Video players */}
      {videos.map((vid) => (
        <video
          key={vid.id}
          src={`/uploads/${vid.filename}`}
          controls
          className="rounded-lg max-h-64 border border-border"
        />
      ))}

      {/* File links */}
      {files.length > 0 && (
        <div className="space-y-1">
          {files.map((file) => (
            <a
              key={file.id}
              href={`/uploads/${file.filename}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <FileIcon mime={file.mime_type} />
              <span>{file.original_name}</span>
              <span className="text-[10px]">({formatFileSize(file.size)})</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
