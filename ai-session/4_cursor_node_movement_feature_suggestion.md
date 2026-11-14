# Node movement feature suggestions
_Exported on 11/13/2026 at 16:31:33 EST from Cursor (3.29.15)_

---

**User**

## Goal
The user needs to be able to move the selected nodes into a selected container. I need some suggestions before I implement the feature.

## Flow 1
- The user opens a model.
- The modal shows the tree. Invalid destinations are disabled.
- The user makes a selection.
- The modal closes.
- The change is applied.

### Problems
- I'm not sure what the trigger to open the modal should be.

---

**Cursor**

Reviewing how selection and the UI work so we can suggest a solid modal trigger and flow.




You’ve already aligned with the reviewed PR in `DECISIONS.md`: an explicit **“Move selection”** step before choosing a destination. The brief uses that same wording, so the trigger should be that action—not an implicit gesture on the main tree.

## Recommended trigger: primary action in the details panel

Put a Moonstone **`Button`** labeled **“Move selection”** (or **“Move…”**) in `NodeDetails`, in the selection section—under the heading that shows count / DCA context.

**Why this fits your app**

| Concern | How the details panel button helps |
|--------|--------------------------------------|
| Brief | Literal **“Move selection”** action |
| Accidental moves | No move until the user clicks a dedicated control |
| Selection context | Details already show count, DCA, and paths—the natural “what am I moving?” place |
| Main tree contract | Row clicks stay **select**; the modal tree handles **destination** only |
| Keyboard | Button is in normal tab order; pair with a shortcut (below) |

**Enable / disable**

- **Disabled** when `selectedIds.size === 0`.
- **Enabled** for one or many selected nodes (moving a single node is still a valid batch of size 1).
- Optional: disable while a modal is already open (if you ever stack flows).

This matches Flow 1: click **Move selection** → modal with tree and invalid destinations disabled → pick destination → close → apply.

---

## Alternatives (and when to use them)

### 1. Toolbar button

Same label, next to Expand all / Collapse all.

- **Pros:** Always visible; easy to find in a demo.
- **Cons:** Toolbar today is **fixture / tree chrome**, not selection. A move control there feels disconnected unless you also show selection count on the button (`Move selection (3)`).

**Verdict:** Fine as a **secondary** entry point if you want visibility; still prefer details as primary.

### 2. Keyboard-only open (required for the brief, not the main trigger)

e.g. **Ctrl/Cmd + Shift + M** (or **M** when focus is in the details panel / tree with a non-empty selection).

- Opens the same modal as the button; button stays the discoverable affordance.
- Document it in the modal (`aria-describedby`) or a short hint near the button.

### 3. “Move to…” on a row in the **main** tree

e.g. secondary click or a row action on a folder.

- **Cons:** Competes with multi-select and WAI-ARIA tree behavior; easy to confuse “select this folder” with “move here.”
- You explicitly want a **separate modal tree** for the destination—so don’t use the main tree as the move target UI.

### 4. Auto-open modal after multi-select

- **Reject:** Interrupts exploration; fights shift/ctrl selection patterns you modeled on the file explorer.

---

## Flow refinements worth deciding up front

**Separate state in the modal.** Destination picking must **not** write to `urlState.selectedIds`. Keep `sources = selectedIds` in app state when the modal opens; use local state (or a one-off `destinationId`) inside the modal. Closing/cancel leaves the main selection unchanged.

**What closes the modal and applies**

- **Option A (simple):** Single-select in modal tree → **Move** confirms (destination can’t be invalid).
- **Option B (more explorer-like):** Double-activate or **Enter** on a valid container applies immediately (still keep **Cancel**).

Either works; A is safer for the “prevent accidental moves” goal in your decisions doc.

**What “disabled” means in the modal tree**

Disable (or `aria-disabled` + no `onSelect`) when:

- Node is not a **container** type (per your model).
- Node is **inside** the subtree of any node being moved (including “can’t move into self or descendant”).
- Optionally: node is **already the parent** of everything being moved (no-op move)—can disable or allow with no structural change.

**Focus and a11y**

- On open: focus the modal tree (or the first focusable control).
- Trap focus; **Escape** = cancel.
- Return focus to **Move selection** on close.
- Invalid rows: not selectable via keyboard (same rules as pointer).

**After apply**

- Update tree data (immutable update + re-`indexTree`).
- Reselect moved roots (ids may be stable in your model—confirm when implementing).
- Expand ancestors of the destination so the user sees the result.
- Sync URL selection if ids change or you collapse invalid ids.

---

## Suggested default

1. **Primary trigger:** **Move selection** button in `NodeDetails` (enabled when selection non-empty).  
2. **Secondary:** same handler from **Ctrl/Cmd + Shift + M** when `selectedIds.size > 0`.  
3. **Not** a main-tree click or auto-modal.

That gives a clear intent step, keeps the main tree’s select/focus model intact, and matches the modal flow you described.

If you want to go deeper next, we can sketch the **valid-destination predicate** (ancestor-in-selection + container type) or how to **collapse selection to roots** when one selected node is an ancestor of another before applying the move.

