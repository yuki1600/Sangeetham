# `src/auth/`

Google OAuth + session handling for the frontend. See [PRD §5](../../docs/PRD.md#5-api-surface) (auth endpoints) and [ADR-0002](../../docs/architecture/0002-google-oauth.md) (why Google OAuth).

## Status

**Not yet built.** Phase 6 of the [roadmap](../../docs/PRD.md#7-roadmap). The shell exists so the import path is stable for the components that will land here.

## Target file layout

```
auth/
├── README.md                       ← this file
├── AuthProvider.jsx                React context, holds current user, exposes signIn()/signOut()
├── useCurrentUser.js               hook: returns the current user or null
├── GoogleSignIn.jsx                "Sign in with Google" button (used in the header)
└── routeGuard.jsx                  HOC / wrapper for sign-in-only routes
```

## Contract

```ts
type CurrentUser = {
  id: string
  email: string
  displayName: string
  avatarUrl: string
  role: 'user' | 'admin'
}

const { user, signIn, signOut, loading } = useCurrentUser()
```

## Implementation sketch (Phase 6)

- Server: `passport-google-oauth20`. Routes:
  - `GET /api/auth/google` → redirect to Google's consent screen
  - `GET /api/auth/google/callback` → consume code, set httpOnly session cookie
  - `POST /api/auth/logout` → clear cookie
  - `GET /api/me` → return current user from session, or 401
- Client: on app boot, `AuthProvider` calls `GET /api/me`. If 200, store the user. If 401, leave as anonymous.
- The `useCurrentUser()` hook reads from the provider context.

## Bootstrap admin

The first user whose Google email matches a hard-coded admin email (in server config) is auto-promoted to `role='admin'` on first sign-in. This is the only special-cased account; all other admins are granted via the [admin request flow](../../docs/flows/admin-request.md).
