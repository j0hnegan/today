"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, CalendarDays, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDocs, useNotesList, fetcher } from "@/lib/hooks";
import { preload } from "swr";
import { mutate } from "@/lib/swr-helpers";
import { toast } from "sonner";
import type { Document } from "@/lib/types";

function refreshDocs() {
  mutate(
    (key: unknown) => typeof key === "string" && key.startsWith("/api/docs")
  );
}

function formatRelativeDate(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round(
    (startOfToday.getTime() - startOfDate.getTime()) / 86400000
  );
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays >= 2 && diffDays <= 4) return `${diffDays} days ago`;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatNoteDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function contentPreview(html: string): string {
  // Strip HTML tags to get plain text, then take first ~80 chars
  const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (text.length <= 80) return text;
  return text.slice(0, 80).trimEnd() + "…";
}

type ListItem =
  | { kind: "doc"; doc: Document }
  | { kind: "note"; id: number; date: string; content: string; updated_at: string };

// One shared row so docs and day-notes present identically (title + preview + meta),
// differing only by leading icon and the doc-only chips. (005 Step 1.)
function DocRow({
  href,
  icon: Icon,
  title,
  preview,
  updatedAt,
  right,
  prefetch,
  onMouseEnter,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  preview: string;
  updatedAt: string;
  right?: React.ReactNode;
  prefetch?: boolean;
  onMouseEnter?: () => void;
}) {
  return (
    <Link
      href={href}
      prefetch={prefetch}
      onMouseEnter={onMouseEnter}
      className="flex w-full items-start gap-3 rounded-[10px] px-3 py-3 hover:bg-accent/30 transition-colors text-left group"
    >
      <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium block truncate">{title}</span>
        {preview && (
          <span className="text-xs text-muted-foreground block truncate">{preview}</span>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 pt-0.5">
        {right}
        <span className="text-[10px] text-muted-foreground font-mono">
          {formatRelativeDate(updatedAt)}
        </span>
      </div>
    </Link>
  );
}

function DocsSkeleton() {
  return (
    <div className="mx-auto max-w-3xl px-4 md:px-6 pt-5 md:pt-[80px] pb-8">
      <div className="flex items-center justify-between mb-6">
        <div className="skeleton h-5 w-16" />
        <div className="skeleton h-8 w-32 rounded-[10px]" />
      </div>
      <div className="space-y-1">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-[10px] px-3 py-3"
          >
            <div className="flex-1 space-y-1.5">
              <div
                className="skeleton h-4"
                style={{ width: `${100 + i * 40}px` }}
              />
              <div
                className="skeleton h-3"
                style={{ width: `${60 + i * 20}px` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DocsView() {
  const router = useRouter();
  const { data: docs } = useDocs();
  const { data: notes } = useNotesList();
  const [creating, setCreating] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const items = useMemo<ListItem[]>(() => {
    const list: ListItem[] = [];
    if (docs) {
      for (const doc of docs) {
        list.push({ kind: "doc", doc });
      }
    }
    if (mounted && notes) {
      for (const note of notes) {
        // Skip notes with trivial content (just dashes, whitespace, empty divs)
        const text = note.content.replace(/<[^>]*>/g, "").replace(/[\s\-]+/g, "").trim();
        if (!text) continue;
        list.push({ kind: "note", ...note });
      }
    }
    // Sort by updated_at descending
    list.sort((a, b) => {
      const aDate = a.kind === "doc" ? a.doc.updated_at : a.updated_at;
      const bDate = b.kind === "doc" ? b.doc.updated_at : b.updated_at;
      return bDate.localeCompare(aDate);
    });
    return list;
  }, [docs, notes, mounted]);

  async function handleCreate() {
    setCreating(true);
    try {
      const res = await fetch("/api/docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Untitled",
          content: "",
          sort_order: (docs?.length ?? 0) + 1,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const newDoc: Document = await res.json();
      refreshDocs();
      router.push(`/docs/${newDoc.id}`);
      toast.success("Document created");
    } catch {
      toast.error("Failed to create document");
    } finally {
      setCreating(false);
    }
  }

  if (!docs) {
    return <DocsSkeleton />;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 md:px-6 pt-5 md:pt-[80px] pb-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold tracking-tight">Docs</h1>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs gap-1.5"
          onClick={handleCreate}
          disabled={creating}
        >
          <Plus className="h-3.5 w-3.5" />
          New Document
        </Button>
      </div>

      <div className="space-y-1">
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No documents yet. Create one to get started.
          </p>
        )}
        {items.map((item) => {
          if (item.kind === "doc") {
            const doc = item.doc;
            return (
              <DocRow
                key={`doc-${doc.id}`}
                href={`/docs/${doc.id}`}
                prefetch
                onMouseEnter={() => preload(`/api/docs/${doc.id}`, fetcher)}
                icon={FileText}
                title={doc.title || "Untitled"}
                preview={contentPreview(doc.content)}
                updatedAt={doc.updated_at}
                right={
                  <>
                    {doc.categories?.slice(0, 2).map((cat) => (
                      <span
                        key={cat.id}
                        className="inline-flex items-center rounded-[6px] px-1.5 py-0.5 text-[10px] font-medium"
                        style={{ backgroundColor: cat.color + "26", color: cat.color }}
                      >
                        {cat.name}
                      </span>
                    ))}
                    {doc.goals?.slice(0, 2).map((goal) => (
                      <span
                        key={goal.id}
                        className="inline-flex items-center rounded-[6px] px-1.5 py-0.5 text-[10px] font-medium bg-accent text-muted-foreground"
                      >
                        {goal.title}
                      </span>
                    ))}
                  </>
                }
              />
            );
          }

          // Day-note — same row, titled by its date; links to the Today page.
          return (
            <DocRow
              key={`note-${item.date}`}
              href={`/?date=${item.date}`}
              icon={CalendarDays}
              title={formatNoteDate(item.date)}
              preview={contentPreview(item.content)}
              updatedAt={item.updated_at}
            />
          );
        })}
      </div>
    </div>
  );
}
