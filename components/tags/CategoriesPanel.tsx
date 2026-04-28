"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Pencil, Check, X } from "lucide-react";
import { useTags } from "@/lib/hooks";
import { mutate } from "swr";
import { toast } from "sonner";
import type { Tag } from "@/lib/types";

const TAG_COLORS = [
  "#6366f1", "#ef4444", "#f59e0b", "#10b981", "#3b82f6",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#6b7280",
  "#a855f7", "#06b6d4", "#84cc16", "#e11d48", "#0ea5e9",
  "#d946ef", "#22d3ee", "#facc15", "#4ade80", "#fb923c",
];

function getNextColor(existingTags: Tag[]): string {
  const used = new Set(existingTags.map((t) => t.color));
  return TAG_COLORS.find((c) => !used.has(c)) ?? TAG_COLORS[existingTags.length % TAG_COLORS.length];
}

function refreshAll() {
  mutate(
    (key: unknown) =>
      typeof key === "string" &&
      (key.startsWith("/api/tags") || key.startsWith("/api/goals"))
  );
}

export function CategoriesPanel() {
  const { data: tags } = useTags();
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const color = getNextColor(tags ?? []);
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), color }),
      });
      if (res.status === 409) {
        toast.error("Category already exists");
        return;
      }
      if (!res.ok) throw new Error("Failed");
      toast.success("Category created");
      setNewName("");
      refreshAll();
    } catch {
      toast.error("Failed to create category");
    } finally {
      setCreating(false);
    }
  }

  function startEdit(tag: Tag) {
    setEditingId(tag.id);
    setEditName(tag.name);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
  }

  async function handleSaveEdit() {
    if (!editingId || !editName.trim()) return;
    try {
      await fetch(`/api/tags/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() }),
      });
      toast.success("Category updated");
      refreshAll();
      cancelEdit();
    } catch {
      toast.error("Failed to update category");
    }
  }

  async function handleDelete(tag: Tag) {
    setDeletingId(tag.id);
    try {
      const res = await fetch(`/api/tags/${tag.id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error("API error");
      toast.success("Category deleted");
      refreshAll();
    } catch {
      toast.error("Failed to delete category");
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  }

  return (
    <div>
      <div className="mb-4">
        <Input
          placeholder="Type a category name and press Enter..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCreate();
          }}
          disabled={creating}
        />
      </div>

      <div className="space-y-1">
        {(!tags || tags.length === 0) && (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No categories yet. Type a name above and press Enter.
          </p>
        )}
        {tags?.map((tag) => (
          <div
            key={tag.id}
            className="flex items-center gap-3 rounded-[10px] px-3 py-2.5 hover:bg-accent/30 transition-colors group"
          >
            {editingId === tag.id ? (
              <>
                <span
                  className="h-3 w-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: tag.color }}
                />
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-7 text-sm flex-1"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveEdit();
                    if (e.key === "Escape") cancelEdit();
                  }}
                />
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleSaveEdit}>
                  <Check className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={cancelEdit}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </>
            ) : confirmDeleteId === tag.id ? (
              <>
                <span
                  className="h-3 w-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: tag.color }}
                />
                <span className="text-sm text-destructive flex-1">
                  Delete &quot;{tag.name}&quot;?
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setConfirmDeleteId(null)}
                    disabled={deletingId === tag.id}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleDelete(tag)}
                    disabled={deletingId === tag.id}
                  >
                    {deletingId === tag.id ? "Deleting..." : "Delete"}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <span
                  className="h-3 w-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: tag.color }}
                />
                <span className="text-sm flex-1">{tag.name}</span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    onClick={() => startEdit(tag)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => setConfirmDeleteId(tag.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
