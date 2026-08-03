"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor, type Editor, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";
import { CheckCircle2, CalendarX2, X } from "lucide-react";
import { toast } from "sonner";
import { TaskBlock } from "./TaskBlockExtension";
import {
  SlashCommand,
  filterSlashItems,
  type SlashContext,
  type SlashItem,
} from "./SlashCommand";
import { SlashMenu } from "./SlashMenu";
import { TaskPickerModal } from "./TaskPickerModal";
import { NewTaskDialog } from "./NewTaskDialog";
import { DueTodayTray } from "./DueTodayTray";
import { DaySelectionContext } from "./selection";
import { useDayDocRealtime, type DayDocChange } from "./useDayDocRealtime";
import { useTasks } from "@/lib/hooks";
import { markTaskDone } from "@/lib/done-toast";
import { moveToUpcoming } from "@/lib/taskMutations";
import { mutate } from "@/lib/swr-helpers";
import type { Note, Task } from "@/lib/types";

const SAVE_DEBOUNCE_MS = 800;

export type TiptapDoc = JSONContent & { type: "doc" };

export function isTiptapDoc(blocks: unknown): blocks is TiptapDoc {
  return (
    typeof blocks === "object" &&
    blocks !== null &&
    (blocks as { type?: unknown }).type === "doc"
  );
}

// Task pills used to be block-level nodes; they're inline now. Wrap any
// top-level taskBlock from an older doc in a paragraph so old docs still load.
export function normalizeDoc(blocks: unknown): TiptapDoc | "" {
  if (!isTiptapDoc(blocks)) return "";
  const content = (blocks.content ?? []).map((node) =>
    node.type === "taskBlock" ? { type: "paragraph", content: [node] } : node
  );
  return { ...blocks, content };
}

function collectTaskIds(editor: Editor): Set<number> {
  const ids = new Set<number>();
  editor.state.doc.descendants((node) => {
    if (node.type.name === "taskBlock" && node.attrs.taskId != null) {
      ids.add(node.attrs.taskId as number);
    }
  });
  return ids;
}

/** Task ids in document order (for shift-click range selection). */
function orderedTaskIds(editor: Editor): number[] {
  const ids: number[] = [];
  editor.state.doc.descendants((node) => {
    if (node.type.name === "taskBlock" && node.attrs.taskId != null) {
      ids.push(node.attrs.taskId as number);
    }
  });
  return ids;
}

// Each task gets its own line, but as an inline pill inside a paragraph — so
// you can click beside it and type on the same line.
function taskParagraphs(ids: number[]) {
  return ids.map((taskId) => ({
    type: "paragraph",
    content: [{ type: "taskBlock", attrs: { taskId } }],
  }));
}

export function DayDoc({ note, dateStr, isToday }: { note: Note; dateStr: string; isToday: boolean }) {
  const [slashState, setSlashState] = useState<{
    items: SlashItem[];
    rect: DOMRect | null;
    command: (item: SlashItem) => void;
  } | null>(null);
  const [slashIndex, setSlashIndex] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [embeddedIds, setEmbeddedIds] = useState<Set<number>>(new Set());
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const anchorRef = useRef<number | null>(null);
  const { data: allTasks } = useTasks();

  // Refs so the suggestion callbacks (created once) always see current state.
  const slashStateRef = useRef(slashState);
  slashStateRef.current = slashState;
  const slashIndexRef = useRef(slashIndex);
  slashIndexRef.current = slashIndex;
  const tasksRef = useRef<Task[]>([]);
  tasksRef.current = allTasks ?? [];

  const editorRef = useRef<Editor | null>(null);
  const ctxRef = useRef<SlashContext>({
    openPicker: () => setPickerOpen(true),
    openNewTask: () => setNewTaskOpen(true),
    getTasks: () => tasksRef.current,
    insertTasks: (ids) => {
      if (!editorRef.current || ids.length === 0) return;
      editorRef.current.chain().focus().insertContent(taskParagraphs(ids)).run();
    },
  });

  // --- Saving -------------------------------------------------------------
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<TiptapDoc | null>(null);
  // updated_at of our last successful save — realtime events at or before
  // this stamp are our own echoes and must not round-trip into the editor.
  const lastSavedAtRef = useRef<string>(note.updated_at ?? "");
  const lastEditAtRef = useRef(0);

  const persist = useCallback(
    async (doc: TiptapDoc) => {
      try {
        const res = await fetch("/api/notes", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date: dateStr, blocks: doc }),
          // The unmount flush fires while navigating away; keepalive lets the
          // request outlive the page transition instead of being aborted.
          keepalive: true,
        });
        if (!res.ok) throw new Error();
        const row = (await res.json()) as { updated_at?: string };
        if (row.updated_at && row.updated_at > lastSavedAtRef.current) {
          lastSavedAtRef.current = row.updated_at;
        }
      } catch {
        toast.error("Failed to save");
      }
    },
    [dateStr]
  );

  const scheduleSave = useCallback(
    (doc: TiptapDoc) => {
      pendingRef.current = doc;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        pendingRef.current = null;
        void persist(doc);
      }, SAVE_DEBOUNCE_MS);
    },
    [persist]
  );

  // Flush an unsaved doc when navigating away from the date / unmounting.
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (pendingRef.current) void persist(pendingRef.current);
    };
  }, [persist]);

  // --- Editor -------------------------------------------------------------
  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: false,
      }),
      Placeholder.configure({
        placeholder: "What is today about? Type / for commands…",
      }),
      TaskBlock,
      SlashCommand.configure({
        suggestion: {
          char: "/",
          items: ({ query }: { query: string }) => filterSlashItems(query, ctxRef.current),
          command: ({ editor, range, props }) =>
            props.run(editor, range, ctxRef.current),
          render: () => ({
            onStart: (props) => {
              setSlashIndex(0);
              setSlashState({
                items: props.items,
                rect: props.clientRect?.() ?? null,
                command: props.command,
              });
            },
            onUpdate: (props) => {
              setSlashIndex(0);
              setSlashState({
                items: props.items,
                rect: props.clientRect?.() ?? null,
                command: props.command,
              });
            },
            onKeyDown: ({ event }) => {
              const state = slashStateRef.current;
              if (!state) return false;
              if (event.key === "ArrowDown") {
                setSlashIndex((i) => (i + 1) % Math.max(state.items.length, 1));
                return true;
              }
              if (event.key === "ArrowUp") {
                setSlashIndex(
                  (i) => (i - 1 + state.items.length) % Math.max(state.items.length, 1)
                );
                return true;
              }
              if (event.key === "Enter" || event.key === "Tab") {
                const item = state.items[slashIndexRef.current];
                if (item) state.command(item);
                return true;
              }
              if (event.key === "Escape") {
                setSlashState(null);
                return true;
              }
              return false;
            },
            onExit: () => setSlashState(null),
          }),
        },
      }),
    ],
    []
  );

  // Sync content that changed server-side (or arrived after a stale SWR
  // cache seeded the editor). Without this, returning to the Day view could
  // load an old cached doc and the next autosave would clobber newer notes.
  // --- Live sync (other tabs / devices / MCP) -----------------------------
  // Remote changes apply as soon as the editor is quiet: no pending save and
  // no keystroke in the last 1.5s. While the user is mid-typing the change
  // queues and retries — their in-flight save supersedes older remote state
  // via the updated_at guard.
  const remoteQueueRef = useRef<DayDocChange | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tryApplyRemote = useCallback(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    const change = remoteQueueRef.current;
    const ed = editorRef.current;
    if (!change || !ed || ed.isDestroyed) return;
    if (change.updated_at <= lastSavedAtRef.current) {
      remoteQueueRef.current = null;
      return;
    }
    const busy = pendingRef.current !== null || Date.now() - lastEditAtRef.current < 1500;
    if (busy) {
      retryTimerRef.current = setTimeout(tryApplyRemote, 1000);
      return;
    }
    remoteQueueRef.current = null;
    const incoming = normalizeDoc(change.blocks);
    if (incoming === "") return;
    if (JSON.stringify(incoming) !== JSON.stringify(ed.getJSON())) {
      const sel = ed.state.selection.from;
      ed.commands.setContent(incoming);
      if (ed.isFocused) {
        ed.commands.setTextSelection(Math.min(sel, ed.state.doc.content.size));
      }
      setEmbeddedIds(collectTaskIds(ed));
    }
    lastSavedAtRef.current = change.updated_at;
  }, []);

  useEffect(() => {
    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, []);

  useDayDocRealtime(dateStr, (change) => {
    if (change.updated_at <= lastSavedAtRef.current) return; // own echo / stale
    remoteQueueRef.current = change;
    // Keep the SWR cache in step so a remount doesn't resurrect old content.
    mutate(
      `/api/notes?date=${dateStr}`,
      (curr: Note | undefined) =>
        curr ? { ...curr, blocks: change.blocks, updated_at: change.updated_at } : curr,
      { revalidate: false }
    );
    tryApplyRemote();
  });

  const noteBlocks = note.blocks;
  useEffect(() => {
    const ed = editorRef.current;
    if (!ed || ed.isDestroyed) return;
    // Never yank content out from under active typing or an unsaved edit.
    if (ed.isFocused || pendingRef.current) return;
    const incoming = normalizeDoc(noteBlocks);
    if (incoming === "") return;
    if (JSON.stringify(incoming) !== JSON.stringify(ed.getJSON())) {
      ed.commands.setContent(incoming);
      setEmbeddedIds(collectTaskIds(ed));
    }
  }, [noteBlocks]);

  const editor = useEditor({
    extensions,
    content: normalizeDoc(note.blocks),
    immediatelyRender: false,
    editorProps: {
      attributes: {
        // The big bottom padding is the Google-Docs-style runway: the doc
        // scrolls past its content so there's always room to type or drop a
        // pill below. Clicks in the padding land the cursor at the doc end.
        class: "day-editor-content outline-none min-h-[60vh] pb-[35vh] text-sm leading-relaxed",
      },
    },
    onUpdate: ({ editor }) => {
      lastEditAtRef.current = Date.now();
      scheduleSave(editor.getJSON() as TiptapDoc);
      setEmbeddedIds(collectTaskIds(editor));
      // Drop selections for pills that left the doc.
      setSelected((prev) => {
        const inDoc = collectTaskIds(editor);
        const next = new Set(Array.from(prev).filter((id) => inDoc.has(id)));
        return next.size === prev.size ? prev : next;
      });
    },
    onCreate: ({ editor }) => {
      setEmbeddedIds(collectTaskIds(editor));
    },
  });
  editorRef.current = editor;

  // --- Task insertion -----------------------------------------------------
  const insertAtSelection = useCallback(
    (ids: number[]) => {
      if (!editor || ids.length === 0) return;
      editor.chain().focus().insertContent(taskParagraphs(ids)).run();
    },
    [editor]
  );

  const appendToDoc = useCallback(
    (tasks: Task[]) => {
      if (!editor || tasks.length === 0) return;
      editor
        .chain()
        .focus("end")
        .insertContent(taskParagraphs(tasks.map((t) => t.id)))
        .run();
    },
    [editor]
  );

  // --- Multi-select (shift-click range, cmd-click toggle) -----------------
  const onPillClick = useCallback(
    (taskId: number, e: React.MouseEvent): boolean => {
      if (!editor) return false;
      if (e.shiftKey && anchorRef.current !== null) {
        const order = orderedTaskIds(editor);
        const a = order.indexOf(anchorRef.current);
        const b = order.indexOf(taskId);
        if (a !== -1 && b !== -1) {
          const range = order.slice(Math.min(a, b), Math.max(a, b) + 1);
          setSelected(new Set(range));
          return true;
        }
      }
      // Cmd/ctrl (or first shift) click: toggle + set anchor.
      anchorRef.current = taskId;
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(taskId)) next.delete(taskId);
        else next.add(taskId);
        return next;
      });
      return true;
    },
    [editor]
  );

  const selectionCtx = useMemo(() => ({ selected, onPillClick }), [selected, onPillClick]);

  const clearSelection = useCallback(() => {
    setSelected(new Set());
    anchorRef.current = null;
  }, []);

  const selectedTasks = useMemo(
    () => (allTasks ?? []).filter((t) => selected.has(t.id)),
    [allTasks, selected]
  );

  const removeSelectedFromDoc = useCallback(() => {
    if (!editor) return;
    const ranges: { from: number; to: number }[] = [];
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === "taskBlock" && selected.has(node.attrs.taskId as number)) {
        ranges.push({ from: pos, to: pos + node.nodeSize });
      }
    });
    let chain = editor.chain().focus();
    for (const r of ranges.reverse()) chain = chain.deleteRange(r);
    chain.run();
    clearSelection();
  }, [editor, selected, clearSelection]);

  return (
    <DaySelectionContext.Provider value={selectionCtx}>
      {isToday && (
        <DueTodayTray todayStr={dateStr} embeddedIds={embeddedIds} onPull={appendToDoc} />
      )}

      <div
        className="rounded-[10px] border border-border bg-panel flex flex-col flex-1 p-4 md:p-6"
        onClick={(e) => {
          // Clicking the empty area below the editor drops the cursor at the end.
          if (e.target === e.currentTarget) editor?.chain().focus("end").run();
        }}
      >
        <EditorContent editor={editor} />
      </div>

      {slashState && (
        <SlashMenu
          items={slashState.items}
          rect={slashState.rect}
          index={slashIndex}
          onSelect={(item) => slashState.command(item)}
          onHover={setSlashIndex}
        />
      )}

      {/* Floating bulk-action bar for multi-selected pills */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 rounded-full border border-border bg-popover px-3 py-1.5 shadow-lg">
          <span className="text-xs text-muted-foreground pr-2">
            {selected.size} selected
          </span>
          <button
            type="button"
            onClick={() => {
              selectedTasks.forEach((t) => void markTaskDone(t));
              clearSelection();
            }}
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs hover:bg-accent transition-colors"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Done
          </button>
          <button
            type="button"
            onClick={() => {
              selectedTasks.forEach((t) => void moveToUpcoming(t));
              clearSelection();
            }}
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs hover:bg-accent transition-colors"
          >
            <CalendarX2 className="h-3.5 w-3.5" />
            Not today
          </button>
          <button
            type="button"
            onClick={removeSelectedFromDoc}
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs hover:bg-accent transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            Remove from doc
          </button>
          <button
            type="button"
            onClick={clearSelection}
            className="ml-1 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Clear selection"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <TaskPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        excludeIds={embeddedIds}
        onAdd={(ids) => {
          setPickerOpen(false);
          insertAtSelection(ids);
        }}
      />

      <NewTaskDialog
        open={newTaskOpen}
        onClose={() => setNewTaskOpen(false)}
        onCreated={(task) => insertAtSelection([task.id])}
      />
    </DaySelectionContext.Provider>
  );
}
