# Flow: Update an existing (draft) song

> Referenced from [PRD §3.2](../PRD.md#3-user-lifecycle).
> **Status:** shipped (Phase 0).

## Actor

Owner of the draft (Phase 6+). Today (Phase 0–5) any visitor.

## Preconditions

- A draft song exists in the user's library.

## Steps

1. User navigates to the Song Library and clicks the song. Lands on `#editor-song/<id>`.
2. Song View loads — Audio Control Zone, Song Track Zone, Bottom Bar all populated.
3. User makes one or more of:
   - **Edit composition** — click any swara or sahitya token to inline-edit.
   - **Trim audio** — Edit Controls → Trim → drag a region on the Sound Track → Delete.
   - **Calibrate āvartana** — Edit Controls → Calibrate → drag one āvartana on the Sound Track → Apply.
   - **Set section cues** — Edit Controls → Sections → click "Set" next to each section name at the desired playhead time.
   - **Edit lyrics in bulk** — Edit Controls → Lyrics → modal editor.
   - **Edit metadata** — Song Info → Edit Info → modal editor.
   - **Toggle track visibility / resize tracks** — click track header to collapse/expand; drag bottom edge to resize.
   - **Adjust mute / solo / volume** on the Sound Track — inline TrackControls below the header.
4. User clicks **Save** (Edit Controls → Save). `PUT /api/songs/:id` with `{ composition, editOps, avartanasPerRow }`. Server creates a new entry in `song_versions` for history.
5. Save status indicator flashes green on success.

## Postconditions

- `songs` row updated.
- New `song_versions` row appended.
- `state` remains `draft` (Phase 6+).

## Error states

- **Save fails (network / 500):** Save button shows red AlertCircle. User can retry. No data loss client-side (state stays in React).
- **Concurrent edits in another tab:** last-save-wins. (Phase 8: optimistic locking via `updated_at`.)

## Files involved

- Backend: [`server/routes/songs.js`](../../server/routes/songs.js) — `PUT /api/songs/:id`, `GET /api/songs/:id/versions`
- Frontend (Phase 3+): `src/lifecycle/update-song/`
- Frontend (current): inlined in [`src/components/editor/EditorSongView.jsx`](../../src/components/editor/EditorSongView.jsx)

## Phase 5 notes

The track config (mute/solo/volume/visible/heightPx) will also be persisted on save in Phase 5 — currently it's session-only.
