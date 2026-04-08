# Flow: Request to publish globally

> Referenced from [PRD §3.4](../PRD.md#3-user-lifecycle).
> **Status:** Phase 6 (not yet built).

## Actor

The owner of a draft song (any signed-in user).

## Why this flow exists

Anyone can save drafts to their personal library. Getting a song into the **public library** (visible to all users, signed-in or not) requires admin review to maintain quality. This flow is the request side; admin review happens via the [Admin Console](../../src/admin/README.md) (Phase 7).

## Steps

### Happy path

1. User has a draft they want to publish. They navigate to it (`#editor-song/<id>`).
2. User clicks **Request to publish** (in Edit Controls).
3. Frontend prompts: *optional note to the reviewer.*
4. Frontend `POST /api/songs/:id/publish-request` with `{ note }`. Server:
   - Validates the song's current `state` is `draft` (or `published` if this is a re-publish — see below).
   - Validates the song belongs to the requester.
   - Creates a row in `publish_requests` with `kind='publish'`, `status='pending'`, `requester_id`, `song_id`, `note`.
   - Updates the song's `state` to `pending_publish`.
5. UI shows: *"Request submitted. You'll be notified when an admin reviews it."* (Notification mechanism is a Phase 6 TBD.)
6. Admin opens the Admin Console (Phase 7). Sees the request in the queue.
7. Admin **Approves** (with optional feedback) → server:
   - Sets `publish_requests.status='approved'`, `decided_at=now`, `reviewer_id=admin`.
   - Sets `songs.state='published'`.
   - Bumps `songs.version` (or appends a new `song_versions` row with `published_at=now`).
8. Song is now visible in the public library.

### Rejection path

7'. Admin **Rejects** with feedback → server:
   - Sets `publish_requests.status='rejected'`, `decided_at=now`, `feedback=...`.
   - Sets `songs.state='draft'`.
8'. User receives the feedback (Phase 6 TBD: in-app inbox vs email vs both).

### Re-publish path

If the song is already `published` and the owner wants to update it:

1. Owner edits the song (steps 1–4 of [`update-song.md`](update-song.md)).
2. On Save, the owner is offered two buttons:
   - **Save private** → goes through [`edit-published-privately.md`](edit-published-privately.md) instead.
   - **Save & request re-publish** → continues this flow.
3. Server records the new draft version, creates a `publish_requests` row with `kind='publish'`. The currently-published version stays public until admin approves.
4. On approval, the new version supersedes the old one. Old version stays in `song_versions` for history.

## Postconditions

- `publish_requests` row exists.
- `songs.state` is `pending_publish` (during review) or `published` / `draft` (after decision).

## Admin self-publish

If the requester is themselves an admin, the request is auto-approved at submission time (admin == reviewer, no waiting). The `publish_requests` row is still created with `status='approved'` and `reviewer_id=requester_id` for audit.

## Error states

- **Song not in `draft` or `published` state:** 409 ("can't publish a song already pending review").
- **Caller is not the owner:** 403.
- **Caller not signed in:** 401 → sign-in prompt.

## Files involved

- Backend: `server/routes/songs.js` — `POST /api/songs/:id/publish-request` (Phase 6)
- Backend: `server/routes/admin.js` — `POST /api/admin/publish-requests/:id/{approve,reject}` (Phase 7)
- Frontend: `src/lifecycle/publish-request/` (Phase 6)
- Frontend: `src/admin/PublishReviewQueue.jsx` (Phase 7)

## Open questions

- *Phase 6:* Notification delivery — in-app inbox? Email via Resend? Both?
- *Phase 6:* Rate limit on requests per user per day?
