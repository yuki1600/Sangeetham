# Flow: Add a new song

> Referenced from [PRD §3.1](../PRD.md#3-user-lifecycle).
> **Status:** shipped (Phase 0). Phase 6 will gate this on sign-in.

## Actor

Any signed-in user (Phase 6+). Today (Phase 0–5) any visitor.

## Preconditions

- The user has an audio file (`.mp3`) of the composition.
- *Optional:* a JSON file in Sangeetham's composition format (`{ composition: [...], meta: {...} }`).
- *Optional:* a PDF of the original notation.

## Steps

1. User navigates to `#editor` (Song Library list).
2. User clicks **Upload New Song**.
3. User picks an audio file (and optionally a JSON + PDF) from their device.
4. Frontend `POST /api/songs/upload` (multipart) with the files. Server creates a new row in `songs` with a fresh UUID, decodes the audio for the waveform, parses the JSON if supplied (otherwise leaves `composition` as an empty stub).
5. Server responds with the new `songId`.
6. Frontend navigates to `#editor-song/<songId>` — the new Song View opens with the audio loaded and an empty (or pre-parsed) composition.
7. User edits the composition / metadata as needed (see [`update-song.md`](update-song.md)).
8. User clicks **Save** (Edit Controls → Save). `PUT /api/songs/:id`.

## Postconditions

- Row in `songs` table with `state='draft'` (Phase 6+) or `isPublished=0` (Phase 0–5).
- Audio blob stored in the row.
- Song appears in the Song Library list filtered by "My drafts" (Phase 6+).

## Error states

- **Audio decode fails:** server returns 400. Frontend shows an error toast. Row not created.
- **JSON parse fails:** server creates the row anyway with an empty composition; user can edit later.
- **PDF parse fails:** non-fatal — PDF is just a reference attachment.
- **Network failure mid-upload:** retry once; if still failing, prompt user to try again.

## Files involved

- Backend: [`server/routes/songs.js`](../../server/routes/songs.js) — `POST /api/songs/upload`
- Frontend (Phase 3+): `src/lifecycle/add-song/`
- Frontend (current): inlined in `src/components/editor/SongEditor.jsx`

## Open questions

- *Phase 6:* Should drag-and-drop onto the Song Library trigger this flow?
- *Phase 6:* Max file size?
