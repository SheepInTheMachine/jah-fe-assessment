# Content Tree Explorer

A small content-tree browser in the spirit of [Jahia's jcontent](https://github.com/Jahia/jcontent):
browse a site's content tree, select nodes, inspect them. It is used as part of Jahia's
technical assessment for front-end developers.

## Getting started

Requirements: Node.js 20 or newer, and npm.

```bash
npm install
npm run dev
```

| Script | What it does |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check and build for production |
| `npm run lint` | Lint the sources (ESLint) |
| `npm test` | Run the test suite once (Vitest + Testing Library) |
| `npm run test:watch` | Run the tests in watch mode |

## What is inside

- **React 18 + TypeScript + Vite**
- **[@jahia/moonstone](https://github.com/Jahia/moonstone)**, Jahia's open-source design system
- **Two deterministic fixtures**, generated at runtime from fixed seeds:
  *Sample* (50 nodes) and *Large* (10,000 nodes)
- The fixture and the selection are mirrored into the **URL**, so a view can be bookmarked
- An accessible tree: WAI-ARIA tree pattern, roving tabindex, full keyboard navigation
  (arrows, Home/End, Enter/Space)

## Structure

```
src/
  model/        the ContentNode type and pure tree helpers (index, path, flatten)
  fixtures/     the deterministic fixture generator
  state/        URL-synced state
  components/   ContentTree, TreeRow, NodeDetails, Toolbar
  tests/        unit and component tests
```

## License

MIT, see [LICENSE](LICENSE).
