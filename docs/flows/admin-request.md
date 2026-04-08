# Flow: Request admin promotion

> Referenced from [PRD §3.7](../PRD.md#3-user-lifecycle).
> **Status:** Phase 7 (not yet built).

## Actor

Any signed-in user who is not currently an admin.

## Why this flow exists

Admins do two things in Sangeetham:
1. Review and approve/reject publish + removal requests.
2. Manage other users (promote, demote).

The bootstrap admin (Srikanth) is hard-coded. Beyond that, admin status is granted by request — a user signals interest in helping curate the library, an existing admin reviews and approves.

## Steps

### Happy path

1. User signs in.
2. User navigates to their profile / settings page (Phase 7).
3. User clicks **Request admin** (or "Help curate the library").
4. Frontend prompts: *required note explaining why they want to be an admin.*
5. Frontend `POST /api/admin/admin-requests` with `{ note }`. Server:
   - Validates caller is signed in and not already an admin.
   - Validates no existing `pending` request from this user.
   - Creates an `admin_requests` row with `status='pending'`, `user_id`, `note`.
6. UI shows: *"Request submitted."*
7. An existing admin opens the Admin Console → Admin Requests queue.
8. Admin **Approves** → server:
   - Sets `admin_requests.status='approved'`, `decided_at=now`, `reviewer_id`.
   - Updates `users.role='admin'`.
9. User is notified. Their next session has admin permissions.

### Rejection path

8'. Admin **Rejects** with feedback → server:
   - Sets `admin_requests.status='rejected'`, `feedback=...`.
9'. User is notified.

## Demotion

Admins can demote other admins (or themselves, except for the bootstrap admin) via the Admin Console. Demotion is unilateral — no request required. It's logged for audit.

The bootstrap admin (hard-coded) cannot be demoted. This guarantees the system always has at least one admin.

## Postconditions

- `admin_requests` row exists.
- On approval, `users.role='admin'`.

## Error states

- **Caller already admin:** 409.
- **Existing pending request:** 409 / friendly "you already have a pending request".
- **Caller not signed in:** 401.

## Files involved

- Backend: `server/routes/admin.js` — `POST /api/admin/admin-requests`, `POST /api/admin/admin-requests/:id/{approve,reject}`, `POST /api/admin/users/:id/{promote,demote}` (Phase 7)
- Frontend: `src/lifecycle/admin-request/` (Phase 7)
- Frontend: `src/admin/AdminRequestQueue.jsx` (Phase 7)

## Open questions

- *Phase 7:* Auto-approve based on a karma signal (e.g., user has had ≥5 publish requests approved)? Or always require manual review?
- *Phase 7:* Notification delivery for the request decision (in-app vs email).
- *Phase 7:* Audit log retention — how long do we keep `admin_requests` rows?
