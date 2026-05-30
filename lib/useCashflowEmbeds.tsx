"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { CashFlowTable } from "@/components/cashflow/CashFlowTable";

/**
 * Serialize editor HTML for persistence: empty every cash-flow placeholder so
 * only the `data-cashflow-id` reference is stored (not the mounted React DOM).
 */
export function serializeEditor(editor: HTMLElement | null): string {
  if (!editor) return "";
  const clone = editor.cloneNode(true) as HTMLElement;
  clone.querySelectorAll("[data-cashflow-id]").forEach((el) => {
    el.innerHTML = "";
  });
  return clone.innerHTML;
}

function isRelevant(mutations: MutationRecord[]): boolean {
  for (const m of mutations) {
    if (m.type !== "childList") continue;
    const touched = [...Array.from(m.addedNodes), ...Array.from(m.removedNodes)];
    if (
      touched.some(
        (n) =>
          n.nodeType === 1 &&
          ((n as Element).matches?.("[data-cashflow-id]") ||
            (n as Element).querySelector?.("[data-cashflow-id]"))
      )
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Mount interactive <CashFlowTable> components into the editor's
 * `[data-cashflow-id]` placeholders via portals. Returns the portals to render
 * inside the editor component.
 */
export function useCashflowEmbeds(
  editorRef: React.RefObject<HTMLElement | null>,
  contentKey: string | number,
  onContentChange: () => void
) {
  const [nodes, setNodes] = useState<{ id: string; node: HTMLElement }[]>([]);

  const rescan = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const els = Array.from(
      editor.querySelectorAll<HTMLElement>("[data-cashflow-id]")
    );
    setNodes((prev) => {
      const next = els.map((el) => ({
        id: el.getAttribute("data-cashflow-id")!,
        node: el,
      }));
      if (
        next.length === prev.length &&
        next.every((n, i) => n.node === prev[i].node && n.id === prev[i].id)
      ) {
        return prev;
      }
      return next;
    });
  }, [editorRef]);

  // Rescan after content (re)loads.
  useEffect(() => {
    rescan();
  }, [rescan, contentKey]);

  // Track placeholders added/removed by slash-insert, delete, undo/redo.
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const obs = new MutationObserver((mutations) => {
      if (isRelevant(mutations)) rescan();
    });
    obs.observe(editor, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, [editorRef, rescan, contentKey]);

  return nodes.map(({ id, node }) =>
    createPortal(
      <CashFlowTable
        id={id}
        onRemove={() => {
          node.remove();
          onContentChange();
        }}
      />,
      node,
      id
    )
  );
}
