"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor, type Editor, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";
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
import type { Note, Task } from "@/lib/types";

const SAVE_DEBOUNCE_MS = 800;

type TiptapDoc = JSONContent & { type: "doc" };

function isTiptapDoc(blocks: unknown): blocks is TiptapDoc {
  return (
    typeof blocks === "object" &&
    blocks !== null &&
    (blocks as { type?: unknown }).type === "doc"
  );
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

function taskBlockContent(ids: number[]) {
  return ids.map((taskId) => ({ type: "taskBlock", attrs: { taskId } }));
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

  // Refs so the suggestion callbacks (created once) always see current state.
  const slashStateRef = useRef(slashState);
  slashStateRef.current = slashState;
  const slashIndexRef = useRef(slashIndex);
  slashIndexRef.current = slashIndex;

  const ctxRef = useRef<SlashContext>({
    openPicker: () => setPickerOpen(true),
    openNewTask: () => setNewTaskOpen(true),
  });

  // --- Saving -------------------------------------------------------------
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<TiptapDoc | null>(null);

  const persist = useCallback(
    async (doc: TiptapDoc) => {
      try {
        const res = await fetch("/api/notes", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date: dateStr, blocks: doc }),
        });
        if (!res.ok) throw new Error();
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
        // StarterKit v3 bundles link/underline; keep the doc simple.
        link: false,
      }),
      Placeholder.configure({
        placeholder: "What is today about? Type / for commands…",
      }),
      TaskBlock,
      SlashCommand.configure({
        suggestion: {
          char: "/",
          items: ({ query }: { query: string }) => filterSlashItems(query),
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

  const editor = useEditor({
    extensions,
    content: isTiptapDoc(note.blocks) ? note.blocks : "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "day-editor-content outline-none min-h-[50vh] text-sm leading-relaxed",
      },
    },
    onUpdate: ({ editor }) => {
      scheduleSave(editor.getJSON() as TiptapDoc);
      setEmbeddedIds(collectTaskIds(editor));
    },
    onCreate: ({ editor }) => {
      setEmbeddedIds(collectTaskIds(editor));
    },
  });

  // --- Task insertion -----------------------------------------------------
  const insertAtSelection = useCallback(
    (ids: number[]) => {
      if (!editor || ids.length === 0) return;
      editor.chain().focus().insertContent(taskBlockContent(ids)).run();
    },
    [editor]
  );

  const appendToDoc = useCallback(
    (tasks: Task[]) => {
      if (!editor || tasks.length === 0) return;
      editor
        .chain()
        .focus("end")
        .insertContent(taskBlockContent(tasks.map((t) => t.id)))
        .run();
    },
    [editor]
  );

  return (
    <>
      {isToday && (
        <DueTodayTray todayStr={dateStr} embeddedIds={embeddedIds} onPull={appendToDoc} />
      )}

      <div className="rounded-[10px] border border-border bg-panel flex flex-col flex-1 min-h-[55vh] md:min-h-0 md:overflow-y-auto p-4 md:p-6">
        <EditorContent editor={editor} className="flex-1" />
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
    </>
  );
}
