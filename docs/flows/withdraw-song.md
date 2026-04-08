# Flow: Withdraw a published song

> Referenced from [PRD §3.5](../PRD.md#3-user-lifecycle).
> **Status:** Phase 6 (not yet built).

## Actor

The original owner of a published song. (Admins can also unilaterally remove any published song — see "Admin removal" below.)

## Why this flow exists

Sometimes an owner wants to take their published song down — they discover an error, the rights situation changed, or they simply want to retract it. Withdrawal goes through the same admin review as publishing so removals are auditable and reversible.

## Steps

### Owner withdrawal request

1. Owner navigates to their published song (`#song-view/<id>`).
2. Owner clicks **Request removal** (in Edit Controls or the song settings menu).
3. Frontend prompts: *required reason for removal.*
4. Frontend `POST /api/songs/:id/withdraw-request` with `{ reason }`. Server:
   - Validates the song's `state` is `published`.
   - Validates caller is the owner (or an admin).
   - Creates a `publish_requests` row with `kind='removal'`, `status='pending'`, `requester_id`, `feedback=reason`.
   - Sets `songs.state='pending_removal'`. **The song stays publicly visible during review.**
5. UI shows: *"Removal request submitted."*
6. Admin reviews in the queue (Phase 7).
7. Admin **Approves** → server:
   - Sets `publish_requests.status='approved'`.
   - Sets `songs.state='removed'`. Soft delete — the row stays for audit.
   - Public library filters out `state='removed'`.
8. Owner is notified.

### Rejection path

7'. Admin **Rejects** with feedback (e.g., "the song meets our content standards"):
   - Sets `publish_requests.status='rejected'`.
   - Reverts `songs.state` to `published`.
8'. Owner is notified with the rejection feedback.

### Admin removal (no request)

An admin can also remove a song unilaterally without a request — for content violations, rights issues, etc. This goes straight to `state='removed'` and creates a `publish_requests` row with `requester_id=admin`, `kind='removal'`, `status='approved'`, `feedback='admin removal: <reason>'` for audit.

## Postconditions

- `publish_requests` row exists.
- `songs.state` is `pending_removal` (during review) or `removed`/`published` (after decision).
- Removed songs are NOT deleted from the DB — they're soft-state. Admin queries can still see them.

## Restoration

A `removed` song can be restored by an admin (Phase 7 admin console action). Sets `state='published'` and creates a new `publish_requests` row for audit.

## Error states

- **Song not in `published` state:** 409.
- **Caller is not the owner and not an admin:** 403.

## Files involved

- Backend: `server/routes/songs.js` — `POST /api/songs/:id/withdraw-request` (Phase 6)
- Backend: `server/routes/admin.js` — `POST /api/admin/publish-requests/:id/{approve,reject}` (Phase 7, shared with publish requests)
- Frontend: `src/lifecycle/withdraw-song/` (Phase 6)

## Open questions

- *Phase 6:* During `pending_removal`, should the song show a "removal pending" badge to the public? Or stay invisible-state?
- *Phase 6:* Should withdrawal require the song to have been published for a minimum time (e.g., to prevent immediate retract abuse)?
