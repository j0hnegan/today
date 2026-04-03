"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { SlashCommand, SlashCommandContext } from "./slashCommands";

interface UseSlashCommandOptions {
  editorRef: React.RefObject<HTMLDivElement | null>;
  commands: SlashCommand[];
  context: SlashCommandContext;
  onInsertDone: () => void;
}

interface SlashState {
  isOpen: boolean;
  query: string;
  position: { top: number; left: number };
  highlightedIndex: number;
  filtered: SlashCommand[];
  /** Picker to open after a command is selected */
  pickerType: "doc" | "task" | "file" | null;
}

const INITIAL: SlashState = {
  isOpen: false,
  query: "",
  position: { top: 0, left: 0 },
  highlightedIndex: 0,
  filtered: [],
  pickerType: null,
};

/** Find the slash trigger: scans backward from cursor for '/' preceded by whitespace or at start */
function findSlashTrigger(editor: HTMLDivElement): { query: string; range: Range } | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || !sel.isCollapsed) return null;

  const anchor = sel.anchorNode;
  if (!anchor || !editor.contains(anchor)) return null;

  // Must be in a text node
  if (anchor.nodeType !== Node.TEXT_NODE) return null;

  const text = anchor.textContent ?? "";
  const offset = sel.anchorOffset;

  // Scan backward from cursor for '/'
  let slashIdx = -1;
  for (let i = offset - 1; i >= 0; i--) {
    const ch = text[i];
    if (ch === "/") {
      // Must be at start of text node or preceded by whitespace/newline
      if (i === 0 || /\s/.test(text[i - 1])) {
        slashIdx = i;
      }
      break;
    }
    // Stop scanning if we hit a space (no slash command spans spaces)
    if (/\s/.test(ch)) break;
  }

  if (slashIdx === -1) return null;

  const query = text.slice(slashIdx + 1, offset).toLowerCase();

  const range = document.createRange();
  range.setStart(anchor, slashIdx);
  range.setEnd(anchor, offset);

  return { query, range };
}

function filterCommands(commands: SlashCommand[], query: string): SlashCommand[] {
  if (!query) return commands;
  const q = query.toLowerCase();
  const matches = commands.filter((cmd) => {
    const allIds = [cmd.id, ...(cmd.aliases ?? [])];
    return (
      allIds.some((id) => id.includes(q)) ||
      cmd.label.toLowerCase().includes(q) ||
      cmd.description.toLowerCase().includes(q)
    );
  });
  // Sort: exact id/alias prefix first, then id/alias contains, then label/description
  matches.sort((a, b) => {
    const aIds = [a.id, ...(a.aliases ?? [])];
    const bIds = [b.id, ...(b.aliases ?? [])];
    const aIdPrefix = aIds.some((id) => id.startsWith(q)) ? 0 : 1;
    const bIdPrefix = bIds.some((id) => id.startsWith(q)) ? 0 : 1;
    if (aIdPrefix !== bIdPrefix) return aIdPrefix - bIdPrefix;
    const aIdMatch = aIds.some((id) => id.includes(q)) ? 0 : 1;
    const bIdMatch = bIds.some((id) => id.includes(q)) ? 0 : 1;
    return aIdMatch - bIdMatch;
  });
  return matches;
}

export function useSlashCommand({
  editorRef,
  commands,
  context,
  onInsertDone,
}: UseSlashCommandOptions) {
  const [state, setState] = useState<SlashState>(INITIAL);
  const slashRangeRef = useRef<Range | null>(null);
  // Save cursor bookmark for restoring after picker modal steals focus
  const savedSelectionRef = useRef<{ node: Node; offset: number } | null>(null);

  const dismiss = useCallback(() => {
    setState(INITIAL);
    slashRangeRef.current = null;
  }, []);

  // Check for slash trigger on every input
  const onInput = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const result = findSlashTrigger(editor);
    if (!result) {
      if (state.isOpen) dismiss();
      return;
    }

    slashRangeRef.current = result.range;
    const filtered = filterCommands(commands, result.query);
    const rect = result.range.getBoundingClientRect();

    setState((prev) => ({
      isOpen: true,
      query: result.query,
      position: { top: rect.bottom + 4, left: rect.left },
      highlightedIndex: Math.min(prev.highlightedIndex, Math.max(filtered.length - 1, 0)),
      filtered,
      pickerType: null,
    }));
  }, [editorRef, commands, state.isOpen, dismiss]);

  // Insert HTML at the slash range position
  const insertHTML = useCallback(
    (html: string) => {
      const editor = editorRef.current;
      const range = slashRangeRef.current;
      if (!editor || !range) return;

      // Focus editor and select the slash range
      editor.focus();
      const sel = window.getSelection();
      if (!sel) return;
      sel.removeAllRanges();
      sel.addRange(range);

      // Use execCommand for undo support
      document.execCommand("insertHTML", false, html);
      dismiss();
      onInsertDone();
    },
    [editorRef, dismiss, onInsertDone]
  );

  // Select a command
  const select = useCallback(
    (cmd: SlashCommand) => {
      if (cmd.action === "insert" && cmd.getHTML) {
        insertHTML(cmd.getHTML(context));
      } else if ((cmd.action === "picker" && cmd.pickerType) || cmd.action === "file") {
        // Delete the slash text first, then save cursor position for after the modal/file picker
        const editor = editorRef.current;
        const range = slashRangeRef.current;
        if (editor && range) {
          editor.focus();
          const sel = window.getSelection();
          if (sel) {
            sel.removeAllRanges();
            sel.addRange(range);
            document.execCommand("delete");
            // Save cursor position after deleting slash text
            const newSel = window.getSelection();
            if (newSel && newSel.anchorNode) {
              savedSelectionRef.current = {
                node: newSel.anchorNode,
                offset: newSel.anchorOffset,
              };
            }
          }
        }
        setState((prev) => ({
          ...prev,
          isOpen: false,
          pickerType: cmd.action === "file" ? "file" : cmd.pickerType!,
        }));
      }
    },
    [insertHTML, context, editorRef]
  );

  // Handle items selected from picker modal
  const onPickerDone = useCallback(
    (html: string) => {
      const editor = editorRef.current;
      if (!editor) return;
      editor.focus();
      // Restore cursor position saved before modal opened
      const saved = savedSelectionRef.current;
      if (saved && editor.contains(saved.node)) {
        const sel = window.getSelection();
        if (sel) {
          const range = document.createRange();
          range.setStart(saved.node, saved.offset);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
        }
      }
      document.execCommand("insertHTML", false, html);
      savedSelectionRef.current = null;
      setState(INITIAL);
      slashRangeRef.current = null;
      onInsertDone();
    },
    [editorRef, onInsertDone]
  );

  const closePicker = useCallback(() => {
    setState(INITIAL);
    slashRangeRef.current = null;
  }, []);

  const setHighlightedIndex = useCallback((index: number) => {
    setState((prev) => ({ ...prev, highlightedIndex: index }));
  }, []);

  // Keyboard handler
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!state.isOpen || state.filtered.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setState((prev) => ({
          ...prev,
          highlightedIndex: (prev.highlightedIndex + 1) % prev.filtered.length,
        }));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setState((prev) => ({
          ...prev,
          highlightedIndex:
            (prev.highlightedIndex - 1 + prev.filtered.length) % prev.filtered.length,
        }));
      } else if (e.key === "Enter") {
        e.preventDefault();
        select(state.filtered[state.highlightedIndex]);
      } else if (e.key === "Escape") {
        e.preventDefault();
        dismiss();
      }
    },
    [state.isOpen, state.filtered, state.highlightedIndex, select, dismiss]
  );

  // Dismiss on outside click
  useEffect(() => {
    if (!state.isOpen) return;
    function handleMouseDown(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (target.closest("[data-slash-menu]")) return;
      dismiss();
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [state.isOpen, dismiss]);

  return {
    isOpen: state.isOpen,
    filtered: state.filtered,
    highlightedIndex: state.highlightedIndex,
    position: state.position,
    pickerType: state.pickerType,
    select,
    dismiss,
    onKeyDown,
    onInput,
    onPickerDone,
    closePicker,
    setHighlightedIndex,
  };
}
