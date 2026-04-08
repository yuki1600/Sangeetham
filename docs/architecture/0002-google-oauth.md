# 0002 — Google OAuth as the only auth provider

**Status:** accepted (planning, Phase 6 not yet shipped)
**Date:** 2026-04-08
**Decision driver:** the publish flow requires real users; we needed to commit to an auth model before designing the data layer.

## Context

Phase 0–5 of Sangeetham is single-user with no auth. The PRD ([§3](../PRD.md#3-user-lifecycle)) introduces a multi-user publish flow: users create drafts, request to publish globally, fork others' songs, and request admin promotion. Every one of those flows needs a stable identity.

We had to pick an auth approach before designing the `users` table, the session model, and the sign-in UX. Four candidates were considered:

1. **Email + password** — classic, requires hashing, password-reset email service, session management.
2. **Email + magic link** — passwordless, requires an email-sending service (Resend, Postmark, etc.).
3. **Google OAuth** — third-party identity, no email service, ties to Google account.
4. **Multi-provider** — support several, merge accounts at sign-in time.

## Decision

**Google OAuth only.** Single provider for v1.

Implementation sketch (Phase 6):
- `passport-google-oauth20` (or similar) on the Express server.
- `users` table stores `google_sub` (the Google OAuth subject ID), `email`, `display_name`, `avatar_url`, `role`.
- Server sessions via signed httpOnly cookie (rather than JWT — simpler, fewer pitfalls for a small app).
- Frontend route guard: `useCurrentUser()` hook returns the current user or `null`.

The bootstrap admin (the project owner, Srikanth) is identified by a hard-coded Google `email` in a server config — the first time that user signs in, their `users.role` is set to `admin`. This is the only special-cased account.

## Consequences

- **Zero password management.** No hashing, no reset emails, no breached-password lists to maintain.
- **No email service to run.** The big simplification compared to magic-link or email/password.
- **Strong identity.** Google OAuth is reliable, well-tested, and gives us verified email + display name + avatar for free.
- **Lock-in to Google.** Users without a Google account can't use Sangeetham (multi-user features). Anonymous browsing of the public library still works without sign-in, so this only affects authoring.
- **Phase 6 needs a Google Cloud project + OAuth client ID.** Setup overhead but it's a one-time cost.
- **No account recovery story** — if a user loses access to their Google account, they lose their drafts. Mitigate later by export tools (Phase 8?).

## Alternatives considered

- **Email + magic link** — second-best. Avoids password management AND doesn't lock to Google. Rejected because running a transactional email service is its own ops burden for a small project.
- **Email + password** — most ops burden, rejected.
- **Multi-provider (Google + email)** — most flexible, but every additional provider adds account-merging logic. Rejected for v1 — can be added later if there's demand.
- **No auth (single-user forever)** — would make the publish flow meaningless. The user explicitly chose multi-user.

## Updates

*(none yet)*
