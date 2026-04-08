# Flow: Edit a published song privately

> Referenced from [PRD §3.3](../PRD.md#3-user-lifecycle).
> **Status:** Phase 6 (not yet built).

## Actor

The original owner of a published song (or any signed-in user — see "Notes on equivalence with Fork" below).

## Preconditions

- The song is in `state='published'`.
- The user is signed in.

## Why this flow exists

After a song is published it becomes immutable from the public's view (only admin-approved updates supersede it). But the owner often wants to tweak something for their own practice — change calibration, edit lyrics, retime sections — without having to wait for review or affect the public version.

This flow lets them branch the published song into a private draft. The public version stays exactly as approved.

## Steps

1. User navigates to the published song (`#song-view/<id>`).
2. User clicks **Edit privately** (in Edit Controls).
3. Frontend confirms: *"This will create a private copy in your drafts. The public version stays unchanged."*
4. Frontend `POST /api/songs/:id/fork`. Server:
   - Creates a new `songs` row with a fresh UUID.
   - `owner_id` = current user.
   - `parent_song_id` = the published song's `id`.
   - `state='draft'`.
   - Copies `composition`, `editOps`, audio blob, metadata.
5. Server responds with the new `songId`.
6. Frontend navigates to `#editor-song/<newSongId>` — the user is now editing their private draft.
7. From here, the flow is identical to [`update-song.md`](update-song.md). Save creates new versions in `song_versions`. The public version is untouched.

## Postconditions

- New row in `songs` with `state='draft'`, `parent_song_id` pointing to the published original.
- Both rows visible in the user's library: the original (still public) and their private draft.

## Notes on equivalence with Fork

This flow is **architecturally identical** to [`fork-song.md`](fork-song.md). The only difference is the UI label and confirmation copy:

- "Edit privately" → for the original owner ("you're branching your own song")
- "Fork" → for non-owners ("you're copying someone else's song")

Both produce a draft in the user's library with `parent_song_id` set. We keep them as two separate UI affordances because the user-facing intent is different, but they hit the same backend endpoint.

## Error states

- **User not signed in:** Phase 6 redirects to Google OAuth. After sign-in they return to this flow.
- **Original song not in `published` state:** 404 / "song unavailable".

## Files involved

- Backend: `server/routes/songs.js` — `POST /api/songs/:id/fork` (Phase 6)
- Frontend: `src/lifecycle/fork-song/` (Phase 6, shared with the Fork flow)

## Open questions (Phase 6)

- Should the draft inherit the parent's track config (heights, visibility, mute) or reset to defaults?
- If the user later wants to **submit their private edits as a re-publish** of the original, do we let them do that from the draft? (Yes — they'd hit the [`publish-request.md`](publish-request.md) flow with `parent_song_id` set, and the request would target the original published row.)
