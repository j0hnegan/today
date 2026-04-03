"use client";

import { useRef, useEffect, useCallback, useState, useMemo } from "react";
import { ChevronLeft, Trash2, Check, Paperclip, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useAttachments, useTasks } from "@/lib/hooks";
import { InlineAttachments } from "@/components/shared/FileUpload";
import { SlashCommandMenu } from "@/components/shared/SlashCommandMenu";
import { ItemPickerModal } from "@/components/shared/ItemPickerModal";
import { useSlashCommand } from "@/lib/useSlashCommand";
import { SLASH_COMMANDS, buildInlineFileHTML } from "@/lib/slashCommands";
import { mutate } from "swr";
import { toast } from "sonner";
import type { Document, Category, Goal } from "@/lib/types";

const DEBOUNCE_MS = 500;

function refreshDocs() {
  mutate(
    (key: unknown) => typeof key === "string" && key.startsWith("/api/docs")
  );
}

interface DocEditorProps {
  doc: Document;
  onBack: () => void;
  allCategories: Category[];
  allGoals: Goal[];
}

export function DocEditor({
  doc,
  onBack,
  allCategories,
  allGoals,
}: DocEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attachInputRef = useRef<HTMLInputElement>(null);
  const slashFileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(doc.title);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Selected category/goal IDs
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>(
    () => doc.categories?.map((c) => c.id) ?? []
  );
  const [selectedGoalIds, setSelectedGoalIds] = useState<number[]>(
    () => doc.goals?.map((g) => g.id) ?? []
  );

  // Attachments
  const { data: attachments, mutate: mutateAttachments } = useAttachments("document", doc.id);

  // Tasks for slash command context
  const { data: onDeckTasks } = useTasks({ destination: "on_deck", status: "active" });
  const { data: somedayTasks } = useTasks({ destination: "someday", status: "active" });

  // Popover search states
  const [catSearch, setCatSearch] = useState("");
  const [goalSearch, setGoalSearch] = useState("");

  // Load content into editor
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = doc.content ?? "";
    }
  }, [doc.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save helper
  const save = useCallback(
    async (fields: Record<string, unknown>) => {
      try {
        const res = await fetch(`/api/docs/${doc.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(fields),
        });
        if (!res.ok) throw new Error();
        refreshDocs();
      } catch {
        toast.error("Failed to save");
      }
    },
    [doc.id]
  );

  // Debounced content save
  const handleContentInput = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      const content = editorRef.current?.innerHTML ?? "";
      save({ content });
    }, DEBOUNCE_MS);
  }, [save]);

  // Slash command menu
  const slashContext = useMemo(
    () => ({
      onDeckTasks: onDeckTasks ?? [],
      somedayTasks: somedayTasks ?? [],
    }),
    [onDeckTasks, somedayTasks]
  );

  const slash = useSlashCommand({
    editorRef,
    commands: SLASH_COMMANDS,
    context: slashContext,
    onInsertDone: handleContentInput,
  });

  // Debounced title save
  const handleTitleChange = useCallback(
    (value: string) => {
      setTitle(value);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        save({ title: value });
      }, DEBOUNCE_MS);
    },
    [save]
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Handle paste — check for files first
  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const files = e.clipboardData?.files;
      if (files && files.length > 0) {
        e.preventDefault();
        for (let i = 0; i < files.length; i++) {
          const formData = new FormData();
          formData.append("file", files[i]);
          formData.append("entity_type", "document");
          formData.append("entity_id", String(doc.id));
          fetch("/api/uploads", { method: "POST", body: formData })
            .then((res) => {
              if (!res.ok) throw new Error();
              toast.success(`Uploaded ${files[i].name}`);
              mutateAttachments();
            })
            .catch(() => toast.error("Upload failed"));
        }
      }
    },
    [doc.id, mutateAttachments]
  );

  // Handle Attach button file upload (entity-level attachment)
  const handleAttachUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      setUploading(true);
      try {
        for (let i = 0; i < files.length; i++) {
          const formData = new FormData();
          formData.append("file", files[i]);
          formData.append("entity_type", "document");
          formData.append("entity_id", String(doc.id));
          const res = await fetch("/api/uploads", { method: "POST", body: formData });
          if (!res.ok) throw new Error();
          toast.success(`Uploaded ${files[i].name}`);
        }
        mutateAttachments();
      } catch {
        toast.error("Upload failed");
      } finally {
        setUploading(false);
        e.target.value = "";
      }
    },
    [doc.id, mutateAttachments]
  );

  // Handle slash command /attach file upload (inline insertion)
  const handleSlashFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) {
        slash.closePicker();
        e.target.value = "";
        return;
      }
      const uploads: { filename: string; original_name: string; mime_type: string }[] = [];
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append("file", files[i]);
        formData.append("entity_type", "document");
        formData.append("entity_id", String(doc.id));
        try {
          const res = await fetch("/api/uploads", { method: "POST", body: formData });
          if (res.ok) {
            const att = await res.json();
            uploads.push({ filename: att.filename, original_name: att.original_name, mime_type: att.mime_type });
          }
        } catch { /* skip failed uploads */ }
      }
      if (uploads.length > 0) {
        slash.onPickerDone(buildInlineFileHTML(uploads));
        mutateAttachments();
      } else {
        slash.closePicker();
      }
      e.target.value = "";
    },
    [doc.id, slash, mutateAttachments]
  );

  // Open file picker when slash command triggers file action
  useEffect(() => {
    if (slash.pickerType === "file" && slashFileInputRef.current) {
      slashFileInputRef.current.click();
    }
  }, [slash.pickerType]);

  // Handle click on embed remove button (::after pseudo-element area)
  const handleEditorClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      const removable = target.closest(".slash-embed, .slash-block, .slash-inline-file, .slash-inline-file-link");
      if (!removable) return;

      const rect = removable.getBoundingClientRect();
      if (e.clientX >= rect.right - 24 && e.clientY <= rect.top + 24) {
        e.preventDefault();
        e.stopPropagation();
        removable.remove();
        handleContentInput();
      }
    },
    [handleContentInput]
  );

  // Toggle category
  function toggleCategory(catId: number) {
    setSelectedCategoryIds((prev) => {
      const next = prev.includes(catId)
        ? prev.filter((id) => id !== catId)
        : [...prev, catId];
      save({ category_ids: next });
      return next;
    });
  }

  // Toggle goal
  function toggleGoal(goalId: number) {
    setSelectedGoalIds((prev) => {
      const next = prev.includes(goalId)
        ? prev.filter((id) => id !== goalId)
        : [...prev, goalId];
      save({ goal_ids: next });
      return next;
    });
  }

  // Delete
  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/docs/${doc.id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error();
      toast.success("Document deleted");
      refreshDocs();
      onBack();
    } catch {
      toast.error("Failed to delete document");
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 pt-[80px] pb-8">
      {/* Back button */}
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Docs
      </button>

      {/* Title */}
      <input
        ref={titleRef}
        value={title}
        onChange={(e) => handleTitleChange(e.target.value)}
        className="w-full text-2xl font-semibold tracking-tight bg-transparent border-none outline-none focus:outline-none mb-4 placeholder:text-muted-foreground"
        placeholder="Untitled"
      />

      {/* Category, goal selectors, and Attach button */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {/* Attach button */}
        <button
          type="button"
          onClick={() => attachInputRef.current?.click()}
          className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-dashed border-border text-xs text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
        >
          {uploading ? (
            <Upload className="h-3 w-3 animate-pulse" />
          ) : (
            <Paperclip className="h-3 w-3" />
          )}
          {uploading ? "Uploading..." : "Attach"}
        </button>

        {/* Category selector */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-1 h-7 px-2.5 rounded-md border text-xs transition-colors",
                selectedCategoryIds.length > 0
                  ? "border-foreground/20 text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              Categories
              {selectedCategoryIds.length > 0 && (
                <span className="ml-0.5 text-[10px] opacity-60">
                  {selectedCategoryIds.length}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2" align="start">
            <input
              value={catSearch}
              onChange={(e) => setCatSearch(e.target.value)}
              placeholder="Search..."
              className="w-full h-7 text-xs mb-1 border-0 bg-transparent outline-none px-2 text-foreground placeholder:text-muted-foreground"
              autoFocus
            />
            <div className="max-h-48 overflow-auto space-y-0.5">
              {allCategories
                .filter((c) =>
                  c.name.toLowerCase().includes(catSearch.toLowerCase())
                )
                .map((cat) => {
                  const active = selectedCategoryIds.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => toggleCategory(cat.id)}
                      className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-xs transition-colors hover:bg-accent"
                    >
                      <span
                        className={cn(
                          "flex items-center gap-2",
                          active ? "text-foreground" : "text-muted-foreground"
                        )}
                      >
                        <span
                          className="h-2 w-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: cat.color }}
                        />
                        {cat.name}
                      </span>
                      {active && <Check className="h-3 w-3 text-foreground" />}
                    </button>
                  );
                })}
              {allCategories.length === 0 && (
                <p className="text-xs text-muted-foreground px-2 py-1.5">
                  No categories
                </p>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Goal selector */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-1 h-7 px-2.5 rounded-md border text-xs transition-colors",
                selectedGoalIds.length > 0
                  ? "border-foreground/20 text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              Goals
              {selectedGoalIds.length > 0 && (
                <span className="ml-0.5 text-[10px] opacity-60">
                  {selectedGoalIds.length}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2" align="start">
            <input
              value={goalSearch}
              onChange={(e) => setGoalSearch(e.target.value)}
              placeholder="Search..."
              className="w-full h-7 text-xs mb-1 border-0 bg-transparent outline-none px-2 text-foreground placeholder:text-muted-foreground"
              autoFocus
            />
            <div className="max-h-48 overflow-auto space-y-0.5">
              {allGoals
                .filter((g) =>
                  g.title.toLowerCase().includes(goalSearch.toLowerCase())
                )
                .map((goal) => {
                  const active = selectedGoalIds.includes(goal.id);
                  return (
                    <button
                      key={goal.id}
                      type="button"
                      onClick={() => toggleGoal(goal.id)}
                      className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-xs transition-colors hover:bg-accent"
                    >
                      <span
                        className={
                          active ? "text-foreground" : "text-muted-foreground"
                        }
                      >
                        {goal.title}
                      </span>
                      {active && <Check className="h-3 w-3 text-foreground" />}
                    </button>
                  );
                })}
              {allGoals.length === 0 && (
                <p className="text-xs text-muted-foreground px-2 py-1.5">
                  No goals
                </p>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Selected chips */}
        {selectedCategoryIds.map((id) => {
          const cat = allCategories.find((c) => c.id === id);
          if (!cat) return null;
          return (
            <span
              key={`cat-${cat.id}`}
              className="inline-flex items-center rounded-[6px] px-1.5 py-0.5 text-[10px] font-medium"
              style={{
                backgroundColor: cat.color + "26",
                color: cat.color,
              }}
            >
              {cat.name}
            </span>
          );
        })}
        {selectedGoalIds.map((id) => {
          const goal = allGoals.find((g) => g.id === id);
          if (!goal) return null;
          return (
            <span
              key={`goal-${goal.id}`}
              className="inline-flex items-center rounded-[6px] px-1.5 py-0.5 text-[10px] font-medium bg-accent text-muted-foreground"
            >
              {goal.title}
            </span>
          );
        })}
      </div>

      {/* Content editor */}
      <div className="rounded-[10px] border border-border bg-panel p-6 min-h-[calc(20*1.625em)]">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={() => { handleContentInput(); slash.onInput(); }}
          onKeyDown={slash.onKeyDown}
          onPaste={handlePaste}
          onClick={handleEditorClick}
          className="h-full text-sm leading-relaxed outline-none focus:outline-none whitespace-pre-wrap"
          data-placeholder="Start writing..."
        />

        {/* Inline attachments */}
        {attachments && attachments.length > 0 && (
          <InlineAttachments attachments={attachments} />
        )}
      </div>

      {/* Slash command menu */}
      {slash.isOpen && (
        <SlashCommandMenu
          commands={slash.filtered}
          highlightedIndex={slash.highlightedIndex}
          position={slash.position}
          onSelect={slash.select}
          onHover={slash.setHighlightedIndex}
        />
      )}

      {/* Item picker modal (doc/task) — file type handled via hidden input */}
      {slash.pickerType && slash.pickerType !== "file" && (
        <ItemPickerModal
          type={slash.pickerType}
          open={true}
          onClose={slash.closePicker}
          onAdd={slash.onPickerDone}
        />
      )}

      {/* Hidden file inputs */}
      <input
        ref={attachInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleAttachUpload}
      />
      <input
        ref={slashFileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleSlashFileSelect}
      />

      {/* Delete button */}
      <div className="mt-6 flex justify-end">
        {confirmDelete ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-destructive">Delete this document?</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setConfirmDelete(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="h-7 text-xs"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground hover:text-destructive gap-1.5"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        )}
      </div>
    </div>
  );
}
