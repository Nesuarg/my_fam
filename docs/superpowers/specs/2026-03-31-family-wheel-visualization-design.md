# Family Wheel Visualization

Interactive radial visualization of the Fabricius family, where distance from center represents birth year and nodes can be freely dragged with physics-based interaction.

## Context

The Fabricius family tree tracks couples as the atomic unit. Everyone is a Fabricius by blood — branch surnames (Hansen/Carl, Paulsen, Carlsen, etc.) are identifiers to distinguish branches. The root couple is Niels Peter & Dorthea (b. 1919), with 10 children, ~20 grandchildren couples, and a growing generation beyond that.

The existing Astro site has card-based views. This adds a new `/explore` page with the wheel visualization, without touching existing pages.

## Data Source

`content/couples.json` — no schema changes. The file contains:
- `people[]`: id, firstName, lastName, maidenName, gender, dob
- `couples[]`: id, person1Id, person2Id, relationshipType, children[]

Each couple node is derived from a `couples[]` entry. Uncoupled people (those listed only as children with no `ownFamilyId`) render as outline-only nodes.

## Layout

### Radial Position (distance from center)

Each node's radius is determined by the Fabricius-side person's birth year:

```
radius = (fabriciusBirthYear - rootBirthYear) * scaleFactor
```

- `rootBirthYear` = 1919 (Niels Peter)
- `scaleFactor` auto-calculated to fit the viewport with padding
- The Fabricius-side person is identified by tracing parentage back to the root — the person who appears as a `personId` in their parent couple's `children[]` array

### Angular Position (default wheel layout)

- Gen-1 children: equally spaced at `360° / N` intervals (N=10 currently)
- Gen-2 grandchildren: clustered within their parent's angular slice, sub-divided equally
- Gen-3+: same pattern, recursively
- Angular slices are equal per sibling group, not weighted by subtree size (that's a separate layout mode)

### Guide Rings

Faint concentric circles at each decade (1930, 1940, 1950, 1960, 1970, 1980, 1990, 2000), with year labels positioned diagonally to avoid overlap.

## Rendering

### Tech Stack

- **D3.js** (`d3-force`, `d3-selection`, `d3-transition`) for force simulation and SVG manipulation
- **React** component as an Astro island
- **SVG** for all rendering — crisp text at any zoom, CSS-styleable, DOM events

### Node Appearance

| Type | Shape | Size | Style |
|------|-------|------|-------|
| Couple | Filled circle | Gen 0: 22px, Gen 1: 15px, Gen 2: 12px, Gen 3: 10px | Solid fill |
| Single person | Outlined circle | Same as generation | Stroke only, no fill |

### Generation Colors

| Generation | Color | Hex |
|------------|-------|-----|
| 0 (root) | Gold/amber | `#f59e0b` |
| 1 (children) | Blue | `#3b82f6` |
| 2 (grandchildren) | Green | `#10b981` |
| 3+ (great-grandchildren) | Purple | `#8b5cf6` |

### Labels

- **Above node:** Branch surname (e.g. "Paulsen", "Hansen/Carl")
- **Below node:** First names + birth year (e.g. "Bodil & Carl '58")

### Connections

Straight lines from parent couple to child couple nodes. Low opacity (~0.25), colored by the parent's generation color.

## Interaction

### Physics-Based Drag

D3 force simulation with:
- **Collision detection:** nodes don't overlap (force radius slightly larger than visual radius)
- **Centering force:** gentle pull toward center of viewport
- **Link forces:** spring-like connections along parent-child edges
- **Drag behavior:** any node can be dragged freely. Simulation fixes the node position while dragging, releases on drop. Nodes drift back gently toward their computed "home" position via a spring force.

### Layout Modes (Reset Buttons)

Three buttons in the top-right corner:

| Button | Behavior |
|--------|----------|
| **Wheel** (default) | Radial layout: birth-year radius, equal angular spacing |
| **Birth Order** | Re-sorts angularly by birth order within each generation |
| **Branch Size** | Branches with more descendants get proportionally more angular space |

Switching layouts animates node positions over ~500ms with D3 transitions. Radius stays the same (always birth-year based) — only angular positions change.

### Hover

Hovering a node highlights it and its direct connections (parent couple + child couples). All other nodes and connections dim to ~0.2 opacity.

### Click

Clicking a node shows a detail panel with:
- Full names (both partners, or single person)
- Birth year
- Number of children
- Branch identifier
- Generation number

Implemented as a tooltip-style overlay near the clicked node.

## Page Structure

### New Files

| File | Purpose |
|------|---------|
| `src/pages/explore.astro` | New page at `/explore`, full-viewport dark layout |
| `src/components/FamilyWheel.tsx` | React island component with all D3 logic |

### No Changes To

All existing pages and components remain untouched.

### Dependencies

Add `d3` (or the subset: `d3-force`, `d3-selection`, `d3-transition`, `d3-drag`) to `package.json`.

## Styling

- **Background:** Dark (`#0f1117`) matching the mockup
- **Page chrome:** Tailwind — layout buttons, legend, title
- **SVG internals:** Inline styles / CSS classes on SVG elements
- **Responsive:** SVG viewBox scales to viewport. On mobile, the wheel fills the screen; buttons and legend reflow.

## Visual Reference

Static mockup: `.superpowers/brainstorm/6361-1774946650/content/wheel-mockup-v2.html`
