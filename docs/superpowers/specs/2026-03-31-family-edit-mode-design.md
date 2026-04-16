# Family Edit Mode

Allow family members to add children, register couples, and edit person details directly from the `/explore` wheel visualization. Edits commit to `couples.json` via the GitHub API, keeping it as the single source of truth.

## Context

The family tree data lives in `content/couples.json` in the `Nesuarg/my_fam` GitHub repo. The site is deployed on Netlify with auto-deploy on push. Currently, edits require manually changing the JSON file and committing. This feature lets family members make edits through the UI.

## Edit Flow

1. User clicks "Edit" button on `/explore` → enters the shared family password → edit mode activates
2. Edit mode surfaces inline controls: click-to-edit on nodes, "+" buttons to add children, partner registration for singles
3. Each save → optimistic local state update (instant) → Netlify Function → GitHub API commit to `couples.json` → Netlify auto-rebuilds
4. "Syncing..." indicator shows until the rebuild is live. Multiple edits work without waiting.

## Authentication

Single shared family password stored as `FAMILY_EDIT_PASSWORD` env var on Netlify. The client sends it as a header (`X-Family-Password`) with each API call. The Netlify Function validates it before committing. localStorage remembers the password for the session so users don't re-enter it on every edit.

No user accounts, no per-person auth. The family is small and edits are traceable via git history. If the password leaks, rotate it and re-share in the family group chat.

## API

One Netlify Function: `netlify/functions/edit-family.ts`

All operations are POST requests with JSON body. Password in `X-Family-Password` header.

### Actions

**addChild** — Add a new person as a child of an existing couple.

```json
{
  "action": "addChild",
  "coupleId": "bodil-carl",
  "child": {
    "firstName": "Nanna",
    "lastName": "Fabricius Schmidt",
    "gender": "female",
    "dob": "5/15/2000"
  }
}
```

Creates a new person entry in `people[]`, adds a `SimpleChild` reference to the couple's `children[]` array. Auto-generates a person ID from the first name (lowercased, spaces to hyphens). If the ID already exists, append a numeric suffix (e.g. `nanna-2`). Birth order is set to the next available number.

**addCouple** — Register a partnership for an existing person (typically an uncoupled child getting married).

```json
{
  "action": "addCouple",
  "personId": "ejgil",
  "partner": {
    "firstName": "Line",
    "lastName": "Jensen",
    "gender": "female",
    "dob": "3/12/1990"
  },
  "relationshipType": "married"
}
```

Creates a new person entry for the partner, creates a new couple entry, and updates the parent couple's `children[]` to set `ownFamilyId` on the relevant child.

**editPerson** — Update fields on an existing person.

```json
{
  "action": "editPerson",
  "personId": "mads",
  "fields": {
    "firstName": "Mads",
    "lastName": "Fabricius Schmidt",
    "dob": "3/28/1985"
  }
}
```

Only the provided fields are updated. Omitted fields are left unchanged.

### Response

Success:
```json
{
  "ok": true,
  "data": { /* updated FamilyData */ },
  "commitSha": "abc123"
}
```

Conflict (simultaneous edit):
```json
{
  "ok": false,
  "error": "conflict",
  "message": "Someone else just edited. Please refresh and try again."
}
```

### Implementation

1. Validate password from `X-Family-Password` header against `FAMILY_EDIT_PASSWORD` env var
2. Fetch current `content/couples.json` from GitHub API (`GET /repos/Nesuarg/my_fam/contents/content/couples.json`). Response includes file SHA for optimistic locking.
3. Parse JSON, apply the edit in memory
4. Commit updated JSON via GitHub API (`PUT /repos/Nesuarg/my_fam/contents/content/couples.json`) with the SHA to prevent conflicts
5. If SHA conflict (HTTP 409), retry once: re-fetch, re-apply, re-commit
6. If retry also fails, return conflict error
7. On success, return the updated data + commit SHA

### Env Vars

| Var | Secret | Purpose |
|-----|--------|---------|
| `FAMILY_EDIT_PASSWORD` | Yes | Shared family password |
| `GITHUB_TOKEN` | Yes | Fine-grained PAT with Contents write on `Nesuarg/my_fam` |
| `NETLIFY_SITE_ID` | No | For rebuild status polling |

## Frontend Edit UI

### Edit Mode Toggle

A lock icon button below the title in the top-left. Click → password prompt modal (simple text input + submit). On correct password, edit mode activates. Password stored in localStorage. The button changes to an unlock icon when active.

### Edit Mode Controls

When edit mode is active:

**Click a node** → opens an edit panel near the node (positioned like the hover tooltip but sticky, doesn't dismiss on mouse leave). Shows:
- Editable fields: first name, last name, birth date (for both Fabricius-side person and partner)
- Save / Cancel buttons
- "+" Add Child button (below the fields)

**"+ Child" button** → inline form within the panel:
- First name, last name, gender (M/F toggle), birth date
- Save / Cancel
- On save: calls `addChild` API, optimistic update

**Single/uncoupled nodes** → the edit panel also shows a "+ Partner" button:
- Partner first name, last name, gender, birth date, relationship type (married/partnership)
- On save: calls `addCouple` API, optimistic update

**No delete.** Garbage edits are cleaned up via git revert. This keeps the UI simple and avoids accidental data loss.

### Optimistic Updates

On save, the component:
1. Updates its local `familyData` state with the new/edited data
2. Re-runs `buildWheelGraph` to recompute nodes
3. The wheel animates to accommodate new nodes
4. API call fires in the background

If the API call fails, show an error toast and revert the local state.

### Rebuild Detection

After a successful API commit:
1. Show a small "Syncing..." badge in the top-left
2. Poll `https://api.netlify.com/api/v1/sites/{NETLIFY_SITE_ID}/deploys?per_page=1` every 10 seconds
3. When the latest deploy's `created_at` is after the edit timestamp and `state` is `"ready"`, show "Updated!" for 3 seconds then clear the badge
4. Stop polling after 5 minutes (timeout)

The `NETLIFY_SITE_ID` is not secret — it's a public identifier. It can be baked into the client bundle.

## New Files

| File | Purpose |
|------|---------|
| `netlify/functions/edit-family.ts` | Serverless function: validate password, apply edit, commit via GitHub API |
| `src/components/EditPanel.tsx` | Edit/add form panel component |
| `src/components/PasswordModal.tsx` | Password entry modal |
| `src/components/SyncBadge.tsx` | "Syncing..." / "Updated!" indicator |

## Modified Files

| File | Change |
|------|--------|
| `src/components/FamilyWheel.tsx` | Add edit mode state, edit button, wire up EditPanel, optimistic updates, SyncBadge |

## No Changes To

- `content/couples.json` — schema stays the same
- `src/lib/wheel-graph.ts` — data transform unchanged
- `src/lib/wheel-layouts.ts` — layout logic unchanged
- `src/pages/explore.astro` — page structure unchanged
- All other existing pages and components
