# Repo instructions (Astro + React islands + Tailwind + shadcn/ui)

- Package manager: **pnpm**.
- New UI: use **shadcn CLI** (`pnpm dlx shadcn@latest add <component>`), don’t hand-copy.
- Styling: **Tailwind only**; prefer utility classes over custom CSS.
- Imports: use **`@/*`** alias (src root).
- Interactivity: keep shared state/context inside a **single React island**; import islands from `.astro` via `client:*`.
- Default to **server-first / static** in `.astro`; only hydrate when needed.
- Provide a small **usage example** when you add a new component (no tests).
- Add a `cn` helper (`clsx` + `tailwind-merge`) and use it for class merging.
- No test scaffolding, no boilerplate generators—keep changes minimal and typed.