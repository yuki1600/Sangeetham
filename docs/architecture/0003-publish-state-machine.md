# 0003 — Song state machine for the publish flow

**Status:** accepted (planning, Phase 6 not yet shipped)
**Date:** 2026-04-08
**Decision driver:** the publish/withdraw/fork/edit-private flows need a single source of truth for what state a song is in and which transitions are legal.

## Context

The PRD ([§3](../PRD.md#3-user-lifecycle)) defines seven user flows that all touch a song's "publish-ness": add, update, edit-published-privately, request publish, withdraw, fork, request admin. These flows have to agree on:

- What states a song can be in.
- Who can transition a song between states.
- What happens to old data when a song moves between states.
- Whether the public library shows the song.

Without an explicit state machine, the flows would each invent their own predicates ("is this publishable?", "should this show in the public list?"), drift apart, and create bugs (e.g., a `pending_publish` song accidentally appearing in the public library because one flow forgot to filter it).

## Decision

**Single `state` column on `songs` with five values.** Replaces the existing boolean `isPublished` flag.

```
draft               — owner is editing; not publicly visible
pending_publish     — submitted for review; not publicly visible
published           — approved; visible in the public library
pending_removal     — owner requested removal; STILL publicly visible during review
removed             — soft-deleted; never visible in the public library, kept for audit
```

### Transitions

| From | Event | Actor | To | Notes |
|---|---|---|---|---|
| `draft` | submit publish request | owner | `pending_publish` | Creates `publish_requests` row. |
| `pending_publish` | approve | admin | `published` | Bumps `version`, snapshots to `song_versions`. |
| `pending_publish` | reject | admin | `draft` | Feedback recorded on `publish_requests`. |
| `published` | edit privately | owner / any user | (no change to source song) | Creates a new `draft` row with `parent_song_id` set. |
| `published` | edit + submit re-publish | owner | `pending_publish` (new version) | Public version stays live until approval; on approval, new version supersedes. |
| `published` | request removal | owner | `pending_removal` | Public visibility unchanged during review. |
| `pending_removal` | approve | admin | `removed` | Filters out of public list. |
| `pending_removal` | reject | admin | `published` | Feedback recorded. |
| `published` / `removed` | fork | any signed-in user | (no change to source song) | Creates a new `draft` with `parent_song_id`. |
| `removed` | restore | admin | `published` | Audit trail in `publish_requests`. |

### Invariants

1. Only **admins** can perform `pending_publish → published`, `pending_publish → draft` (rejection), `pending_removal → removed`, `pending_removal → published` (rejection), and `removed → published` (restore).
2. Admins can self-approve their own publish requests (admin == reviewer). The `publish_requests` row still records the approval for audit.
3. The public library SQL is `WHERE state = 'published' OR state = 'pending_removal'`. (Pending-removal songs stay visible during review.)
4. A user's "My drafts" list is `WHERE owner_id = me AND state IN ('draft', 'pending_publish')`.
5. `parent_song_id` is set on every fork and on every "edit privately" branch. The original is never mutated.

## Consequences

- **One column, one source of truth.** Every flow checks the same `state` enum. No drift.
- **Soft-delete via `removed`.** Audit trail preserved. Admins can restore mistakenly-removed songs.
- **`pending_removal` keeps the song visible during review.** This is deliberate — taking a song down should require admin sign-off so no one can quietly disappear content.
- **Version history works seamlessly.** Each approved `pending_publish → published` snapshots the composition into `song_versions`. Old public versions are queryable.
- **Edit-private == fork** at the data layer. Two UI affordances, one backend operation. Documented in [`flows/edit-published-privately.md`](../flows/edit-published-privately.md).
- **Admin self-approval shortcuts the review queue** but still records who/when, so it's auditable.

## Alternatives considered

- **Two booleans (`is_published`, `pending_review`)** — what we had. Easy to get into illegal states (e.g., both true at once). Rejected — enums are stricter.
- **Workflow library / state machine framework (XState, etc.)** — overkill for 5 states and ~10 transitions. The state machine fits in a single switch statement on the server.
- **No `pending_removal` state** (just go straight from `published` to `removed` on owner request) — bypasses admin review for removals. Rejected: removals deserve the same gate as publishes for audit and reversibility.
- **Hard-delete on removal** — irreversible, no audit trail. Rejected.

## Updates

*(none yet)*
