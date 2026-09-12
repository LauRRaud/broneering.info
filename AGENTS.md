<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## UI architecture (owner requirement, 2026-09-12)

- The owner supplies the visual design. Keep the Ajasta homepage plain until then.
- Do not create a large global stylesheet. Global CSS is limited to resets, document defaults, accessibility and shared design tokens (CSS custom properties).
- Keep reusable primitives in `src/components/ui/<primitive>/`, with their own TSX and colocated CSS Module. Primitives must not depend on booking, billing or administration logic.
- Compose feature components in their own folders (marketing, booking, admin). Split page sections and substantial components by responsibility; keep route files focused on routing and data loading.
- Use colocated `*.module.css` for component styles. Keep shared tokens and theme variables in `src/styles/`; themes override variables, not global component selectors.
- Add components and token files as they are needed. Do not create empty placeholder libraries, duplicate primitives or a single ever-growing shared component/style file.
- Apply the same rules to the public website, booking flow and administration. Preserve accessibility, translation and existing behavior while restructuring.
- See `docs/FRONTEND-STRUCTURE.md` for the intended organization and current migration boundary.

- Theme containers must not style arbitrary descendant buttons, inputs, links or headings. Components opt into UI primitives explicitly. Keep theme files in src/styles limited to CSS custom properties and color-scheme; document layout belongs to its CSS Module. The architecture check enforces theme declarations and global CSS imports.
