"use client";

import { useRef, useCallback, useState, useEffect, useMemo } from "react";
import { GripVertical, Target, Tag as TagIcon, SlidersHorizontal, ArrowUpDown, Check, X, CalendarOff, CalendarPlus } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { createBlock, moveBlock } from "@/lib/blocks";
import type { Block, BlockType, Task, Tag, Size, Goal, Category, Attachment } from "@/lib/types";
import { normalizeConsequence } from "@/lib/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { markTaskDone } from "@/lib/done-toast";
import { patchTask, reorderTasks } from "@/lib/taskMutations";
import { TaskListSkeleton } from "@/components/focus/TaskListSkeleton";

type SortKey = "due_date" | "size" | "goal" | "consequence";
const ALL_SIZES: Size[] = ["xs", "small", "medium", "large"];
const SIZE_LABELS: Record<Size, string> = { xs: "1-15 min", small: "15-30 min", medium: "30-60 min", large: "60+ min" };
const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "due_date", label: "Due date" },
  { value: "size", label: "Size" },
  { value: "goal", label: "Goal" },
  { value: "consequence", label: "Priority" },
];

// Reuse check circle from PagePanel
function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

interface BlockEditorProps {
  blocks: Block[];
  onChange: (blocks: Block[]) => void;
  tasks: Task[];
  inProgressTasks: Task[];
  tasksLoading?: boolean;
  goals: Goal[];
  categories: Category[];
  attachments: Attachment[];
  onCreateTask: (title: string) => void;
  onMarkDone: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  onNotTodayTask: (task: Task) => void;
  onInProgressTask: (task: Task) => void;
  onBackToTodayTask: (task: Task) => void;
  placeholder?: string;
}

export function BlockEditor({
  blocks,
  onChange,
  tasks,
  inProgressTasks,
  tasksLoading = false,
  goals,
  categories,
  attachments,
  onCreateTask,
  onMarkDone,
  onEditTask,
  onDeleteTask,
  onNotTodayTask,
  onInProgressTask,
  onBackToTodayTask,
  placeholder = "Start typing...",
}: BlockEditorProps) {
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);
  const [draggingBlockId, setDraggingBlockId] = useState<string | null>(null);
  const [dropTargetIdx, setDropTargetIdx] = useState<number | null>(null);
  const dropTargetRef = useRef<number | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [hasMovedTaskList, setHasMovedTaskList] = useState(false);
  const blockRefs = useRef<Map<string, HTMLElement>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);

  // Keep ref in sync with state
  useEffect(() => { dropTargetRef.current = dropTargetIdx; }, [dropTargetIdx]);

  // Focus a block's editable element
  const focusBlock = useCallback((blockId: string, atEnd = true) => {
    requestAnimationFrame(() => {
      const el = blockRefs.current.get(blockId);
      if (!el) return;
      const editable = el.querySelector("[contenteditable]") as HTMLElement | null;
      if (!editable) return;
      editable.focus();
      if (atEnd) {
        const sel = window.getSelection();
        if (sel) {
          const range = document.createRange();
          range.selectNodeContents(editable);
          range.collapse(false);
          sel.removeAllRanges();
          sel.addRange(range);
        }
      }
    });
  }, []);

  // Handle text changes in a block
  const handleBlockInput = useCallback(
    (blockId: string, newContent: string) => {
      onChange(blocks.map((b) => (b.id === blockId ? { ...b, content: newContent } : b)));
    },
    [blocks, onChange]
  );

  // Handle keydown in a text block
  const handleBlockKeyDown = useCallback(
    (e: React.KeyboardEvent, block: Block, index: number) => {
      const content = block.content;

      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();

        // Dash to task: "- text" or "-text" creates a task
        const dashMatch = content.match(/^[-–—]\s*(.*)/);
        if (dashMatch && dashMatch[1].trim()) {
          onCreateTask(dashMatch[1].trim());
          // Pre-fill with dash for quick consecutive task creation
          handleBlockInput(block.id, "- ");
          focusBlock(block.id);
          return;
        }

        // Insert new block below
        const newBlock = createBlock("text");
        const newBlocks = [...blocks];
        newBlocks.splice(index + 1, 0, newBlock);
        onChange(newBlocks);
        focusBlock(newBlock.id);
        return;
      }

      if (e.key === "Backspace" && content === "") {
        e.preventDefault();
        if (blocks.length <= 1) return;
        const prevBlock = index > 0 ? blocks[index - 1] : null;

        // If previous block is task-list, activate edit on the last task
        if (prevBlock && prevBlock.type === "task-list" && tasks.length > 0) {
          const lastTask = tasks[tasks.length - 1];
          setEditingTaskId(lastTask.id as number);
          return;
        }

        // Don't merge into other non-editable blocks
        const prevIsEditable = prevBlock && ["text", "heading1", "heading2", "heading3", "bullet-list", "numbered-list", "quote"].includes(prevBlock.type);
        if (index > 0 && !prevIsEditable) return;
        const newBlocks = blocks.filter((b) => b.id !== block.id);
        onChange(newBlocks);
        if (index > 0 && prevBlock) {
          focusBlock(prevBlock.id);
        }
        return;
      }

      // Arrow up at start → focus previous block
      if (e.key === "ArrowUp" && index > 0) {
        const sel = window.getSelection();
        if (sel && sel.anchorOffset === 0) {
          e.preventDefault();
          focusBlock(blocks[index - 1].id);
        }
      }

      // Arrow down at end → focus next block
      if (e.key === "ArrowDown" && index < blocks.length - 1) {
        e.preventDefault();
        focusBlock(blocks[index + 1].id, false);
      }

      // Slash command at start of empty block
      if (e.key === "/" && content === "") {
        // Will be handled by the slash command system in PagePanel
        // Just let it type the "/"
      }
    },
    [blocks, onChange, focusBlock, handleBlockInput, onCreateTask]
  );

  // Handle block type change (from slash commands)
  const changeBlockType = useCallback(
    (blockId: string, newType: BlockType) => {
      onChange(blocks.map((b) => (b.id === blockId ? { ...b, type: newType, content: b.content } : b)));
    },
    [blocks, onChange]
  );

  // Insert a block at index
  const insertBlockAt = useCallback(
    (index: number, block: Block) => {
      const newBlocks = [...blocks];
      newBlocks.splice(index, 0, block);
      onChange(newBlocks);
    },
    [blocks, onChange]
  );

  // Save task title inline — optimistic update via helper
  const saveTaskTitle = useCallback(
    async (taskId: number, newTitle: string) => {
      const trimmed = newTitle.trim();
      const task = tasks.find((t) => t.id === taskId) ?? inProgressTasks.find((t) => t.id === taskId);
      if (task) {
        try {
          await patchTask(task, { title: trimmed });
        } catch {
          /* helper already toasted */
        }
      }
      setEditingTaskId(null);
    },
    [tasks, inProgressTasks]
  );

  // Drag & drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, blockId: string) => {
    e.dataTransfer.setData("text/block-id", blockId);
    e.dataTransfer.effectAllowed = "move";
    setDraggingBlockId(blockId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    if (!e.dataTransfer.types.includes("text/block-id")) return;
    e.preventDefault();
    // Don't update drop target when hovering the dragged block itself
    // (this prevents snapping back to original position)
    if (draggingBlockId && blocks[index]?.id === draggingBlockId) return;
    setDropTargetIdx(index);
  }, [draggingBlockId, blocks]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      if (!e.dataTransfer.types.includes("text/block-id")) return;
      e.preventDefault();
      e.stopPropagation();
      const draggedId = e.dataTransfer.getData("text/block-id");
      const fromIdx = blocks.findIndex((b) => b.id === draggedId);
      const targetIdx = dropTargetRef.current;
      if (fromIdx === -1 || targetIdx === null) return;

      // Only skip if the block wouldn't actually move
      const samePosition = targetIdx === fromIdx;
      if (!samePosition) {
        // Track if the task list was ever moved
        const draggedBlock = blocks[fromIdx];
        if (draggedBlock.type === "task-list") {
          setHasMovedTaskList(true);
        }
        const result = [...blocks];
        const [removed] = result.splice(fromIdx, 1);
        const insertAt = targetIdx > fromIdx ? targetIdx - 1 : targetIdx;
        result.splice(insertAt, 0, removed);
        onChange(result);
      }
      setDraggingBlockId(null);
      setDropTargetIdx(null);
    },
    [blocks, onChange]
  );

  const handleDragEnd = useCallback(() => {
    setDraggingBlockId(null);
    setDropTargetIdx(null);
  }, []);

  // Check if task list is at the default position (index 0)
  const taskListAtTop = blocks.length > 0 && blocks[0].type === "task-list";

  // Render a single block
  const renderBlock = (block: Block, index: number) => {
    const isDragging = draggingBlockId === block.id;
    const isEditable = ["text", "heading1", "heading2", "heading3", "bullet-list", "numbered-list", "quote"].includes(block.type);
    const hasContent = block.type !== "text" || block.content !== "";

    return (
      <div key={block.id} ref={(el) => { if (el) blockRefs.current.set(block.id, el); }}>
        {/* Drop indicator */}
        {dropTargetIdx === index && draggingBlockId !== null && (
          <div className="h-0.5 bg-ring/60 rounded-full my-0.5" />
        )}

        <div
          className={cn(
            "group/block flex items-start gap-1 rounded-lg transition-colors relative",
            isDragging && "opacity-30",
            block.type === "divider" ? "py-1" : "py-0.5",
            isEditable && "min-h-[26px]"
          )}
          onDragOver={(e) => handleDragOver(e, index)}
          onDrop={handleDrop}
        >
          {/* Drag handle — only show for blocks with content, not task-list (has its own) */}
          {block.type !== "task-list" && (
            <div
              className={cn(
                "flex-shrink-0 w-5 h-6 flex items-center justify-center cursor-grab active:cursor-grabbing transition-opacity",
                hasContent ? "opacity-0 group-hover/block:opacity-100" : "opacity-0 pointer-events-none"
              )}
              draggable={hasContent}
              onDragStart={(e) => handleDragStart(e, block.id)}
              onDragEnd={handleDragEnd}
            >
              <GripVertical className="h-3 w-3 text-muted-foreground/40" />
            </div>
          )}

          {/* Block content */}
          <div className="flex-1 min-w-0">
            {block.type === "text" && (
              <EditableText
                content={block.content}
                onChange={(c) => handleBlockInput(block.id, c)}
                onKeyDown={(e) => handleBlockKeyDown(e, block, index)}
                onFocus={() => setFocusedBlockId(block.id)}
                className="text-sm leading-relaxed"
                placeholder={!hasMovedTaskList && taskListAtTop && index === blocks.findIndex((b) => b.type === "text") && block.content === "" ? placeholder : ""}
              />
            )}

            {block.type === "heading1" && (
              <EditableText
                content={block.content}
                onChange={(c) => handleBlockInput(block.id, c)}
                onKeyDown={(e) => handleBlockKeyDown(e, block, index)}
                onFocus={() => setFocusedBlockId(block.id)}
                className="text-xl font-semibold leading-snug"
                placeholder="Heading 1"
              />
            )}

            {block.type === "heading2" && (
              <EditableText
                content={block.content}
                onChange={(c) => handleBlockInput(block.id, c)}
                onKeyDown={(e) => handleBlockKeyDown(e, block, index)}
                onFocus={() => setFocusedBlockId(block.id)}
                className="text-lg font-semibold leading-snug"
                placeholder="Heading 2"
              />
            )}

            {block.type === "heading3" && (
              <EditableText
                content={block.content}
                onChange={(c) => handleBlockInput(block.id, c)}
                onKeyDown={(e) => handleBlockKeyDown(e, block, index)}
                onFocus={() => setFocusedBlockId(block.id)}
                className="text-base font-semibold leading-snug"
                placeholder="Heading 3"
              />
            )}

            {block.type === "bullet-list" && (
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground mt-1.5 text-xs">•</span>
                <EditableText
                  content={block.content}
                  onChange={(c) => handleBlockInput(block.id, c)}
                  onKeyDown={(e) => handleBlockKeyDown(e, block, index)}
                  onFocus={() => setFocusedBlockId(block.id)}
                  className="text-sm leading-relaxed flex-1"
                  placeholder=""
                />
              </div>
            )}

            {block.type === "numbered-list" && (
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground mt-0 text-sm font-mono w-4 text-right flex-shrink-0">
                  {(() => {
                    let num = 1;
                    for (let i = index - 1; i >= 0; i--) {
                      if (blocks[i].type === "numbered-list") num++;
                      else break;
                    }
                    return `${num}.`;
                  })()}
                </span>
                <EditableText
                  content={block.content}
                  onChange={(c) => handleBlockInput(block.id, c)}
                  onKeyDown={(e) => handleBlockKeyDown(e, block, index)}
                  onFocus={() => setFocusedBlockId(block.id)}
                  className="text-sm leading-relaxed flex-1"
                  placeholder=""
                />
              </div>
            )}

            {block.type === "quote" && (
              <div className="border-l-[3px] border-border pl-3">
                <EditableText
                  content={block.content}
                  onChange={(c) => handleBlockInput(block.id, c)}
                  onKeyDown={(e) => handleBlockKeyDown(e, block, index)}
                  onFocus={() => setFocusedBlockId(block.id)}
                  className="text-sm leading-relaxed text-muted-foreground"
                  placeholder="Quote"
                />
              </div>
            )}

            {block.type === "divider" && (
              <hr className="border-t border-border my-2" />
            )}

            {block.type === "task-list" && (
              <div
                className="rounded-lg hover:bg-accent/30 hover:ring-1 hover:ring-ring/10 p-2 transition-colors cursor-grab active:cursor-grabbing"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/block-id", block.id);
                  e.dataTransfer.effectAllowed = "move";
                  setDraggingBlockId(block.id);
                }}
                onDragEnd={handleDragEnd}
              >
                <TaskListContent
                  tasks={tasks}
                  inProgressTasks={inProgressTasks}
                  loading={tasksLoading}
                  onMarkDone={onMarkDone}
                  onEditTask={onEditTask}
                  onDeleteTask={onDeleteTask}
                  onNotTodayTask={onNotTodayTask}
                  onInProgressTask={onInProgressTask}
                  onBackToTodayTask={onBackToTodayTask}
                  editingTaskId={editingTaskId}
                  setEditingTaskId={setEditingTaskId}
                  saveTaskTitle={saveTaskTitle}
                  onEnterAfterEdit={() => {
                    // Focus the next block after the task-list
                    const nextIdx = index + 1;
                    if (nextIdx < blocks.length) {
                      focusBlock(blocks[nextIdx].id);
                    }
                  }}
                />
              </div>
            )}

            {block.type === "goal" && (
              <GoalPill goalId={block.meta?.goalId as number} goals={goals} />
            )}

            {block.type === "category" && (
              <CategoryPill categoryId={block.meta?.categoryId as number} categories={categories} />
            )}

            {block.type === "document" && (
              <div className="inline-flex items-center gap-1.5 rounded-md bg-accent px-2.5 py-1 text-xs cursor-pointer hover:bg-accent/80 transition-colors">
                📄 {block.content || "Untitled"}
              </div>
            )}

            {block.type === "attachment" && (
              <AttachmentBlock meta={block.meta} attachments={attachments} />
            )}
          </div>
        </div>
      </div>
    );
  };

  // Drop indicator at the very end
  const lastDropIndicator = dropTargetIdx === blocks.length && draggingBlockId !== null ? (
    <div className="h-0.5 bg-ring/60 rounded-full my-0.5" />
  ) : null;

  return (
    <div
      ref={containerRef}
      className="block-editor"
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes("text/block-id")) return;
        e.preventDefault();
      }}
      onDrop={handleDrop}
    >
      {/* Top drop zone — ensures you can always drag to the very top */}
      <div
        className="h-2 -mt-2"
        onDragOver={(e) => {
          if (!e.dataTransfer.types.includes("text/block-id")) return;
          e.preventDefault();
          setDropTargetIdx(0);
        }}
        onDrop={handleDrop}
      />
      {blocks.map((block, index) => renderBlock(block, index))}
      {lastDropIndicator}
    </div>
  );
}

/** Editable text div for text-like blocks */
function EditableText({
  content,
  onChange,
  onKeyDown,
  onFocus,
  className,
  placeholder,
}: {
  content: string;
  onChange: (content: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onFocus: () => void;
  className?: string;
  placeholder?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isComposing = useRef(false);

  // Sync content from parent when it changes externally
  useEffect(() => {
    if (ref.current && ref.current.textContent !== content) {
      ref.current.textContent = content;
    }
  }, [content]);

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      className={cn("outline-none whitespace-pre-wrap", className)}
      data-placeholder={placeholder}
      onInput={() => {
        if (!isComposing.current && ref.current) {
          onChange(ref.current.textContent ?? "");
        }
      }}
      onCompositionStart={() => { isComposing.current = true; }}
      onCompositionEnd={() => {
        isComposing.current = false;
        if (ref.current) onChange(ref.current.textContent ?? "");
      }}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
    />
  );
}

/** Long-press check circle that fills up over duration then fires */
function LongPressCheck({ task, onMarkDone, onLongPress }: { task: Task; onMarkDone: (t: Task) => void; onLongPress: (t: Task) => void }) {
  const [pressing, setPressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef<number>(0);
  const firedRef = useRef(false);
  const DURATION = 750; // 0.75 seconds

  const startPress = useCallback(() => {
    firedRef.current = false;
    setPressing(true);
    setProgress(0);
    startRef.current = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const pct = Math.min(elapsed / DURATION, 1);
      setProgress(pct);
      if (pct >= 1) {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        firedRef.current = true;
        setPressing(false);
        setProgress(0);
        onLongPress(task);
      }
    }, 30);
  }, [task, onLongPress]);

  const endPress = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (!firedRef.current && pressing) {
      // Short click — mark done
      onMarkDone(task);
    }
    setPressing(false);
    setProgress(0);
  }, [pressing, task, onMarkDone]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <button
      type="button"
      onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); startPress(); }}
      onMouseUp={endPress}
      onMouseLeave={() => {
        if (pressing) {
          if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
          setPressing(false);
          setProgress(0);
        }
      }}
      onTouchStart={(e) => { e.stopPropagation(); startPress(); }}
      onTouchEnd={endPress}
      className="inline-flex items-center justify-center w-5 h-5 flex-shrink-0 text-muted-foreground group-hover/task:text-green-400 hover:!text-green-400 transition-colors relative"
    >
      {pressing ? (
        <svg viewBox="0 0 24 24" className="h-5 w-5">
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.2" />
          <circle
            cx="12" cy="12" r="9"
            fill="none"
            stroke="rgb(74, 222, 128)"
            strokeWidth="1.5"
            strokeDasharray={`${progress * 56.55} 56.55`}
            strokeLinecap="round"
            transform="rotate(-90 12 12)"
            style={{ transition: "stroke-dasharray 30ms linear" }}
          />
        </svg>
      ) : (
        <CheckCircleIcon className="h-5 w-5" />
      )}
    </button>
  );
}

/** A single task row — used by both Today and In Progress tabs. */
function TaskRow({
  task,
  editingTaskId,
  setEditingTaskId,
  saveTaskTitle,
  onMarkDone,
  onLongPress,
  onDeleteTask,
  onNotTodayTask,
  onEnterAfterEdit,
  isLastRow,
}: {
  task: Task;
  editingTaskId: number | null;
  setEditingTaskId: (id: number | null) => void;
  saveTaskTitle: (id: number, title: string) => void;
  onMarkDone: (task: Task) => void;
  onLongPress: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  onNotTodayTask: (task: Task) => void;
  onEnterAfterEdit?: () => void;
  isLastRow?: boolean;
}) {
  const isEditing = editingTaskId === (task.id as number);

  return (
    <>
      {/* Check circle — click to complete, long-press to move */}
      {!isEditing && (
        <LongPressCheck task={task} onMarkDone={onMarkDone} onLongPress={onLongPress} />
      )}
      {/* Title + due date */}
      {isEditing ? (
        <input
          type="text"
          defaultValue={task.title}
          autoFocus
          className="flex-1 min-w-0 text-left text-sm text-foreground outline-none rounded-md bg-accent/60 border border-border px-2 py-0.5 -my-0.5"
          onBlur={(e) => saveTaskTitle(task.id as number, e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              saveTaskTitle(task.id as number, (e.target as HTMLInputElement).value);
              if (isLastRow && onEnterAfterEdit) onEnterAfterEdit();
            }
            if (e.key === "Escape") setEditingTaskId(null);
          }}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <div className="flex-1 min-w-0 flex items-center gap-1">
          <span
            className="min-w-0 truncate text-left cursor-text"
            onClick={(e) => { e.stopPropagation(); setEditingTaskId(task.id as number); }}
          >
            {task.title}
          </span>
          {task.due_date && (
            <span className="text-xs font-mono flex-shrink-0 text-muted-foreground" style={{ letterSpacing: "-0.25px" }}>
              {`${new Date(task.due_date + "T00:00:00").getMonth() + 1}/${new Date(task.due_date + "T00:00:00").getDate()}`}
            </span>
          )}
        </div>
      )}
      {/* Action buttons — visible on hover */}
      {!isEditing && (
        <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover/task:opacity-100 transition-opacity">
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 h-5 px-1.5 rounded border border-border text-[10px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                title="Set due date"
              >
                <CalendarPlus className="h-3 w-3" />
                <span className="hidden sm:inline">Date</span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end" onClick={(e) => e.stopPropagation()}>
              <Calendar
                mode="single"
                selected={task.due_date ? new Date(task.due_date + "T00:00:00") : undefined}
                onSelect={async (day) => {
                  const dateStr = day
                    ? `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`
                    : null;
                  try {
                    await patchTask(task, { due_date: dateStr });
                  } catch {
                    /* helper already toasted */
                  }
                }}
              />
            </PopoverContent>
          </Popover>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onNotTodayTask(task); }}
            className="inline-flex items-center gap-1 h-5 px-1.5 rounded border border-border text-[10px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Move to someday"
          >
            <CalendarOff className="h-3 w-3" />
            <span className="hidden sm:inline">Not today</span>
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDeleteTask(task); }}
            className="inline-flex items-center justify-center h-5 w-5 rounded bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
            title="Delete task"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
    </>
  );
}

/** Task list rendered inside a block — includes sorting & filtering */
function TaskListContent({
  tasks,
  inProgressTasks,
  loading,
  onMarkDone,
  onEditTask,
  onDeleteTask,
  onNotTodayTask,
  onInProgressTask,
  onBackToTodayTask,
  editingTaskId,
  setEditingTaskId,
  saveTaskTitle,
  onEnterAfterEdit,
}: {
  tasks: Task[];
  inProgressTasks: Task[];
  loading?: boolean;
  onMarkDone: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  onNotTodayTask: (task: Task) => void;
  onInProgressTask: (task: Task) => void;
  onBackToTodayTask: (task: Task) => void;
  editingTaskId: number | null;
  setEditingTaskId: (id: number | null) => void;
  saveTaskTitle: (id: number, title: string) => void;
  onEnterAfterEdit?: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"today" | "in_progress">("today");
  const [draggingTaskIdx, setDraggingTaskIdx] = useState<number | null>(null);
  const [taskDropIdx, setTaskDropIdx] = useState<number | null>(null);
  const taskDropRef = useRef<number | null>(null);
  useEffect(() => { taskDropRef.current = taskDropIdx; }, [taskDropIdx]);
  const [sortKey, setSortKey] = useState<SortKey>("due_date");
  const [sizeFilter, setSizeFilter] = useState<Size[]>([...ALL_SIZES]);

  const toggleSize = (s: Size) => {
    setSizeFilter((prev) => {
      if (prev.length === ALL_SIZES.length) return [s];
      if (prev.includes(s)) {
        const next = prev.filter((x) => x !== s);
        return next.length === 0 ? [...ALL_SIZES] : next;
      }
      return [...prev, s];
    });
  };

  const hasActiveFilters = sizeFilter.length < ALL_SIZES.length;

  const sortedTasks = useMemo(() => {
    let filtered = tasks;
    if (sizeFilter.length < ALL_SIZES.length) {
      filtered = filtered.filter((t) => sizeFilter.includes(t.size));
    }
    return [...tasks].sort((a, b) => {
      const aPri = normalizeConsequence(a.consequence) === "hard" ? 0 : 1;
      const bPri = normalizeConsequence(b.consequence) === "hard" ? 0 : 1;
      let primary = 0;
      switch (sortKey) {
        case "due_date":
          if (a.due_date && b.due_date) primary = a.due_date.localeCompare(b.due_date);
          else if (a.due_date) primary = -1;
          else if (b.due_date) primary = 1;
          break;
        case "size": {
          const order: Record<string, number> = { xs: 0, small: 1, medium: 2, large: 3 };
          primary = (order[a.size] ?? 99) - (order[b.size] ?? 99);
          break;
        }
        case "consequence":
          primary = aPri - bPri;
          break;
      }
      if (primary !== 0) return primary;
      if (sortKey !== "consequence" && aPri !== bPri) return aPri - bPri;
      return (a.id as number) - (b.id as number);
    });
  }, [tasks, sortKey]);

  // Show skeleton while loading initial data
  if (loading && tasks.length === 0 && inProgressTasks.length === 0) {
    return <TaskListSkeleton />;
  }

  if (tasks.length === 0 && inProgressTasks.length === 0) {
    return (
      <div className="text-xs text-muted-foreground italic py-1">
        No tasks today. Type <kbd className="rounded border border-border bg-muted px-1 py-0.5 text-[10px]">-</kbd> to add one.
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <GripVertical className="h-3 w-3 text-muted-foreground/40" />
          <div className="flex items-center gap-0">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setActiveTab("today"); }}
              className={cn(
                "text-xs font-medium uppercase tracking-wider px-1.5 py-0.5 rounded-md transition-colors",
                activeTab === "today"
                  ? "text-foreground"
                  : "text-muted-foreground/50 hover:text-muted-foreground"
              )}
            >
              Today · {tasks.length}
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setActiveTab("in_progress"); }}
              className={cn(
                "text-xs font-medium uppercase tracking-wider px-1.5 py-0.5 rounded-md transition-colors flex items-center gap-1.5",
                activeTab === "in_progress"
                  ? "text-foreground"
                  : "text-muted-foreground/50 hover:text-muted-foreground"
              )}
            >
              In Progress
              {inProgressTasks.length > 0 && (
                <span className="inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-green-500 text-[10px] font-bold text-white leading-none">
                  {inProgressTasks.length}
                </span>
              )}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activeTab !== "today" ? null : <>
          {/* Filter button */}
          <Popover>
            <PopoverTrigger asChild>
              <button className={cn(
                "inline-flex items-center justify-center h-6 w-6 rounded-md border transition-colors",
                hasActiveFilters
                  ? "border-foreground/20 text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-border"
              )}>
                <SlidersHorizontal className="h-3 w-3" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" align="end">
              <span className="text-xs font-medium text-muted-foreground">Size</span>
              <div className="mt-1.5 space-y-0.5">
                {ALL_SIZES.map((s) => {
                  const active = sizeFilter.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleSize(s)}
                      className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-xs transition-colors hover:bg-accent"
                    >
                      <span className={active ? "text-foreground" : "text-muted-foreground"}>
                        {SIZE_LABELS[s]}
                      </span>
                      {active && <Check className="h-3 w-3 text-foreground" />}
                    </button>
                  );
                })}
              </div>
              {hasActiveFilters && (
                <button
                  onClick={() => setSizeFilter([...ALL_SIZES])}
                  className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors text-center py-1 border-t border-border mt-2 pt-2"
                >
                  Reset
                </button>
              )}
            </PopoverContent>
          </Popover>
          {/* Sort button */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="inline-flex items-center gap-1 h-6 px-2 rounded-md bg-accent text-[11px] text-muted-foreground hover:text-foreground transition-colors font-mono">
                <ArrowUpDown className="h-3 w-3" />
                {SORT_OPTIONS.find((o) => o.value === sortKey)?.label ?? "Due date"}
              </button>
            </PopoverTrigger>
          <PopoverContent className="w-36 p-1" align="end">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSortKey(opt.value)}
                className={cn(
                  "flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-xs transition-colors hover:bg-accent",
                  sortKey === opt.value ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {opt.label}
                {sortKey === opt.value && <Check className="h-3 w-3" />}
              </button>
            ))}
          </PopoverContent>
        </Popover>
          </>}
        </div>
      </div>
      {/* Today tab content */}
      {activeTab === "today" && (
        <div className="space-y-0.5">
          {tasks.length === 0 ? (
            <div className="text-xs text-muted-foreground italic py-1">
              No tasks today. Type <kbd className="rounded border border-border bg-muted px-1 py-0.5 text-[10px]">-</kbd> to add one.
            </div>
          ) : (
            <>
              {sortedTasks.map((task, taskIdx) => (
                <div key={task.id}>
                  {taskDropIdx === taskIdx && draggingTaskIdx !== null && draggingTaskIdx !== taskIdx && (
                    <div className="h-0.5 bg-ring/60 rounded-full my-0.5" />
                  )}
                  <div
                    className={cn(
                      "flex w-full items-center gap-1 rounded-lg px-2 h-7 text-sm transition-colors hover:bg-accent/50 group/task",
                      draggingTaskIdx === taskIdx && "opacity-30"
                    )}
                    draggable={editingTaskId !== (task.id as number)}
                    onDragStart={(e) => {
                      e.stopPropagation();
                      e.dataTransfer.setData("text/task-reorder", String(taskIdx));
                      e.dataTransfer.effectAllowed = "move";
                      setDraggingTaskIdx(taskIdx);
                    }}
                    onDragEnd={() => { setDraggingTaskIdx(null); setTaskDropIdx(null); }}
                    onDragOver={(e) => {
                      if (!e.dataTransfer.types.includes("text/task-reorder")) return;
                      e.preventDefault();
                      e.stopPropagation();
                      setTaskDropIdx(taskIdx);
                    }}
                    onDrop={async (e) => {
                      if (!e.dataTransfer.types.includes("text/task-reorder")) return;
                      e.preventDefault();
                      e.stopPropagation();
                      const fromTaskIdx = parseInt(e.dataTransfer.getData("text/task-reorder"), 10);
                      const toTaskIdx = taskDropRef.current;
                      if (toTaskIdx === null || fromTaskIdx === toTaskIdx) return;

                      const reordered = sortedTasks.map((t) => t.id as number);
                      const [movedId] = reordered.splice(fromTaskIdx, 1);
                      reordered.splice(toTaskIdx, 0, movedId);
                      try {
                        await reorderTasks(reordered);
                      } catch {
                        /* helper already toasted */
                      }
                      setDraggingTaskIdx(null);
                      setTaskDropIdx(null);
                    }}
                  >
                    <TaskRow
                      task={task}
                      editingTaskId={editingTaskId}
                      setEditingTaskId={setEditingTaskId}
                      saveTaskTitle={saveTaskTitle}
                      onMarkDone={onMarkDone}
                      onLongPress={onInProgressTask}
                      onDeleteTask={onDeleteTask}
                      onNotTodayTask={onNotTodayTask}
                      onEnterAfterEdit={onEnterAfterEdit}
                      isLastRow={taskIdx === sortedTasks.length - 1}
                    />
                  </div>
                </div>
              ))}
              {taskDropIdx === sortedTasks.length && draggingTaskIdx !== null && (
                <div className="h-0.5 bg-ring/60 rounded-full my-0.5" />
              )}
            </>
          )}
        </div>
      )}

      {/* In Progress tab content — reuses TaskRow for identical look & behavior */}
      {activeTab === "in_progress" && (
        <div className="space-y-0.5">
          {inProgressTasks.length === 0 ? (
            <div className="text-xs text-muted-foreground italic py-1">
              No tasks in progress. Hold the check circle on a task to move it here.
            </div>
          ) : (
            inProgressTasks.map((task) => (
              <div
                key={task.id}
                className="flex w-full items-center gap-1 rounded-lg px-2 h-7 text-sm transition-colors hover:bg-accent/50 group/task"
              >
                <TaskRow
                  task={task}
                  editingTaskId={editingTaskId}
                  setEditingTaskId={setEditingTaskId}
                  saveTaskTitle={saveTaskTitle}
                  onMarkDone={onMarkDone}
                  onLongPress={onBackToTodayTask}
                  onDeleteTask={onDeleteTask}
                  onNotTodayTask={onNotTodayTask}
                />
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/** Goal pill block */
function GoalPill({ goalId, goals }: { goalId: number; goals: Goal[] }) {
  const goal = goals.find((g) => g.id === goalId);
  if (!goal) return <span className="text-xs text-muted-foreground italic">Goal not found</span>;
  const color = goal.category?.color || "#6366f1";
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
      style={{ backgroundColor: color + "20", color }}
    >
      <Target className="h-3 w-3" />
      {goal.title}
    </span>
  );
}

/** Category pill block */
function CategoryPill({ categoryId, categories }: { categoryId: number; categories: Category[] }) {
  const cat = categories.find((c) => c.id === categoryId);
  if (!cat) return <span className="text-xs text-muted-foreground italic">Category not found</span>;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
      style={{ backgroundColor: cat.color + "20", color: cat.color }}
    >
      <TagIcon className="h-3 w-3" />
      {cat.name}
    </span>
  );
}

/** Attachment block */
function AttachmentBlock({ meta, attachments }: { meta?: Record<string, unknown>; attachments: Attachment[] }) {
  const attachmentId = meta?.attachmentId as number | undefined;
  const filename = meta?.filename as string | undefined;
  const att = attachments.find((a) => a.id === attachmentId) || attachments.find((a) => a.filename === filename);

  if (!att) {
    return <span className="text-xs text-muted-foreground italic">Attachment not found</span>;
  }

  const url = `/uploads/${att.filename}`;

  if (att.mime_type.startsWith("image/")) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={att.original_name}
          className="rounded-lg max-w-[300px] max-h-[300px] object-contain border border-border"
        />
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-md bg-accent px-3 py-1.5 text-xs hover:bg-accent/80 transition-colors"
    >
      📎 {att.original_name}
    </a>
  );
}
