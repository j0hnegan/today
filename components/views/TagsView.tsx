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
import { TagsSkeleton } from "@/components/views/TagsSkeleton";
import { mutate } from "swr";
import { toast } from "sonner";
import type { Tag, Goal, Category } from "@/lib/types";

// 20 visually distinct colors — cycles through all before repeating
const TAG_COLORS = [
  "#6366f1", // indigo
  "#ef4444", // red
  "#f59e0b", // amber
  "#10b981", // emerald
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#14b8a6", // teal
  "#f97316", // orange
  "#6b7280", // gray
  "#a855f7", // purple
  "#06b6d4", // cyan
  "#84cc16", // lime
  "#e11d48", // rose
  "#0ea5e9", // sky
  "#d946ef", // fuchsia
  "#22d3ee", // light cyan
  "#facc15", // yellow
  "#4ade80", // light green
  "#fb923c", // light orange
];

function getNextColor(existingTags: Tag[]): string {
  const usedColors = new Set(existingTags.map((t) => t.color));
  const unused = TAG_COLORS.find((c) => !usedColors.has(c));
  if (unused) return unused;
  return TAG_COLORS[existingTags.length % TAG_COLORS.length];
}

function refreshAll() {
  mutate(
    (key: unknown) =>
      typeof key === "string" &&
      (key.startsWith("/api/tags") ||
        key.startsWith("/api/categories") ||
        key.startsWith("/api/goals"))
  );
}

export function TagsView() {
  const { data: tags, isLoading: tagsLoading } = useTags();
  const { data: goals, isLoading: goalsLoading } = useGoals();

  // --- Category state ---
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [confirmDeleteCategoryId, setConfirmDeleteCategoryId] = useState<number | null>(null);
  const [deletingCategoryId, setDeletingCategoryId] = useState<number | null>(null);

  // --- Goal state ---
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [newGoalCategoryId, setNewGoalCategoryId] = useState<string>("none");
  const [creatingGoal, setCreatingGoal] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<number | null>(null);
  const [editGoalTitle, setEditGoalTitle] = useState("");
  const [confirmDeleteGoalId, setConfirmDeleteGoalId] = useState<number | null>(null);
  const [deletingGoalId, setDeletingGoalId] = useState<number | null>(null);

  // --- Collapsible state: track which category sections are open ---
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(["uncategorized"]));

  // Group goals by category
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

  // ===================== Category handlers =====================

  async function handleCreateCategory() {
    if (!newCategoryName.trim()) return;
    setCreatingCategory(true);
    try {
      const color = getNextColor(tags ?? []);
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategoryName.trim(), color }),
      });
      if (res.status === 409) {
        toast.error("Category already exists");
        return;
      }
      if (!res.ok) throw new Error("Failed");
      toast.success("Category created");
      setNewCategoryName("");
      refreshAll();
    } catch {
      toast.error("Failed to create category");
    } finally {
      setCreatingCategory(false);
    }
  }

  function startEditCategory(tag: Tag) {
    setEditingCategoryId(tag.id);
    setEditCategoryName(tag.name);
  }

  function cancelEditCategory() {
    setEditingCategoryId(null);
    setEditCategoryName("");
  }

  async function handleSaveEditCategory() {
    if (!editingCategoryId || !editCategoryName.trim()) return;
    try {
      await fetch(`/api/tags/${editingCategoryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editCategoryName.trim() }),
      });
      toast.success("Category updated");
      refreshAll();
      cancelEditCategory();
    } catch {
      toast.error("Failed to update category");
    }
  }

  async function handleDeleteCategory(tag: Tag) {
    setDeletingCategoryId(tag.id);
    try {
      const res = await fetch(`/api/tags/${tag.id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error("API error");
      toast.success("Category deleted");
      refreshAll();
    } catch {
      toast.error("Failed to delete category");
    } finally {
      setDeletingCategoryId(null);
      setConfirmDeleteCategoryId(null);
    }
  }

  // ===================== Goal handlers =====================

  async function handleCreateGoal() {
    if (!newGoalTitle.trim()) return;
    setCreatingGoal(true);
    try {
      const body: { title: string; category_id?: number } = {
        title: newGoalTitle.trim(),
      };
      if (newGoalCategoryId !== "none") {
        body.category_id = Number(newGoalCategoryId);
      }
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Goal created");
      setNewGoalTitle("");
      setNewGoalCategoryId("none");
      refreshAll();
      // Auto-open the section the goal was added to
      const sectionKey = newGoalCategoryId === "none" ? "uncategorized" : `cat-${newGoalCategoryId}`;
      setOpenSections((prev) => new Set(prev).add(sectionKey));
    } catch {
      toast.error("Failed to create goal");
    } finally {
      setCreatingGoal(false);
    }
  }

  function startEditGoal(goal: Goal) {
    setEditingGoalId(goal.id);
    setEditGoalTitle(goal.title);
  }

  function cancelEditGoal() {
    setEditingGoalId(null);
    setEditGoalTitle("");
  }

  async function handleSaveEditGoal() {
    if (!editingGoalId || !editGoalTitle.trim()) return;
    try {
      await fetch(`/api/goals/${editingGoalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editGoalTitle.trim() }),
      });
      toast.success("Goal updated");
      refreshAll();
      cancelEditGoal();
    } catch {
      toast.error("Failed to update goal");
    }
  }

  async function handleToggleGoalStatus(goal: Goal) {
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

  async function handleDeleteGoal(goal: Goal) {
    setDeletingGoalId(goal.id);
    try {
      const res = await fetch(`/api/goals/${goal.id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error("API error");
      toast.success("Goal deleted");
      refreshAll();
    } catch {
      toast.error("Failed to delete goal");
    } finally {
      setDeletingGoalId(null);
      setConfirmDeleteGoalId(null);
    }
  }

  // ===================== Render =====================

  if (tagsLoading || goalsLoading) {
    return <TagsSkeleton />;
  }

  // Build ordered list of category sections for goals
  const categorySections: { key: string; category: Category | null; goals: Goal[] }[] = [];
  for (const cat of tags ?? []) {
    categorySections.push({
      key: `cat-${cat.id}`,
      category: cat,
      goals: goalsByCategory.get(cat.id) ?? [],
    });
  }
  const uncategorizedGoals = goalsByCategory.get(null) ?? [];
  if (uncategorizedGoals.length > 0) {
    categorySections.push({
      key: "uncategorized",
      category: null,
      goals: uncategorizedGoals,
    });
  }

  function renderGoalRow(goal: Goal) {
    if (editingGoalId === goal.id) {
      return (
        <div
          key={goal.id}
          className="flex items-center gap-3 rounded-[10px] px-3 py-2 hover:bg-accent/30 transition-colors"
        >
          <Input
            value={editGoalTitle}
            onChange={(e) => setEditGoalTitle(e.target.value)}
            className="h-7 text-sm flex-1"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveEditGoal();
              if (e.key === "Escape") cancelEditGoal();
            }}
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleSaveEditGoal}
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={cancelEditGoal}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      );
    }

    if (confirmDeleteGoalId === goal.id) {
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
              onClick={() => setConfirmDeleteGoalId(null)}
              disabled={deletingGoalId === goal.id}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="h-7 text-xs"
              onClick={() => handleDeleteGoal(goal)}
              disabled={deletingGoalId === goal.id}
            >
              {deletingGoalId === goal.id ? "Deleting..." : "Delete"}
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
          onClick={() => handleToggleGoalStatus(goal)}
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
          onClick={() => startEditGoal(goal)}
        >
          {goal.title}
        </span>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => startEditGoal(goal)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => setConfirmDeleteGoalId(goal.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 pt-[80px] pb-8">
      <h1 className="text-lg font-semibold tracking-tight mb-6">Goals</h1>

      {/* ==================== Categories Section ==================== */}
      <section className="mb-10">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
          Categories
        </h2>

        <div className="mb-4">
          <Input
            placeholder="Type a category name and press Enter..."
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateCategory();
            }}
            disabled={creatingCategory}
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
              {editingCategoryId === tag.id ? (
                <>
                  <span
                    className="h-3 w-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: tag.color }}
                  />
                  <Input
                    value={editCategoryName}
                    onChange={(e) => setEditCategoryName(e.target.value)}
                    className="h-7 text-sm flex-1"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveEditCategory();
                      if (e.key === "Escape") cancelEditCategory();
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={handleSaveEditCategory}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={cancelEditCategory}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </>
              ) : confirmDeleteCategoryId === tag.id ? (
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
                      onClick={() => setConfirmDeleteCategoryId(null)}
                      disabled={deletingCategoryId === tag.id}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => handleDeleteCategory(tag)}
                      disabled={deletingCategoryId === tag.id}
                    >
                      {deletingCategoryId === tag.id ? "Deleting..." : "Delete"}
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
                      onClick={() => startEditCategory(tag)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => setConfirmDeleteCategoryId(tag.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ==================== Goals Section ==================== */}
      <section>
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
          Goals
        </h2>

        {/* New goal input */}
        <div className="mb-4 flex gap-2">
          <Input
            placeholder="Type a goal title and press Enter..."
            value={newGoalTitle}
            onChange={(e) => setNewGoalTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateGoal();
            }}
            disabled={creatingGoal}
            className="flex-1"
          />
          <Select value={newGoalCategoryId} onValueChange={setNewGoalCategoryId}>
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

        {/* Goals grouped by category */}
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
                <span className="text-xs text-muted-foreground">
                  {section.goals.length}
                </span>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="ml-5 space-y-0.5">
                  {section.goals.map((goal) => renderGoalRow(goal))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </section>
    </div>
  );
}
