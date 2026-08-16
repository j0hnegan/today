# Task Pill Caret Boundary Design

## Problem

A task pill is an inline ProseMirror atom. When a paragraph ends immediately
after that atom, clicking beside the pill exposes ProseMirror's special node
boundary position. The caret at that position is taller than a normal text
caret. Typing a space creates a regular text position, making the caret small
again, but it also reveals that text could otherwise be typed directly against
the pill border.

Previous fixes changed the pill wrapper and paragraph styling. They did not
change the document position where the selection lands, so they addressed the
appearance around the boundary instead of the boundary itself.

## Intended Behavior

- Every task pill has exactly one non-breaking separator space before any text
  that follows it.
- Clicking immediately beside a pill places the caret after that separator.
- Typing `hello` at that position produces `［task pill］ hello` without requiring
  the user to press Space first.
- The caret uses normal text height and never exposes the raw atom boundary.
- At an otherwise empty pill boundary, Backspace selects the pill rather than
  deleting the separator and revealing the oversized caret.
- Ordinary prose paragraphs and text that does not follow a task pill are
  unchanged.

## Design

The task-block extension will own the separator behavior because it owns the
inline atom and its ProseMirror selection semantics.

New task paragraphs will be created with a task block followed by a non-breaking
space text node. Existing documents will be normalized in memory so a task at
the end of a paragraph gains the same separator before the editor renders it.
The normalized document will persist through the existing save flow; no
database migration is required.

A focused ProseMirror plugin will enforce the interaction rules:

1. When a click resolves to the position between a task block and its separator,
   move the text selection to the position after the separator.
2. When Backspace is pressed immediately after a separator with no following
   text, select the preceding task block instead of deleting the separator.
3. Preserve one separator when transactions would otherwise leave a task block
   directly adjacent to following text.

The separator is document content, not a CSS pseudo-element. This ensures the
caret, typing, keyboard navigation, copy behavior, and saved document all agree
about the gap.

The previous paragraph-decoration experiment (`task-pill-row`) will be removed;
caret sizing will no longer depend on a special CSS class.

## Testing

Automated tests will cover:

- Normalizing an existing task-only paragraph adds one separator.
- Normalization does not duplicate an existing separator.
- New task insertion includes one separator.
- Text following a pill retains exactly one separator.
- A click at the raw task boundary resolves after the separator.
- Backspace after an otherwise empty separator selects the pill.
- Normal prose and mixed text paragraphs remain unchanged.

The production verification will use the signed-in `today.johnegan.io` page,
confirm the live document model and selection position, and verify that the
custom production domain points to the tested deployment artifact before the
work is reported complete.

## Scope

This change is limited to task-pill separation and caret placement in the Day
editor. It does not change task data, pill visuals, hover actions, task ordering,
or the behavior of other editors.
