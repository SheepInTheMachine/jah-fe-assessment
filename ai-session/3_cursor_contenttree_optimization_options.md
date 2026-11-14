# ContentTree optimization options
_Exported on 11/13/2026 at 16:05:13 EST from Cursor (3.29.15)_

---

**User**

## Goal
The ContentTree needs to be optimized to reduce lag. Suggest a few options for how to improve this.

## Context
- src/App.tsx
- src/components/ContentTree.tsx
- src/components/NodeDetails.tsx

# Problem
There is a delay between when the user selects and items and when it is shown as selected when there are a lot of nodes in the tree. 



---

**Cursor**

Reviewing how selection flows through the tree and what re-renders on each click.




The tree is already set up for fast selection—`TreeRow` is memoized and the comment in `ContentTree` assumes only one or two rows update—but on the large fixture (10k nodes, fully expanded) a single click still feels slow. Here are practical options, roughly ordered by impact versus effort.

## What’s likely causing the lag

On each click, `updateUrl` runs in `useUrlState`, which re-renders all of `App`. That flow pulls in `ContentTree` (~10k `TreeRow` elements) and `NodeDetails`.

The main surprise is that **`TreeRow` probably re-renders for every visible row**, not just the row(s) whose selection changed:

```29:62:src/App.tsx
    const handleSelect = useCallback((id: string, modifiers: {additive: boolean; range: boolean}) => {
        // ...
        updateUrl({selectedIds: nextIds});
    }, [expandedIds, root, selectedIds, updateUrl]);
```

`handleSelect` is recreated whenever `selectedIds` changes. That new function is passed as `onSelect` → `ContentTree`’s `handleSelect` → every `TreeRow`. **`memo` does a shallow compare**, so a new `onSelect` reference forces a full pass over all rows. Each row also mounts Moonstone (`Button`, `Typography`, icons), so a full re-render is expensive.

Secondary costs:

- **~10k DOM nodes** when everything is expanded (no virtualization).
- **`history.replaceState` on every click** in the same render path as selection (`useUrlState`).
- **`NodeDetails`** recomputes paths/ancestor on every selection (usually fine for single select; can hurt for huge multi-selects).

---

## Option 1: Stabilize selection callbacks (high impact, small change)

Keep `handleSelect` / `onSelect` **referentially stable** across selection changes:

- Hold `selectedIds`, `expandedIds`, and `root` in **refs** updated on each render, and read them inside a `useCallback` with an empty or minimal dependency list.
- Or move selection logic into `ContentTree` / a small hook so parent props to rows don’t churn.

**Pros:** Matches the existing design intent; minimal architectural change.  
**Cons:** Range/additive logic must stay correct when reading from refs.

This alone may make selection feel instant if the bottleneck is 10k `TreeRow` re-renders.

---

## Option 2: Event delegation on the tree (high impact, medium change)

Use **one** `onClick` (and keyboard handler) on the `role="tree"` container; resolve the target row via `data-node-id` (already on each row). Rows become mostly presentational—**no per-row `onSelect` prop**, so memo isn’t invalidated by callback identity.

**Pros:** Stable row props; fewer closures per row.  
**Cons:** Slightly more wiring for keyboard vs pointer; tests may need small updates.

Works well together with Option 1.

---

## Option 3: Virtualize visible rows (high impact for “expand all”, larger change)

With 10k expanded nodes, you pay for **10k DOM nodes** and **10k React children** on every parent update, even if most rows skip paint.

Render only rows in the viewport (fixed or dynamic row height), e.g. `@tanstack/react-virtual` or similar, while keeping WAI-ARIA tree semantics (roving tabindex, `aria-level`, etc.).

**Pros:** Scales with viewport size, not tree size; helps expand/collapse and focus moves too.  
**Cons:** New dependency; a11y and keyboard behavior need careful validation (your brief calls this out).

Best when the large fixture must stay fully expanded; aligns with DECISIONS (“tree stays usable on 10,000 nodes”).

---

## Option 4: Decouple “what user sees” from URL sync (medium impact)

Today selection updates **URL and React state in one synchronous `setState`**. Perceived lag is “click → selected styling,” not “click → bookmarkable URL.”

- **Optimistic selection** in `useState` (or a ref + targeted updates) so the tree updates immediately.
- **Defer** `replaceState` with `queueMicrotask`, `requestAnimationFrame`, or a short debounce.

**Pros:** Snappier UI; bookmarking still works.  
**Cons:** Brief window where URL lags UI; need a clear source of truth.

---

## Option 5: Narrow what re-renders with state split (medium impact)

`App` owns fixture, expansion, selection, and passes everything into siblings. Any `urlState` change re-renders **both** tree and details.

- Split into providers or memoized shells so **`NodeDetails` (and `Toolbar`) don’t re-run** on every selection tick if their props didn’t meaningfully change—or isolate selection state under `ContentTree`’s subtree.
- Wrap `NodeDetails` in `memo` and **memoize heavy derived data** (`selectedEntries`, paths) from `selectedIds`.

**Pros:** Helps when the details panel does more work (multi-select, move feature).  
**Cons:** Less impact than Options 1–3 if the tree still re-renders all rows due to unstable callbacks.

---

## Option 6: Cheaper row chrome (lower impact, incremental)

If some re-renders remain unavoidable:

- Use **CSS** for selected state where possible; avoid re-creating Moonstone subtrees when only `isSelected` flips.
- Consider **lighter expand control** than full `Button` per row (still accessible), if design allows.

**Pros:** Low risk add-on.  
**Cons:** Won’t fix 10k rows all re-rendering because of `onSelect`.

---

## Suggested path (before “Move selection”)

| Phase | Actions |
|--------|---------|
| **First** | Fix callback stability + delegation (Options 1–2); profile in DevTools React profiler—expect dropped row render count from ~10k to ~1–2 on a simple click. |
| **If still slow with expand all** | Virtualization (Option 3). |
| **Polish** | Deferred URL sync (4) and details memoization (5) as needed for multi-select and move. |

If you want to go further next, we can pick one path (e.g. refs + delegation only) and implement it with a quick before/after check on the large fixture.

---

**User**

For now I want to try Option 1. What are the pros and cons of the two suggested methods?

---

**Cursor**

Option 1 was about keeping `onSelect` **the same function reference** across selection changes so memoized `TreeRow`s can skip re-renders. The two variants differ in **where** that stable handler lives and **what** still flows through `App`.

## Method A: Refs in `App` (sync latest values into refs)

On each render, write `selectedIds`, `expandedIds`, and `root` into refs. `handleSelect` is created once (or with deps like `updateUrl` only) and reads those refs when computing the next selection.

**Pros**

- **Smallest diff** — selection rules stay in `App.tsx` next to URL state, anchor ref, and `updateUrl`.
- **Stable tree props** — `onSelect` passed to `ContentTree` no longer changes when `selectedIds` changes, so `ContentTree`’s `handleSelect` and every `TreeRow`’s `onSelect` stay stable.
- **Easy to reason about for this assessment** — URL remains the source of truth; you’re only fixing the callback identity bug.
- **Tests** — `ContentTree` tests that wire their own `onSelect` are unchanged; you’d only touch `App` (and maybe add an `App` test if you have one).

**Cons**

- **Refs are a sharp edge** — handlers always see “latest” values, but you must sync refs on every render (typical pattern: `ref.current = selectedIds` at top of render or in `useEffect`). Easy to forget a field when selection logic grows (e.g. move validation later).
- **Stale closure risk if done wrong** — if something reads state from a closure instead of the ref inside `handleSelect`, bugs show up only for range/additive edge cases.
- **Doesn’t reduce `App` re-renders** — URL update still re-renders `App`, `ContentTree` still maps all rows, and React still reconciles 10k children (cheap if memo wins). It fixes **full `TreeRow` re-renders**, not parent work or DOM count.
- **Feels like a workaround** — common and valid for performance, but not as “clean” as lifting state only where it’s needed.

---

## Method B: Selection logic in `ContentTree` or a `useTreeSelection` hook

Move range/additive/anchor behavior into the tree layer (or a hook used by `App` but returning stable handlers). `App` might only do `updateUrl({ selectedIds })` via a stable `onSelectionChange` callback.

**Pros**

- **Better separation of concerns** — “how the tree selects” lives with the tree; `App` owns fixture, URL, and panel data. Matches the fact that `ContentTree.test.tsx` already duplicates selection logic in a test helper.
- **Natural deduplication** — today selection rules exist in both `App` and test `useTreeSelection`; one hook used by `App` and tests removes drift.
- **Easier to keep `onSelect` stable** — the hook can expose `selectNode` with empty deps and keep anchor + visible-id logic internal (visible list already depends on `expandedIds` / `root` inside the tree).
- **Scales to the move feature** — keyboard, range, and future constraints stay in one module instead of a growing `App` with refs.

**Cons**

- **Larger change** — more files touched (`ContentTree`, new hook, `App` slimmed down); higher review and regression risk before you’ve validated perf.
- **Who owns the anchor?** — `selectionAnchorRef` is in `App` today for URL-driven sessions; it moves into the hook/tree. You need a clear rule when fixture changes (reset anchor) that works with URL hydration.
- **Props design** — either `ContentTree` becomes semi-controlled (“report selection up”) or you split “tree UI” vs “selection controller.” Wrong split can make URL bookmarking harder to follow.
- **Doesn’t by itself fix memo** — you still need a **stable** callback from the hook to rows. Moving logic doesn’t help if the hook recreates handlers every render.

---

## How to choose

| If you… | Prefer |
|--------|--------|
| Want the fastest proof that lag is callback churn | **Method A** |
| Care about duplicating logic with `ContentTree.test.tsx` and upcoming move/multi-select | **Method B** (often A first, then extract hook) |
| Want minimal risk before movement | **Method A** |
| Want structure that matches the brief long term | **Method B** |

**Practical takeaway:** Method A is the right **experiment** for “does Option 1 fix the 10k-node click delay?” Method B is the better **shape** if you refactor anyway after confirming the profiler shows row renders dropping to ~1–2 per click.

Method A doesn’t require Method B later—you can extract a hook afterward and keep ref-based stability inside the hook so `onSelect` identity stays fixed.

If you want to implement A next, the critical checks after are: React Profiler row render count on a simple click, and shift-range / cmd-toggle still correct with the anchor and `flattenVisible` paths.

---

**User**

Lets start with Method A. After I try it out we can consider Method B.

---

**Cursor**

Implementing Method A: stabilizing `handleSelect` with refs so `TreeRow` memoization works.


Method A is in place in `App.tsx`. Summary:

### Change
- **`rootRef`, `expandedIdsRef`, `selectedIdsRef`** are updated every render with the latest values.
- **`handleSelect`** reads those refs instead of closing over `root`, `expandedIds`, and `selectedIds`, and depends only on **`[updateUrl]`** (already stable from `useUrlState`).

Selection behavior is unchanged: range, additive toggle, anchor updates, and URL sync work the same. `onSelect` → `ContentTree`’s `handleSelect` → each `TreeRow` should keep the same function reference across clicks, so memoized rows ought to re-render only when `isSelected` (or focus/expand) actually changes.

### Verify
1. Large fixture → **Expand all** → click several nodes and compare feel to before.
2. Optional: React Profiler → one click → expect **~1–2 `TreeRow` renders**, not thousands.
3. Quick regression: **Shift+click** range, **Cmd/Ctrl+click** toggle, fixture switch clears selection.

All **25** tests pass.

If it’s still sluggish with everything expanded, the next levers are URL sync timing, parent reconciliation cost, or virtualization—not callback identity. If selection feels good, we can talk about Method B (shared hook) when you’re ready.

---

**User**

That is a lot better. But now there are some errors. The errors are on lines 21, 22 and 25.

---

**Cursor**

Syncing refs in `useLayoutEffect` to satisfy `react-hooks/refs` (no ref updates during render).


Those messages come from ESLint’s **`react-hooks/refs`** rule: you must not write to `ref.current` during render (lines 21–22 and 35 were doing that).

The refs are now updated in **`useLayoutEffect`** instead, which runs after each render and before paint—so `handleSelect` still sees up-to-date `root`, `expandedIds`, and `selectedIds` on click, and `handleSelect` stays stable.

`npm run lint` is clean and all 25 tests pass. Behavior and perf should match what you tried earlier.

---

**User**

Great, can you now implement Method B where the selection logic lives in a useTreeSelection hook?

---

**Cursor**

Extracting selection logic into `useTreeSelection` and wiring it through `App` and tests.


Method B is in place. Here's what changed:

### New `src/state/useTreeSelection.ts`
- **`computeNextSelectedIds`** — pure function for range, additive, and replace selection (exported for reuse or unit tests later).
- **`useTreeSelection`** — owns the anchor ref, syncs latest `root` / `expandedIds` / `selectedIds` / `onSelectedIdsChange` via `useLayoutEffect` + refs (same stable-`handleSelect` pattern as Method A).
- Returns **`handleSelect`** (stable) and **`resetSelectionAnchor`** (for fixture changes).

### `App.tsx`
- Builds `selectedIds` from the URL as before.
- Calls `onSelectedIdsChange` → `updateUrl({ selectedIds })`.
- Uses the hook instead of inline selection logic.

### `ContentTree.test.tsx`
- Removed the duplicate local `useTreeSelection`.
- Harness uses the shared hook; `handleSelectWithSpy` keeps `vi.fn()` assertions for click/keyboard tests.

Lint is clean and all **25** tests pass. Selection behavior and performance characteristics should match what you had after Method A.

