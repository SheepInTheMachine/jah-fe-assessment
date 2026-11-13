# Decisions

## The Brief

### Multi-select and batch move

1. Editors can select several nodes in the tree, with the pointer and with the keyboard.
2. The details panel shows the deepest common ancestor of the selection, with its path.
3. A "Move selection" action moves the selected nodes under a destination the editor picks. The validation must be correct: a node can never end up inside its own subtree, the destination must be a container, and each level keeps its alphabetical order. If one selected node is an ancestor of another, the subtree moves as one.
4. The tree stays usable on the Large fixture (10,000 nodes).
5. The feature works with the keyboard, in line with the existing WAI-ARIA contract of the tree.

## Before I started
- I made a tiny change to main called `main-with-noise`. The nodes weren't aligned and it was really bugging me.... and fixes like that shouldn't be included with feature PRS.


## Working with the agent

`What I asked for, what it got wrong, what I rejected or rewrote, and why.`

---
I started by adding a few rules based on what I learned while reviewing the code.
  - I could have added more rules, but I prefer to add them as needed. This keeps the context from getting bloated. Plus Cursor's defaults are pretty good.
----
Instead of trying to create the feature in one shot, I started with selecting multiple nods and showing the deepest common ancestor.
- While I sometimes use the keyboard when navigating file systems, I prefer to use my mouse when dealing with batches of files.
- See: `ai-session/1_cursor_deepest_common_ancestor_feature.md`
- The result was pretty good. I didn't think to specify that holding shift should enable selecting chunks.
  - The only issue was my user settings for formatting was conflicting with the linter. So I had the agent fix that.
- I then opened up my browser to try out the feature.
-   The only part I felt unsatisfied with was how to de-select multiple nodes. After trying it out a bit more, I decided it was fine. In the `main` branch after a user selects a node, the only way to de-select it is by changing the selection. This implementation felt consistent with the current behavior.
  -  Also I'm on a mac. The shortcuts for selection use cmd, but on windows they would use ctrl. After looking at the implementation I saw that I has nothing to worry about.
- I noticed there was a delay when selecting the files when there are 10,000 modes and everything is open. 
---
At this point I wanted to improve the performance of the app before implementing movement. I kept all the suggestions suggestions produced by the agent since they met my requirements.




## Gaps in the brief
`- The question, what I decided (or assumed), and why.`

### The Brief

#### Multi-select and batch move

1. Editors can select several nodes in the tree, with the pointer and with the keyboard.
2. The details panel shows the deepest common ancestor of the selection, with its path.
3. A "Move selection" action moves the selected nodes under a destination the editor picks. The validation must be correct: a node can never end up inside its own subtree, the destination must be a container, and each level keeps its alphabetical order. If one selected node is an ancestor of another, the subtree moves as one.
4. The tree stays usable on the Large fixture (10,000 nodes).
5. The feature works with the keyboard, in line with the existing WAI-ARIA contract of the tree.

### Gaps & Assumptions
There were a lot of gaps in this brief compared to the one I was reviewing.

How should selection (and de-selection) work? 
- Since the ContentTree is modeled after a file system, the user should press `shift` or `ctrl` to multi-select.
- If they need to de-select they can hold `ctrl`

How should moving work?
- Generally I am modeling the feature after my computer's file explorer. When moving files on my computer I don't need a modal to move files. I just need to drag the files over. Drag and drop is something that seems outside of the scope of this feature. I'm also unsure how to move files around using just the keyboard.
- In the PR I reviewed when the user clicked move a modal would appear that would let them select the destination.
- I chose to use the same approach as the PR. It seemed like the best way to prevent accidental or premature moves. (Which is something that happens when moving files in the file explorer on my computer.)

What other changes need to be made to the node details panel?
- The brief explicitly tells me to display the `the deepest common ancestor of the selection, with its path`,  but it doesn't say anything about the selected nodes themselves.
- I chose to display the number of nodes selected and the details for each selected node.
  - This may cause performance issues for large trees (10k nodes), but I prefer to start with the simplest implementation and optimize once it becomes a problem.
  - That is something I might change as I go through the process of implementing the feature.

## Not built
`- What I left out, and why.`
- The main thing I left out was drag and drop. It was something I considered but felt outside the scope of the feature.
- 

