# `src/lifecycle/`

User-flow code: each subdirectory implements one of the seven flows in [PRD §3](../../docs/PRD.md#3-user-lifecycle). The corresponding step-by-step doc lives at [`docs/flows/<flow>.md`](../../docs/flows/).

## Why this exists

The zone code under [`src/zones/`](../zones/) is organized by **where** things appear on screen. The lifecycle code is organized by **what** the user is doing across zones — uploading a song touches the file picker, the API client, the song library list, and the navigation router. Bundling that into a single folder per flow makes it easy to find everything that participates in "uploading a song" without playing whack-a-mole across the tree.

## Subdirectories (planned)

| Folder | Doc | Status |
|---|---|---|
| `add-song/` | [`flows/add-song.md`](../../docs/flows/add-song.md) | Phase 3 — refactor existing upload code into here |
| `update-song/` | [`flows/update-song.md`](../../docs/flows/update-song.md) | Phase 3 — refactor existing save code into here |
| `publish-request/` | [`flows/publish-request.md`](../../docs/flows/publish-request.md) | Phase 6 |
| `fork-song/` | [`flows/fork-song.md`](../../docs/flows/fork-song.md) | Phase 6 |
| `withdraw-song/` | [`flows/withdraw-song.md`](../../docs/flows/withdraw-song.md) | Phase 6 |
| `admin-request/` | [`flows/admin-request.md`](../../docs/flows/admin-request.md) | Phase 7 |

`edit-published-privately` reuses `fork-song/` at the data layer (same backend endpoint) — they share code but each has its own UI entry point in the appropriate zone.

## Convention

Each lifecycle folder should contain:

```
<flow>/
├── README.md                       short summary, link back to docs/flows/<flow>.md
├── <Flow>Modal.jsx (or similar)    UI entry point — usually a modal or dedicated page
├── api.js                          fetch wrappers around the relevant /api endpoints
├── state.js (optional)             local state machine if the flow has multiple steps
└── index.js                        public exports
```
