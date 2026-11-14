# Node movement functionality
_Exported on 11/13/2026 at 16:49:03 EST from Cursor (3.29.15)_

---

**User**

## Goal
The user is able to move one (or more) nodes to a valid container

## Context
- src/App.tsx
- src/components/ContentTree.tsx
- src/components/NodeDetails.tsx

# Requirements
- There needs to be a button with the label "Move Selection" in the node details panel.
- Clicking the "Move Selection" button needs to open a modal that shows all the containers in the tree. Invalid containers are greyed out.
- The user must be able to move the selected nodes into a valid desination.
- The selected destination must be a container.
- A node can never end up inside its own subtree. If one selected node is an ancestor of another, the subtree moves as one.
- After a node is moved, the children of the node must remain in alphabetical order.
- Create a file called `move.ts` which will hold all movement logic.
- Add a function called `canBeDestination` to `move.ts`
- Add a function call `moveNodes` to `move.ts`

## Constraints
- **Accessibility**: WCAG 2.2 Level AA for this feature (or “match existing `ContentTree` tree pattern”).
- Keyboard-only operable; visible focus; name/role/state for custom controls.
- Prefer semantic HTML + Moonstone components; tree UI keeps WAI-ARIA tree roles + roving tabindex (see `.cursor/rules/moonstone-ui.mdc`).
- Verify with Testing Library (`getByRole`, keyboard via `userEvent`) where behavior is testable.

## Acceptance criteria
- The user can open the movement modal with a pointer.
- The user can open the movement modal with `Ctrl/Cmd + Shift + M` when the focus is in the tree.
- The user can select a destination with a pointer.
- The user can selected a destination with a keyboard.
- Focus needs to move to the movement modal when it's opened.
- If the user cancels moveing nodes, focus needs to move to the tree.
- Focus needs to move to the selected container node after the user selected the destination.

## How to verify
- Add tests that verify that the logic implemented in `move.ts` is correct.
- Add tests that verify the Acceptance Criteria.
- After adding those tests, add tests for any edge cases you can think of.

---

**Cursor**

Exploring the codebase and patterns to implement the Move Selection feature.




Implementing move logic and UI components.


Fixing focus when the focused node disappears after a move, and correcting test expectations.


Syncing tree focus state with the DOM and fixing keyboard activation in the destination tree.


## Summary

Move Selection is wired end-to-end with tree logic in `src/move.ts` and UI around a destination modal.

### Core logic (`src/move.ts`)
- **`canBeDestination`** – destination must be a container (`site`, `page`, `folder`); cannot lie in the subtree of any **move root**.
- **`getMoveRoots`** – drops selected descendants when an ancestor is also selected (subtree moves as one).
- **`moveNodes`** – removes move roots, inserts under the destination, re-sorts children alphabetically at each touched level.

### UI
- **`Move Selection`** in `NodeDetails` when something is selected.
- **`MoveSelectionModal`** + **`DestinationTree`** – full tree, invalid rows greyed with `aria-disabled`, valid row activates the move (click or Enter/Space).
- **`Ctrl/Cmd + Shift + M`** in the main tree opens the modal.
- Focus: modal on open; **Cancel** → main tree; **after move** → destination row in the main tree (ancestors expanded).
- Tree edits live in **`treeRoot` state** in `App` (fixtures still seed it; fixture switch resets the tree).

### Tests
- **`src/tests/move.test.ts`** – logic, validation, ancestor collapse, alphabetical order.
- **`src/tests/MoveSelection.test.tsx`** – acceptance criteria (pointer/keyboard, focus, disabled destinations).
- All **42 tests** pass; build and lint are clean.

Try it: select a node → **Move Selection** or **Ctrl/Cmd + Shift + M** → pick a valid folder/page/site → the selection lands under that container with sorted siblings.

---

**User**

I noticed that the focus isn't on/in the modal when I open the model using shift+ctrl+m. Is that considered good accessability? 

---

**Cursor**

Tracing focus behavior when the modal opens via the keyboard shortcut versus the button.


Identifying an accessibility issue: WCAG and the ARIA dialog pattern require focus to move into the modal when it opens. The keyboard shortcut leaves focus in the main tree because ContentTree reclaims it when the active element is still inside the tree. Fixing that.


Removing the dialog's `useEffect` that steals focus from the destination tree after open.


**No — that’s not good accessibility.**

For a modal dialog, WCAG and the [WAI-ARIA modal pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) expect that when the dialog opens, **keyboard focus moves into it** (usually the first meaningful control — here, the destination tree). If focus stays on the main tree behind the overlay:

- Keyboard users keep operating the **background** tree by accident.
- Screen readers may still treat the **tree** as the active context, not “Move Selection”.
- Your acceptance criterion (“focus moves to the movement modal when it’s opened”) isn’t met for the shortcut path.

**Why the shortcut looked worse than the button**

Opening with **Move Selection** leaves focus on the button (outside the main tree), so the modal could take focus normally.

Opening with **Ctrl/Cmd+Shift+M** leaves focus on a **main-tree row**. `ContentTree` was written to **re-sync** focus whenever the active element is still inside the tree — which fought the modal and pulled focus back to the main tree.

**What we changed**

1. **`pauseFocusSync`** on the main tree while the move modal is open.
2. **`useLayoutEffect`** in the destination tree so focus lands on the first row as soon as the modal mounts.
3. Removed focusing the dialog shell (`tabIndex={-1}`), which had no visible focus and could win over the tree.

After a refresh, **Ctrl/Cmd+Shift+M** should put focus on the first row in the destination tree (e.g. Site), with a visible focus ring. If anything still feels off in the browser, say which OS/browser you’re on.

