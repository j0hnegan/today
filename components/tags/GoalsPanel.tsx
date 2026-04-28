"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Trash2, Pencil, Check, X, ChevronRight, Circle, CheckCircle2 } from "lucide-react";
import { useTags, useGoals } from "@/lib/hooks";
import { mutate } from "swr";
import { toast } from "sonner";
import type { Goal, Category } from "@/lib/types";

function refreshAll() {
  mutate(
    (key: unknown) =>
      typeof key === "string" &&
      (key.startsWith("/api/tags") || key.startsWith("/api/goals"))
  );
}

export function GoalsPanel() {
  const { data: tags } = useTags();
  const { data: goals } = useGoals();

  const [newTitle, setNewTitle] = useState("");
  const [newCategoryId, setNewCategoryId] = useState<string>("none");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(["uncategorized"]));

  const goalsByCategory = useMemo(() => {
    const map = new Map<number | null, Goal[]>();
    if (!goals) return map;
    for (const goal of goals) {
      const key = goal.category_id;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(goal);
    }
    return map;
  }, [goals]);

  function toggleSection(key: string) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleCreate() {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const body: { title: string; category_id?: number } = { title: newTitle.trim() };
      if (newCategoryId !== "none") body.category_id = Number(newCategoryId);
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Goal created");
      setNewTitle("");
      setNewCategoryId("none");
      refreshAll();
      const sectionKey = newCategoryId === "none" ? "uncategorized" : `cat-${newCategoryId}`;
      setOpenSections((prev) => new Set(prev).add(sectionKey));
    } catch {
      toast.error("Failed to create goal");
    } finally {
      setCreating(false);
    }
  }

  function startEdit(goal: Goal) {
    setEditingId(goal.id);
    setEditTitle(goal.title);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditTitle("");
  }

  async function handleSaveEdit() {
    if (!editingId || !editTitle.trim()) return;
    try {
      await fetch(`/api/goals/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle.trim() }),
      });
      toast.success("Goal updated");
      refreshAll();
      cancelEdit();
    } catch {
      toast.error("Failed to update goal");
    }
  }

  async function handleToggleStatus(goal: Goal) {
    const newStatus = goal.status === "active" ? "done" : "active";
    try {
      await fetch(`/api/goals/${goal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      refreshAll();
    } catch {
      toast.error("Failed to update goal");
    }
  }

  async function handleDelete(goal: Goal) {
    setDeletingId(goal.id);
    try {
      const res = await fetch(`/api/goals/${goal.id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error("API error");
      toast.success("Goal deleted");
      refreshAll();
    } catch {
      toast.error("Failed to delete goal");
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  }

  const categorySections: { key: string; category: Category | null; goals: Goal[] }[] = [];
  for (const cat of tags ?? []) {
    categorySections.push({
      key: `cat-${cat.id}`,
      category: cat,
      goals: goalsByCategory.get(cat.id) ?? [],
    });
  }
  const uncategorized = goalsByCategory.get(null) ?? [];
  if (uncategorized.length > 0) {
    categorySections.push({
      key: "uncategorized",
      category: null,
      goals: uncategorized,
    });
  }

  function renderGoalRow(goal: Goal) {
    if (editingId === goal.id) {
      return (
        <div
          key={goal.id}
          className="flex items-center gap-3 rounded-[10px] px-3 py-2 hover:bg-accent/30 transition-colors"
        >
          <Input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
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
        </div>
      );
    }

    if (confirmDeleteId === goal.id) {
      return (
        <div
          key={goal.id}
          className="flex items-center gap-3 rounded-[10px] px-3 py-2 hover:bg-accent/30 transition-colors"
        >
          <span className="text-sm text-destructive flex-1">
            Delete &quot;{goal.title}&quot;?
          </span>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setConfirmDeleteId(null)}
              disabled={deletingId === goal.id}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="h-7 text-xs"
              onClick={() => handleDelete(goal)}
              disabled={deletingId === goal.id}
            >
              {deletingId === goal.id ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div
        key={goal.id}
        className="flex items-center gap-3 rounded-[10px] px-3 py-2 hover:bg-accent/30 transition-colors group"
      >
        <button
          onClick={() => handleToggleStatus(goal)}
          className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
        >
          {goal.status === "done" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          ) : (
            <Circle className="h-4 w-4" />
          )}
        </button>
        <span
          className={`text-sm flex-1 cursor-pointer ${goal.status === "done" ? "line-through text-muted-foreground" : ""}`}
          onClick={() => startEdit(goal)}
        >
          {goal.title}
        </span>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => startEdit(goal)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => setConfirmDeleteId(goal.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex gap-2">
        <Input
          placeholder="Type a goal title and press Enter..."
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCreate();
          }}
          disabled={creating}
          className="flex-1"
        />
        <Select value={newCategoryId} onValueChange={setNewCategoryId}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No category</SelectItem>
            {tags?.map((cat) => (
              <SelectItem key={cat.id} value={String(cat.id)}>
                <span className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full inline-block"
                    style={{ backgroundColor: cat.color }}
                  />
                  {cat.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        {categorySections.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No goals yet. Type a title above and press Enter.
          </p>
        )}
        {categorySections.map((section) => (
          <Collapsible
            key={section.key}
            open={openSections.has(section.key)}
            onOpenChange={() => toggleSection(section.key)}
          >
            <CollapsibleTrigger className="flex items-center gap-2 w-full rounded-[10px] px-3 py-2.5 hover:bg-accent/30 transition-colors text-left">
              <ChevronRight
                className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${
                  openSections.has(section.key) ? "rotate-90" : ""
                }`}
              />
              {section.category ? (
                <span
                  className="h-3 w-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: section.category.color }}
                />
              ) : (
                <span className="h-3 w-3 rounded-full flex-shrink-0 bg-muted-foreground/30" />
              )}
              <span className="text-sm font-medium flex-1">
                {section.category?.name ?? "Uncategorized"}
              </span>
              <span className="text-xs text-muted-foreground">{section.goals.length}</span>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="ml-5 space-y-0.5">
                {section.goals.map((goal) => renderGoalRow(goal))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>
    </div>
  );
}
