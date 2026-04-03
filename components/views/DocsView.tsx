"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDocs, useCategories, useGoals } from "@/lib/hooks";
import { DocEditor } from "@/components/docs/DocEditor";
import { mutate } from "swr";
import { toast } from "sonner";
import type { Document } from "@/lib/types";

function refreshDocs() {
  mutate(
    (key: unknown) => typeof key === "string" && key.startsWith("/api/docs")
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function DocsSkeleton() {
  return (
    <div className="mx-auto max-w-3xl px-6 pt-[80px] pb-8">
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
  const { data: docs, isLoading } = useDocs();
  const { data: categories } = useCategories();
  const { data: goals } = useGoals();
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [creating, setCreating] = useState(false);

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
      setSelectedDoc(newDoc);
      toast.success("Document created");
    } catch {
      toast.error("Failed to create document");
    } finally {
      setCreating(false);
    }
  }

  function handleBack() {
    setSelectedDoc(null);
    refreshDocs();
  }

  // When viewing a doc, keep it in sync with fresh data
  const freshDoc =
    selectedDoc && docs
      ? docs.find((d) => d.id === selectedDoc.id) ?? selectedDoc
      : selectedDoc;

  if (selectedDoc && freshDoc) {
    return (
      <DocEditor
        doc={freshDoc}
        onBack={handleBack}
        allCategories={categories ?? []}
        allGoals={goals ?? []}
      />
    );
  }

  if (isLoading) {
    return <DocsSkeleton />;
  }

  return (
    <div className="mx-auto max-w-3xl px-6 pt-[80px] pb-8">
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
        {(!docs || docs.length === 0) && (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No documents yet. Create one to get started.
          </p>
        )}
        {docs?.map((doc) => (
          <button
            key={doc.id}
            type="button"
            onClick={() => setSelectedDoc(doc)}
            className="flex w-full items-start gap-3 rounded-[10px] px-3 py-3 hover:bg-accent/30 transition-colors text-left group"
          >
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium block truncate">
                {doc.title || "Untitled"}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDate(doc.updated_at)}
              </span>
            </div>

            {/* Category / goal chips */}
            <div className="flex items-center gap-1 flex-shrink-0 pt-0.5">
              {doc.categories?.slice(0, 2).map((cat) => (
                <span
                  key={cat.id}
                  className="inline-flex items-center rounded-[6px] px-1.5 py-0.5 text-[10px] font-medium"
                  style={{
                    backgroundColor: cat.color + "26",
                    color: cat.color,
                  }}
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
              {((doc.categories?.length ?? 0) + (doc.goals?.length ?? 0) > 4) && (
                <span className="text-[10px] text-muted-foreground">
                  +{(doc.categories?.length ?? 0) + (doc.goals?.length ?? 0) - 4}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
