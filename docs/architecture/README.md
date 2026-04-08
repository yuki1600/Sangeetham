# Architecture Decision Records

Lightweight ADRs that capture **why** non-trivial architectural choices were made. Each ADR is numbered, written once, and amended only with new "Update" sections (never edited in place).

## Format

```
# NNNN — Short title

**Status:** proposed | accepted | superseded by NNNN
**Date:** YYYY-MM-DD
**Decision driver:** who/what prompted this

## Context
What's the situation that needs a decision?

## Decision
What did we choose?

## Consequences
What does this commit us to? What did we give up?

## Alternatives considered
Brief: what else was on the table and why we didn't pick it.
```

## Index

| # | Title | Status | Touches |
|---|---|---|---|
| [0001](0001-zoned-layout.md) | Zoned DAW-style Song View layout | accepted | UI architecture, all of `src/zones/` |
| [0002](0002-google-oauth.md) | Google OAuth as the only auth provider | accepted | `src/auth/`, `server/routes/auth.js` |
| [0003](0003-publish-state-machine.md) | Song state machine for the publish flow | accepted | `songs.state` column, all publish flows |
