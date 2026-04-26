"use client";

import { useRef, useCallback, useState, useEffect } from "react";
import { Target, Tag as TagIcon, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { createBlock } from "@/lib/blocks";
import type { Block, Task, Goal, Category, Attachment } from "@/lib/types";
import { patchTask } from "@/lib/taskMutations";
import { TaskListPanel } from "@/components/focus/TaskListPanel";

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
  const [, setFocusedBlockId] = useState<string | null>(null);
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

        // Dash to task — only on the first line immediately below the task-list block.
        // Anywhere else, a dash should behave like a normal character (unbulleted list, etc.)
        const isFirstLineBelowTaskList = blocks[index - 1]?.type === "task-list";
        if (isFirstLineBelowTaskList) {
          const dashMatch = content.match(/^[-–—]\s*(.*)/);
          if (dashMatch && dashMatch[1].trim()) {
            onCreateTask(dashMatch[1].trim());
            // Pre-fill with dash for quick consecutive task creation
            handleBlockInput(block.id, "- ");
            focusBlock(block.id);
            return;
          }
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
    [blocks, onChange, focusBlock, handleBlockInput, onCreateTask, tasks]
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
                <TaskListPanel
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
