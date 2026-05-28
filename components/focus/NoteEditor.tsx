"use client";

import { useRef, useEffect, useCallback, useState, useMemo } from "react";
import DOMPurify from "dompurify";
import { useTasks } from "@/lib/hooks";
import { SlashCommandMenu } from "@/components/shared/SlashCommandMenu";
import { ItemPickerModal } from "@/components/shared/ItemPickerModal";
import { EditorContextMenu } from "@/components/focus/EditorContextMenu";
import { useSlashCommand } from "@/lib/useSlashCommand";
import { SLASH_COMMANDS, buildInlineFileHTML } from "@/lib/slashCommands";
import { createTask } from "@/lib/taskMutations";
import { toast } from "sonner";
import type { Note } from "@/lib/types";

const DEBOUNCE_MS = 500;

interface NoteEditorProps {
  note: Note | undefined;
  dateStr: string;
  noteId: number | null;
  mutateNote: () => void;
}

export function NoteEditor({ note, dateStr, noteId, mutateNote }: NoteEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slashFileInputRef = useRef<HTMLInputElement>(null);
  const loadedDateRef = useRef<string>("");
  const [contextMenu, setContextMenu] = useState<{ top: number; left: number } | null>(null);

  const { data: onDeckTasks } = useTasks({ destination: "on_deck", status: "active" });
  const { data: somedayTasks } = useTasks({ destination: "someday", status: "active" });

  // Load content when note data arrives or date changes
  useEffect(() => {
    if (!editorRef.current || note === undefined) return;
    if (loadedDateRef.current === dateStr) return;
    loadedDateRef.current = dateStr;

    editorRef.current.innerHTML = DOMPurify.sanitize(note?.content ?? "", {
      ADD_TAGS: ["span", "img", "div", "br"],
      ADD_ATTR: [
        "data-inline-file", "data-filename", "data-attachment-id",
        "data-embed-type", "data-embed-id", "data-slash-block",
        "data-natural-w", "data-natural-h", "data-current-w",
        "contenteditable", "class", "style", "alt", "src",
      ],
    });
  }, [note, dateStr]);

  // Reset loaded flag when date changes
  useEffect(() => {
    loadedDateRef.current = "";
  }, [dateStr]);

  // Save helper
  const save = useCallback(async () => {
    const content = editorRef.current?.innerHTML ?? "";
    await fetch("/api/notes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: dateStr, content, blocks: null }),
    });
    mutateNote();
  }, [dateStr, mutateNote]);

  // Debounced content save
  const handleContentInput = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(save, DEBOUNCE_MS);
  }, [save]);

  // Cleanup timeout
  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  // Tab indent (adapted from DocEditor)
  const handleTabIndent = useCallback(
    (outdent: boolean) => {
      const editor = editorRef.current;
      if (!editor) return;
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || !sel.anchorNode || !editor.contains(sel.anchorNode)) return;

      const range = sel.getRangeAt(0);

      if (range.collapsed) {
        if (outdent) {
          sel.modify("move", "backward", "lineboundary");
          sel.modify("extend", "forward", "character");
          sel.modify("extend", "forward", "character");
          const leading = sel.toString();
          if (/^[ \t]{2}$/.test(leading)) {
            document.execCommand("delete");
          } else if (/^[ \t]/.test(leading)) {
            sel.modify("move", "backward", "lineboundary");
            sel.modify("extend", "forward", "character");
            document.execCommand("delete");
          } else {
            sel.collapseToStart();
            return;
          }
        } else {
          document.execCommand("insertText", false, "  ");
        }
        handleContentInput();
      }
    },
    [handleContentInput]
  );

  // Slash commands
  const slashContext = useMemo(
    () => ({ onDeckTasks: onDeckTasks ?? [], somedayTasks: somedayTasks ?? [] }),
    [onDeckTasks, somedayTasks]
  );

  const slash = useSlashCommand({
    editorRef,
    commands: SLASH_COMMANDS,
    context: slashContext,
    onInsertDone: handleContentInput,
  });

  // Paste handling — upload files and insert inline
  const handlePaste = useCallback(
    async (e: React.ClipboardEvent) => {
      const files = e.clipboardData?.files;
      if (!files || files.length === 0 || !noteId) return;

      e.preventDefault();

      // Save cursor position so we can restore after async upload
      const sel = window.getSelection();
      const savedRange = sel && sel.rangeCount > 0 ? sel.getRangeAt(0).cloneRange() : null;

      const uploads: { filename: string; original_name: string; mime_type: string }[] = [];
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append("file", files[i]);
        formData.append("entity_type", "note");
        formData.append("entity_id", String(noteId));
        try {
          const res = await fetch("/api/uploads", { method: "POST", body: formData });
          if (!res.ok) throw new Error();
          const att = await res.json();
          uploads.push({ filename: att.filename, original_name: att.original_name, mime_type: att.mime_type });
        } catch {
          toast.error("Upload failed");
        }
      }

      if (uploads.length > 0) {
        // Restore cursor and insert inline
        if (savedRange && sel) {
          sel.removeAllRanges();
          sel.addRange(savedRange);
        }
        document.execCommand("insertHTML", false, buildInlineFileHTML(uploads));
        handleContentInput();
        mutateNote();
      }
    },
    [noteId, mutateNote, handleContentInput]
  );

  // Slash file upload
  const handleSlashFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0 || !noteId) {
        slash.closePicker();
        e.target.value = "";
        return;
      }
      const uploads: { filename: string; original_name: string; mime_type: string }[] = [];
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append("file", files[i]);
        formData.append("entity_type", "note");
        formData.append("entity_id", String(noteId));
        try {
          const res = await fetch("/api/uploads", { method: "POST", body: formData });
          if (res.ok) {
            const att = await res.json();
            uploads.push({ filename: att.filename, original_name: att.original_name, mime_type: att.mime_type });
          }
        } catch { /* skip */ }
      }
      if (uploads.length > 0) {
        slash.onPickerDone(buildInlineFileHTML(uploads));
        mutateNote();
      } else {
        slash.closePicker();
      }
      e.target.value = "";
    },
    [noteId, slash, mutateNote]
  );

  useEffect(() => {
    if (slash.pickerType === "file" && slashFileInputRef.current) {
      slashFileInputRef.current.click();
    }
  }, [slash.pickerType]);

  // Click handler for embed/inline-file remove buttons
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

  // Double-click → select entire line
  const handleDoubleClick = useCallback(() => {
    requestAnimationFrame(() => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) return;
      sel.modify("extend", "backward", "lineboundary");
      sel.modify("extend", "forward", "lineboundary");
    });
  }, []);

  // Right-click context menu
  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) return;
      e.preventDefault();
      setContextMenu({ top: e.clientY, left: e.clientX });
    },
    []
  );

  const handleFormatBlock = useCallback(
    (tag: string) => {
      if (tag === "insertUnorderedList" || tag === "insertOrderedList") {
        document.execCommand(tag);
      } else {
        document.execCommand("formatBlock", false, tag);
      }
      handleContentInput();
      setContextMenu(null);
    },
    [handleContentInput]
  );

  const handleConvertToTask = useCallback(async () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    const text = sel.toString().trim();
    if (!text) return;

    try {
      await createTask({ title: text, destination: "on_deck", size: "small" });
      toast.success("Task created");
    } catch {
      setContextMenu(null);
      return;
    }

    // Collapse to end of selection, then append ✅
    sel.collapseToEnd();
    sel.modify("extend", "forward", "lineboundary");
    const trailing = sel.toString();
    sel.collapseToEnd();
    if (!trailing.includes("✅")) {
      document.execCommand("insertText", false, " ✅");
    }

    handleContentInput();
    setContextMenu(null);
  }, [handleContentInput]);

  if (note === undefined) return null;

  return (
    <>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={() => { handleContentInput(); slash.onInput(); }}
        onKeyDown={(e) => {
          if (e.key === "Tab" && !slash.isOpen) {
            e.preventDefault();
            handleTabIndent(e.shiftKey);
            return;
          }
          slash.onKeyDown(e);
        }}
        onPaste={handlePaste}
        onClick={handleEditorClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        className="h-full text-sm leading-relaxed outline-none focus:outline-none whitespace-pre-wrap"
        data-placeholder="Start writing..."
      />

      {slash.isOpen && (
        <SlashCommandMenu
          commands={slash.filtered}
          highlightedIndex={slash.highlightedIndex}
          position={slash.position}
          onSelect={slash.select}
          onHover={slash.setHighlightedIndex}
        />
      )}

      {slash.pickerType && slash.pickerType !== "file" && (
        <ItemPickerModal
          type={slash.pickerType}
          open={true}
          onClose={slash.closePicker}
          onAdd={slash.onPickerDone}
        />
      )}

      {contextMenu && (
        <EditorContextMenu
          position={contextMenu}
          onDismiss={() => setContextMenu(null)}
          onFormatBlock={handleFormatBlock}
          onConvertToTask={handleConvertToTask}
        />
      )}

      <input
        ref={slashFileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleSlashFileSelect}
      />
    </>
  );
}
