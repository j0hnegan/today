"use client";

import { useState, useMemo } from "react";
import { useDocs } from "@/lib/hooks";
import { mutate } from "@/lib/swr-helpers";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FileText } from "lucide-react";
import { toast } from "sonner";
import type { Document } from "@/lib/types";

/** Appends a captured HTML selection to a document the user picks. */
export function AddToDocumentModal({
  open,
  html,
  onClose,
}: {
  open: boolean;
  html: string;
  onClose: () => void;
}) {
  const { data: docs } = useDocs();
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = docs ?? [];
    return q ? list.filter((d) => d.title.toLowerCase().includes(q)) : list;
  }, [docs, search]);

  async function addTo(doc: Document) {
    if (saving || !html.trim()) return;
    setSaving(true);
    const merged = doc.content?.trim() ? `${doc.content}${html}` : html;
    try {
      const res = await fetch(`/api/docs/${doc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: merged }),
      });
      if (!res.ok) throw new Error();
      mutate("/api/docs");
      mutate(`/api/docs/${doc.id}`);
      toast.success(`Added to "${doc.title}"`);
      onClose();
    } catch {
      toast.error("Couldn't add to document");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Add to document</DialogTitle>
          <DialogDescription>
            Append the selected text to a document.
          </DialogDescription>
        </DialogHeader>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search documents..."
          className="h-8 text-sm"
          autoFocus
        />
        <div className="max-h-64 overflow-auto -mx-1 px-1">
          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground py-3 text-center">
              No documents found.
            </p>
          ) : (
            filtered.map((doc) => (
              <button
                key={doc.id}
                type="button"
                disabled={saving}
                onClick={() => addTo(doc)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground hover:bg-accent transition-colors disabled:opacity-50"
              >
                <FileText className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <span className="truncate">{doc.title || "Untitled"}</span>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
