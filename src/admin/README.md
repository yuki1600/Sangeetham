# `src/admin/`

Site-wide admin console. See [PRD §3.7](../../docs/PRD.md#3-user-lifecycle), [PRD §5](../../docs/PRD.md#5-api-surface) (admin endpoints), and [`flows/admin-request.md`](../../docs/flows/admin-request.md).

## Status

**Not yet built.** Phase 7 of the [roadmap](../../docs/PRD.md#7-roadmap).

## Target file layout

```
admin/
├── README.md                       ← this file
├── AdminConsole.jsx                top-level admin page, tabs for users / publish queue / admin queue
├── UsersList.jsx                   table of all users with promote/demote actions
├── PublishReviewQueue.jsx          queue of pending publish + removal requests
├── AdminRequestQueue.jsx           queue of pending admin promotion requests
└── api.js                          fetch wrappers around /api/admin/*
```

## Access control

- The page is mounted only when `useCurrentUser().user?.role === 'admin'`. Non-admins get a 404.
- Server-side: every `/api/admin/*` route validates `req.user.role === 'admin'` before processing.

## What this is NOT

- It is not the **song-level** Admin Controls cell in the [Bottom Bar](../zones/bottomBar/README.md). That's per-song actions like Reset and Files.
- This is the **site-wide** admin surface — managing users, reviewing publish requests, reviewing admin promotion requests, and (Phase 8) browsing the audit log.

## Tabs (planned)

1. **Users** — list of all users, columns: avatar, name, email, role, joined date, song count. Promote/demote buttons (Phase 7) + (Phase 8) suspend/ban.
2. **Publish requests** — list of `publish_requests` with `status='pending'`. Each row shows: requester, song title, kind (publish/removal), submitted-at, note. Approve/reject buttons inline.
3. **Admin requests** — list of `admin_requests` with `status='pending'`. Each row: user, submitted-at, note. Approve/reject inline.
4. *(Phase 8)* **Audit log** — every admin action recorded.
