# Flow: Fork a published song

> Referenced from [PRD §3.6](../PRD.md#3-user-lifecycle).
> **Status:** Phase 6 (not yet built).

## Actor

Any signed-in user (does not need to be the original owner).

## Why this flow exists

Carnatic notation is interpretive — the same composition might be sung in slightly different ways depending on tradition, calibration, or personal preference. Forking lets a user take any published song as a starting point and build their own version on top of it. The fork lives in their drafts; if they want to publish the derivative, it goes through the normal [publish-request flow](publish-request.md).

This is also the mechanism behind [Edit a published song privately](edit-published-privately.md) — both flows hit the same backend endpoint.

## Steps

1. User navigates to a published song (`#song-view/<id>`).
2. User clicks **Fork** (in Edit Controls).
3. Frontend confirms: *"This will create a copy in your drafts. Attribution to the original author is preserved."*
4. Frontend `POST /api/songs/:id/fork`. Server:
   - Validates the source song is `published`.
   - Creates a new `songs` row with a fresh UUID.
   - `owner_id` = current user.
   - `parent_song_id` = source song's `id`.
   - `state='draft'`.
   - Copies `composition`, `editOps`, audio blob, metadata.
   - Title is prefixed with `"Fork: "` (user can rename later).
5. Server responds with the new `songId`.
6. Frontend navigates to `#editor-song/<newSongId>`. The user is now editing their fork.

## Postconditions

- New row in `songs` with `state='draft'`, `parent_song_id` set.
- The original published song is unchanged.
- Both songs visible to the user — the original (in the public library) and their fork (in their drafts).

## Attribution

The fork's metadata always shows:
- "Forked from <original title>" with a link to the original
- The original composer remains the credited composer (it's the same composition, after all)
- The fork's `owner_id` is the new user — they own the fork, not the composition

## Republishing a fork

A user can request to publish their fork through the normal [publish-request flow](publish-request.md). On approval, the fork becomes a separate published song in the public library — the original is NOT replaced. Both versions coexist.

## Error states

- **Source song not in `published` state:** 404 / 409.
- **Caller not signed in:** 401 → sign-in prompt → return to flow.

## Files involved

- Backend: `server/routes/songs.js` — `POST /api/songs/:id/fork` (Phase 6, shared with `edit-published-privately.md`)
- Frontend: `src/lifecycle/fork-song/` (Phase 6)

## Open questions (Phase 6)

- **Fork lineage depth:** if user A forks song X, then user B forks A's fork, does B's fork's `parent_song_id` point at A's fork or at the original X? Current proposal: just the immediate parent (one level). A separate query can walk the chain if needed.
- **Diff view:** should the UI show what's different between a fork and its parent? (Probably Phase 8 polish.)
- **Fork count display:** "This song has 12 forks" — useful signal? Phase 8.
