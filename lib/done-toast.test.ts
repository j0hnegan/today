import assert from "node:assert/strict";
import test from "node:test";
import { registerTaskUndo } from "./done-toast";

test("completion undo handles Cmd/Ctrl-Z once, leaves redo and later text edits alone", () => {
  const target = new EventTarget();
  Object.assign(globalThis, { document: target });
  let undos = 0;
  function key(modifiers: Record<string, boolean>) {
    const event = new Event("keydown", { cancelable: true });
    Object.assign(event, { key: "z", ...modifiers });
    target.dispatchEvent(event);
    return event.defaultPrevented;
  }
  try {
    registerTaskUndo(() => { undos++; });
    assert.equal(key({ metaKey: true, shiftKey: true }), false);
    assert.equal(key({ metaKey: true }), true);
    assert.equal(key({ metaKey: true }), false);
    assert.equal(undos, 1);

    registerTaskUndo(() => { undos += 10; });
    registerTaskUndo(() => { undos++; });
    assert.equal(key({ ctrlKey: true }), true);
    assert.equal(undos, 2);

    registerTaskUndo(() => { undos++; });
    target.dispatchEvent(new Event("beforeinput"));
    assert.equal(key({ metaKey: true }), false);
    assert.equal(undos, 2);
  } finally {
    Reflect.deleteProperty(globalThis, "document");
  }
});
