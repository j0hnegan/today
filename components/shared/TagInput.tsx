"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { mutate } from "swr";
import type { Tag } from "@/lib/types";

const TAG_COLORS = [
  "#6366f1", "#ef4444", "#f59e0b", "#10b981", "#3b82f6",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#6b7280",
  "#a855f7", "#06b6d4", "#84cc16", "#e11d48", "#0ea5e9",
  "#d946ef", "#22d3ee", "#facc15", "#4ade80", "#fb923c",
];

function getRandomColor(existingTags: Tag[]): string {
  const usedColors = new Set(existingTags.map((t) => t.color));
  const unused = TAG_COLORS.filter((c) => !usedColors.has(c));
  if (unused.length > 0) return unused[Math.floor(Math.random() * unused.length)];
  return TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)];
}

interface TagInputProps {
  allTags: Tag[];
  selectedTagIds: number[];
  onTagsChange: (tagIds: number[]) => void;
  onTagCreated?: () => void;
}

export function TagInput({
  allTags,
  selectedTagIds,
  onTagsChange,
  onTagCreated,
}: TagInputProps) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedTags = selectedTagIds
    .map((id) => allTags.find((t) => t.id === id))
    .filter((t): t is Tag => t !== undefined);
  const availableTags = allTags.filter(
    (t) =>
      !selectedTagIds.includes(t.id) &&
      t.name.toLowerCase().includes(search.toLowerCase())
  );
  const exactMatch = allTags.some(
    (t) => t.name.toLowerCase() === search.trim().toLowerCase()
  );
  const alreadySelected = selectedTags.some(
    (t) => t.name.toLowerCase() === search.trim().toLowerCase()
  );

  const canCreate = search.trim() !== "" && !exactMatch && !alreadySelected;

  // Total items in dropdown: available tags + optionally a "create" option
  const totalItems = availableTags.length + (canCreate ? 1 : 0);

  // Reset highlight to 0 (first match) whenever search changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [search]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function addTag(id: number) {
    onTagsChange([...selectedTagIds, id]);
    setSearch("");
    setOpen(false);
  }

  function removeTag(id: number) {
    onTagsChange(selectedTagIds.filter((tid) => tid !== id));
  }

  async function createTag() {
    if (!search.trim() || creating) return;
    setCreating(true);
    try {
      const color = getRandomColor(allTags);
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: search.trim(), color }),
      });
      if (res.status === 409) {
        // Tag exists — find it and add it
        const existing = allTags.find(
          (t) => t.name.toLowerCase() === search.trim().toLowerCase()
        );
        if (existing) addTag(existing.id);
        setSearch("");
        return;
      }
      const newTag = await res.json();
      onTagsChange([...selectedTagIds, newTag.id]);
      setSearch("");
      setOpen(false);
      // Refresh the tag list in SWR
      mutate("/api/tags");
      onTagCreated?.();
    } catch {
      // silently fail
    } finally {
      setCreating(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
      } else {
        setHighlightedIndex((prev) =>
          prev < totalItems - 1 ? prev + 1 : prev
        );
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (!open || totalItems === 0) return;
      if (highlightedIndex < availableTags.length) {
        // Select the highlighted existing tag
        addTag(availableTags[highlightedIndex].id);
      } else if (canCreate) {
        // Create new tag
        createTag();
      }
    } else if (
      e.key === "Backspace" &&
      !search &&
      selectedTagIds.length > 0
    ) {
      removeTag(selectedTagIds[selectedTagIds.length - 1]);
    }
  }

  const showDropdown = open && totalItems > 0;

  return (
    <div ref={containerRef}>
      <label className="text-xs text-muted-foreground font-mono block mb-1.5">Goals</label>

      {/* Search input */}
      <div className="relative">
        <Input
          ref={inputRef}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search or create goals..."
          className="h-10 text-sm"
        />

        {/* Dropdown */}
        {showDropdown && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-48 overflow-auto rounded-[10px] border border-border bg-popover p-1 shadow-md">
            {availableTags.map((tag, i) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => addTag(tag.id)}
                onMouseEnter={() => setHighlightedIndex(i)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors",
                  highlightedIndex === i ? "bg-accent" : ""
                )}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: tag.color }}
                />
                {tag.name}
              </button>
            ))}
            {canCreate && (
              <button
                type="button"
                onClick={createTag}
                onMouseEnter={() => setHighlightedIndex(availableTags.length)}
                disabled={creating}
                className={cn(
                  "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors",
                  highlightedIndex === availableTags.length ? "bg-accent" : "",
                  availableTags.length > 0 && "border-t border-border mt-1 pt-1.5"
                )}
              >
                <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                <span>
                  {creating ? "Creating..." : (
                    <>Add <strong>&quot;{search.trim()}&quot;</strong></>
                  )}
                </span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Selected tag chips — below the input */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2.5">
          {selectedTags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1.5 rounded-[6px] px-3 py-1 text-xs font-mono transition-[background-color] duration-150 cursor-pointer"
              style={{ backgroundColor: `${tag.color}26`, color: tag.color }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${tag.color}40`}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = `${tag.color}26`}
            >
              {tag.name}
              <button
                type="button"
                onClick={() => removeTag(tag.id)}
                className="hover:opacity-70 transition-opacity"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
