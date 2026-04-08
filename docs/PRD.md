# Sangeetham — Product Requirements Document

> **Status:** v0.1 — initial draft, reflects decisions through the Phase 2 ship.
> **Owner:** @srikanth-trustt
> **Last updated:** 2026-04-08
> **Audience:** future-you, AI agents working on the repo, future contributors.

This is the canonical product spec for Sangeetham. Every section corresponds to a real piece of the system so changes can be tracked surgically. When you change something in code, find the matching section here and update it in the same commit.

---

## Table of contents

1. [Overview](#1-overview)
2. [Layout — the zoned mockup](#2-layout--the-zoned-mockup)
   - 2.1 [Audio Control Zone](#21-audio-control-zone)
   - 2.2 [Song Track Zone](#22-song-track-zone)
   - 2.3 [Bottom Bar](#23-bottom-bar)
3. [User Lifecycle](#3-user-lifecycle)
4. [Data Model](#4-data-model)
5. [API Surface](#5-api-surface)
6. [Repo Structure](#6-repo-structure)
7. [Roadmap](#7-roadmap)
8. [Out of Scope (v1)](#8-out-of-scope-v1)
9. [Change Log](#9-change-log)

---

## 1. Overview

### Problem

Carnatic music is traditionally taught one-on-one in the guru-shishya tradition. Self-practice is hard because the student has no real-time feedback on whether they're singing in tune, and existing notation tools don't sync swara, sahitya, and audio in a way that mirrors how a guru teaches. Sangeetham closes that gap with synchronised playback, real-time pitch detection, and a curated library of compositions you can practice against.

### Vision

A DAW-style learning environment for Carnatic music. Each composition is a multi-track session — sound, sahitya, swara, accompaniment — that the student can scrub, slow down, transpose, and loop. Teachers and serious students can author new compositions and request to publish them to a shared global library.

### Audience for this document

- **Future-Srikanth** picking the repo back up after a context gap.
- **AI agents** (Claude, etc.) working on the repo — this doc is the source of truth for what we're building and why.
- **Future contributors** who need to understand the product before touching code.

### The mockup

The product is organized around a three-zone DAW-style layout that the user authored as a mockup. The image lives at [`docs/assets/zoned-layout-mockup.png`](assets/zoned-layout-mockup.png) (placeholder until added). The textual representation:

```
+--------------------------------------------------------------+
|                       AUDIO CONTROL ZONE                      |
| Song   |  Transport Controls  |  Speed/Pitch  |               |
| Info   +----------------------+---------------+ Composer Info |
|        |  Edit Controls       |  Audio Ctrls  |               |
+--------+--------------------------------------+---------------+
| [TC] |               Sound Track                              |
| [TC] |               Sahitya Track                            |     SONG
| [TC] |               Swara Track                              |     TRACK
| [TC] |               Instrument Track 1                       |     ZONE
| [TC] |               Instrument Track 2                       |
+------+--------------------------------------------------------+
| Admin    |       Condensed Song Track       | Time            |  BOTTOM
| Controls |       (minimap)                  | Controls        |   BAR
+--------------------------------------------------------------+
```

`[TC]` = Track Controls. **Note:** the mockup draws Track Controls as left-side panels, but the committed implementation places them inline below each track's heading (see [§2.2](#22-song-track-zone)). The mockup boxes are an aspirational representation of the controls' existence, not their position.

---

## 2. Layout — the zoned mockup

The Song View (formerly `EditorSongView`) is the primary surface of the app. It is one component, mounted by both the `song-view/:id` and `editor-song/:id` routes (see [Roadmap §7](#7-roadmap), Phase 1). It has three top-level zones.

### 2.1 Audio Control Zone

The top zone. Six cells in a 4×2 grid (Song Info / Composer Info span two rows on the outside; the four middle cells are Transport, Speed/Pitch, Edit, Audio).

| Cell | Owner file (target) | Status | Contents |
|---|---|---|---|
| **Song Info** | `src/zones/audioControlZone/SongInfoPanel.jsx` | shipped (still inlined in `EditorSongView.jsx`) | Back button, song title, raga, tala, Edit Info button, Favorite toggle |
| **Transport Controls** | `src/zones/audioControlZone/TransportControls.jsx` | shipped (still inlined) | Loop toggle, restart, swara/sahitya audio toggle, play/pause, time display, current āvartana counter |
| **Speed/Pitch Controls** | `src/zones/audioControlZone/SpeedPitchControls.jsx` | **not yet built (Phase 4)** | Tempo slider 0.5×–1.5× via `HTMLAudioElement.playbackRate`. Pitch shift ±6 semitones via `Tone.PitchShift` on the master bus. Both master, no per-track. |
| **Edit Controls** | `src/zones/audioControlZone/EditControls.jsx` | shipped (still inlined as the edit toolbar) | Sections, Trim, Calibrate, Lyrics, Save. Currently always visible (the `readOnly` distinction was removed in Phase 1). |
| **Audio Controls** | `src/zones/audioControlZone/AudioMixerControls.jsx` | **not yet built (Phase 4)** | Master volume slider, drone on/off + tonic picker, mic monitor toggle. The "Audio Controls 4" label in the mockup — the "4" was a placeholder, ignore it. |
| **Composer Info** | `src/zones/audioControlZone/ComposerInfoPanel.jsx` | shipped (still inlined) | Composer name, composition type, arohana/avarohana display |

**Why this split?** Each cell is a clean responsibility boundary. A change to "Speed/Pitch" only touches `SpeedPitchControls.jsx`. A change to "Edit Controls" only touches `EditControls.jsx`. Today everything is inlined in `EditorSongView.jsx` — Phase 3 extracts these into the per-zone files listed above.

### 2.2 Song Track Zone

The middle zone. Five tracks stacked vertically.

| Track | Owner file (target) | Status | Kind | Contents |
|---|---|---|---|---|
| **Sound Track** | `src/zones/songTrackZone/tracks/SoundTrack.jsx` | shipped (wraps `WaveformEditor`) | audio | Waveform of the rendered audio. Click/drag to scrub. |
| **Sahitya Track** | `src/zones/songTrackZone/tracks/SahityaTrack.jsx` | shipped (wraps `NotationLane type="sahitya"`) | visual | Lyrics rendered against the audio timeline. No audio output. |
| **Swara Track** | `src/zones/songTrackZone/tracks/SwaraTrack.jsx` | shipped (wraps `NotationLane type="swara"`) | visual | Solfège notation rendered against the audio timeline. No audio output. |
| **Instrument Track 1 — Tala** | `src/zones/songTrackZone/tracks/InstrumentTrack.jsx` | **not yet built (Phase 4)** | synth | Tala synth via Tone.js. `Tone.MembraneSynth` for tha/dhin + filtered `Tone.NoiseSynth` for ka/nam. Pattern derived from `TALA_TEMPLATES[meta.tala]`. Sync via `Tone.Transport`. |
| **Instrument Track 2 — Tambura** | `src/zones/songTrackZone/tracks/InstrumentTrack.jsx` | **not yet built (Phase 4)** | synth | Tambura via Tone.js. Reuses `createStringVoice` from [`src/utils/droneEngine.js`](../src/utils/droneEngine.js). Plays the tonic continuously while the song plays. |

#### Track abstraction

Every track shares:

- A **track header** (label badge at `top: 6, ml-4`) that doubles as a visibility toggle (click to collapse/expand).
- A **TrackControls row** (only for `kind === 'audio'` and `kind === 'synth'`) directly below the header — the "empty space below the heading" approach. Visual tracks (Sahitya, Swara) have NO controls row.
- A **TrackResizeHandle** on the bottom edge (only when expanded) — drag to resize the track height.
- State managed by [`useTrackMixer`](../src/hooks/useTrackMixer.js): `{ kind, label, muted, solo, volume, visible, heightPx }` per track.
- For audio tracks, mute/volume/solo are applied directly to `audio.muted` / `audio.volume`. The Web Audio routing mockup (MediaElementSource → GainNode) was tried in Phase 2 and rolled back because it muted the default-output path under StrictMode dev. We will revisit when Phase 4 needs a real mix bus for the Tone.js instrument tracks.

The mockup draws a left-side `[TC]` panel for every track. **The committed implementation does not.** Track Controls live inline below the header. The reasoning is in [ADR-0001](architecture/0001-zoned-layout.md).

#### Cross-track behaviour

- **Wheel/swipe pan** is wired once at the Song Track Zone `<main>` element via `useWheelZoom`. Two-finger horizontal swipe pans the timeline from anywhere in the zone — over any track, between tracks, on empty space.
- **Drag-to-seek / drag-to-loop** is wired at the same `<main>` via `useDragSeek`.
- The **playhead** is fixed at 12.5% of the zone width (`PLAYHEAD` constant). Time scrolls left under it.
- An **AvartanaBoundaryOverlay** spans every track with vertical lines at each āvartana boundary.

### 2.3 Bottom Bar

| Cell | Owner file (target) | Status | Contents |
|---|---|---|---|
| **Admin Controls** | `src/zones/bottomBar/AdminControls.jsx` | shipped buttons, **not yet relocated** | The existing **Reset** and **Files** buttons (currently in the Edit toolbar). Phase 3 moves them here. "Admin" here means *song-level* admin actions (reset edits, manage files for this song), NOT the site-wide admin console. |
| **Condensed Song Track** | `src/zones/bottomBar/MinimapTrack.jsx` | **not yet built (Phase 4)** | Full-song waveform minimap with viewport indicator. Reuses the peak-extraction loop from `WaveformEditor.jsx:63-78` (will be extracted to `src/utils/waveformPeaks.js`). Click anywhere → seek. Drag the viewport rectangle → continuous scrub. |
| **Time Controls** | `src/zones/bottomBar/TimeControls.jsx` | shipped (the existing seek slider) | Current-time / total-duration display + the seek bar. Click/drag to seek. |

---

## 3. User Lifecycle

The product centers on a few core user flows. Each flow has a dedicated step-by-step doc under [`docs/flows/`](flows/). This section is a high-level summary; the linked docs have the full step-by-step with actor / preconditions / steps / postconditions / error states.

| # | Flow | Doc | Available to | Status |
|---|---|---|---|---|
| 3.1 | Add a new song | [`flows/add-song.md`](flows/add-song.md) | signed-in user, admin | shipped |
| 3.2 | Update an existing (draft) song | [`flows/update-song.md`](flows/update-song.md) | owner, admin | shipped |
| 3.3 | Edit a published song privately | [`flows/edit-published-privately.md`](flows/edit-published-privately.md) | owner, any signed-in user | Phase 6 |
| 3.4 | Request to publish globally | [`flows/publish-request.md`](flows/publish-request.md) | owner | Phase 6 |
| 3.5 | Withdraw a published song | [`flows/withdraw-song.md`](flows/withdraw-song.md) | owner | Phase 6 |
| 3.6 | Fork a published song | [`flows/fork-song.md`](flows/fork-song.md) | any signed-in user | Phase 6 |
| 3.7 | Request admin promotion | [`flows/admin-request.md`](flows/admin-request.md) | any signed-in user | Phase 7 |

### State machine (canonical)

A song moves through these states. Edges in **bold** require an admin decision.

```
                  submit
draft ───────────────────────────► pending_publish
  ▲                                 │
  │ admin rejects (with feedback)   │ admin approves
  └─────────────────────────────────┤
                                    ▼
            ┌──────────────── published ◄────────┐
            │                  │  ▲              │
            │ owner edits      │  │ admin        │
            │ + submits        │  │ approves     │
            ▼                  │  │              │
      pending_publish (vN+1) ──┘  │              │
                                  │              │
            owner edits privately │              │
            ─────────────────────►│              │
            (creates new draft)   │              │
                                  │              │
            owner requests        │              │
            removal               │              │
            ────────────────────► pending_removal
                                  │              │
                       admin      │              │ admin
                       approves   │              │ rejects
                                  ▼              │
                                removed ◄────────┘
                                                │
            any user forks                      │
            ────────────────────► draft (in forker's library, with attribution)
```

Key invariants:
- Only **admins** can approve `pending_publish` or `pending_removal` transitions.
- An admin's own publishes go directly to `published` (admin == reviewer).
- A song in `published` is **immutable from the public's view**. Owners can edit it but those edits go through review (or land in a separate private draft).
- `removed` is a soft state (the row stays for audit) — the public library filters it out.

---

## 4. Data Model

Schema lives in [`server/db.js`](../server/db.js) and (in Phase 6+) the new migrations under [`server/migrations/`](../server/migrations/).

### `users` (Phase 6+)
| Column | Type | Notes |
|---|---|---|
| `id` | TEXT (uuid) | primary key |
| `google_sub` | TEXT | Google OAuth subject ID, unique |
| `email` | TEXT | from Google |
| `display_name` | TEXT | from Google |
| `avatar_url` | TEXT | from Google |
| `role` | TEXT | `user` \| `admin`. Bootstrap admin (Srikanth) is hard-coded. |
| `created_at` | TEXT | ISO timestamp |

### `songs` (extended)
Existing columns from Phase 0 + new ones for ownership and publish state.

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT (uuid) | primary key |
| `owner_id` | TEXT | FK → `users.id`. **Phase 6.** Existing songs migrated to bootstrap admin's `id`. |
| `parent_song_id` | TEXT, nullable | FK → `songs.id`. Set when this song is a fork or private edit of another. **Phase 6.** |
| `state` | TEXT | `draft` \| `pending_publish` \| `published` \| `pending_removal` \| `removed`. **Phase 6.** Replaces the boolean `isPublished`. |
| `version` | INTEGER | Bumped each time a `pending_publish` is approved. **Phase 6.** |
| `title`, `composition`, `editOps`, `swaraAudio`, `sahityaAudio`, `raga`, `tala`, `composer`, `compositionType`, `avartanasPerRow`, `isFavorite`, `createdAt`, `updatedAt` | (existing) | unchanged |

### `song_versions` (extended in Phase 6)
Existing version-history table gains the snapshot semantics for the publish flow.

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT (uuid) | primary key |
| `songId` | TEXT | FK → `songs.id` |
| `version_number` | INTEGER | Monotonic per-song. **Phase 6.** |
| `composition` | TEXT | JSON snapshot |
| `editOps` | TEXT | JSON snapshot |
| `label` | TEXT | optional human-readable label |
| `created_at` | TEXT | ISO timestamp |
| `published_at` | TEXT, nullable | When this version was approved. Null = local save only. **Phase 6.** |

### `publish_requests` (Phase 6+)
| Column | Type | Notes |
|---|---|---|
| `id` | TEXT (uuid) | primary key |
| `song_id` | TEXT | FK → `songs.id` |
| `requester_id` | TEXT | FK → `users.id` |
| `kind` | TEXT | `publish` \| `removal` |
| `status` | TEXT | `pending` \| `approved` \| `rejected` |
| `reviewer_id` | TEXT, nullable | FK → `users.id`, set on decision |
| `feedback` | TEXT, nullable | admin's reason (esp. on rejection) |
| `created_at`, `decided_at` | TEXT | ISO timestamps |

### `admin_requests` (Phase 7+)
| Column | Type | Notes |
|---|---|---|
| `id` | TEXT (uuid) | primary key |
| `user_id` | TEXT | FK → `users.id` |
| `status` | TEXT | `pending` \| `approved` \| `rejected` |
| `reviewer_id` | TEXT, nullable | FK → `users.id` |
| `feedback` | TEXT, nullable | |
| `created_at`, `decided_at` | TEXT | |

---

## 5. API Surface

Express server at `:3001` (dev: `:3002`). Existing routes are in [`server/routes/songs.js`](../server/routes/songs.js); new routes land in [`server/routes/auth.js`](../server/routes/auth.js), [`server/routes/users.js`](../server/routes/users.js), and [`server/routes/admin.js`](../server/routes/admin.js) during Phase 6/7.

### Existing (Phase 0)
| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/songs` | List all songs |
| `POST` | `/api/songs/upload` | Upload audio + JSON to create a new song |
| `GET` | `/api/songs/:id` | Fetch composition + meta |
| `GET` | `/api/songs/:id/audio` | Stream the audio blob |
| `PUT` | `/api/songs/:id` | Save composition / editOps / metadata |
| `PATCH` | `/api/songs/:id/metadata` | Patch raga/tala/composer/compositionType/isFavorite |
| `POST` | `/api/songs/:id/swap-json` | Replace composition JSON from a file |
| `GET` | `/api/songs/:id/versions` | List version history |
| `GET` | `/api/songs/:id/versions/:vid` | Fetch a specific version snapshot |
| `POST` | `/api/songs/:id/restore/:vid` | Restore a version to current |
| `DELETE` | `/api/songs/:id` | Delete a song |

### New (Phase 6: auth + ownership)
| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/auth/google` | Begin Google OAuth |
| `GET` | `/api/auth/google/callback` | OAuth redirect target |
| `POST` | `/api/auth/logout` | End session |
| `GET` | `/api/me` | Current user (or 401) |
| `POST` | `/api/songs/:id/fork` | Fork a published song into the caller's drafts |
| `POST` | `/api/songs/:id/publish-request` | Submit for publish review |
| `POST` | `/api/songs/:id/withdraw-request` | Submit for removal review |
| `GET` | `/api/songs?owner=me&state=draft` | Filter the list by owner + state |

### New (Phase 7: admin console)
| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/admin/users` | List all users |
| `POST` | `/api/admin/users/:id/promote` | Promote user to admin |
| `POST` | `/api/admin/users/:id/demote` | Demote admin to user |
| `GET` | `/api/admin/publish-requests?status=pending` | Review queue for publishes/removals |
| `POST` | `/api/admin/publish-requests/:id/approve` | Approve (with optional feedback) |
| `POST` | `/api/admin/publish-requests/:id/reject` | Reject (with feedback) |
| `GET` | `/api/admin/admin-requests?status=pending` | Review queue for admin promotions |
| `POST` | `/api/admin/admin-requests/:id/approve` | Approve a promotion |
| `POST` | `/api/admin/admin-requests/:id/reject` | Reject a promotion |

---

## 6. Repo Structure

The target tree mirrors the zone/flow modularization. **Restructure is incremental:** new code lands here; old code under `src/components/` is decomposed into the new tree as Phases 3–5 progress. Don't move files unless you're touching them.

```
src/
├── zones/                          NEW — one folder per zone in the mockup
│   ├── audioControlZone/
│   │   ├── AudioControlZone.jsx        (Phase 3)
│   │   ├── SongInfoPanel.jsx           (Phase 3)
│   │   ├── TransportControls.jsx       (Phase 3)
│   │   ├── SpeedPitchControls.jsx      (Phase 4)
│   │   ├── EditControls.jsx            (Phase 3)
│   │   ├── AudioMixerControls.jsx      (Phase 4)
│   │   ├── ComposerInfoPanel.jsx       (Phase 3)
│   │   └── README.md                   what this zone owns, props/state
│   ├── songTrackZone/
│   │   ├── SongTrackZone.jsx           (Phase 3)
│   │   ├── TrackControls.jsx           (Phase 2 — currently at src/components/songview/)
│   │   ├── TrackResizeHandle.jsx       (Phase 2 — currently at src/components/songview/)
│   │   ├── tracks/
│   │   │   ├── SoundTrack.jsx          (Phase 3)
│   │   │   ├── SahityaTrack.jsx        (Phase 3)
│   │   │   ├── SwaraTrack.jsx          (Phase 3)
│   │   │   ├── InstrumentTrack.jsx     (Phase 4 — generic Tone.js renderer)
│   │   │   └── instrumentVoices.js     (Phase 4 — tala + tambura voice factories)
│   │   └── README.md
│   └── bottomBar/
│       ├── BottomBar.jsx               (Phase 3)
│       ├── AdminControls.jsx           (Phase 3 — Reset + Files relocated)
│       ├── MinimapTrack.jsx            (Phase 4)
│       ├── TimeControls.jsx            (Phase 3)
│       └── README.md
│
├── lifecycle/                      NEW — code that implements user flows
│   ├── add-song/                       (Phase 3 — refactor existing upload)
│   ├── update-song/                    (Phase 3)
│   ├── publish-request/                (Phase 6)
│   ├── fork-song/                      (Phase 6)
│   ├── withdraw-song/                  (Phase 6)
│   └── admin-request/                  (Phase 7)
│
├── auth/                           NEW (Phase 6) — Google OAuth + session
│   ├── GoogleSignIn.jsx
│   ├── useCurrentUser.js
│   ├── AuthProvider.jsx
│   └── README.md
│
├── admin/                          NEW (Phase 7) — site-wide admin console
│   ├── AdminConsole.jsx
│   ├── UsersList.jsx
│   ├── PublishReviewQueue.jsx
│   ├── AdminRequestQueue.jsx
│   └── README.md
│
├── components/                     EXISTING — gradually shrinks as code moves
├── hooks/                          EXISTING — useTrackMixer, useDragSeek, useWheelZoom, ...
├── utils/                          EXISTING — songParser, audioEditor, droneEngine, ...
└── App.jsx

server/
├── routes/
│   ├── songs.js                    EXISTING — gains owner_id, state filters in Phase 6
│   ├── auth.js                     NEW (Phase 6)
│   ├── users.js                    NEW (Phase 6)
│   └── admin.js                    NEW (Phase 7)
├── db.js                           EXTENDED — users, publish_requests, admin_requests
└── migrations/                     NEW — versioned schema changes

docs/
├── PRD.md                          THIS FILE
├── assets/
│   └── zoned-layout-mockup.png     (drop the user's mockup here)
├── flows/                          one MD per user flow
│   ├── add-song.md
│   ├── update-song.md
│   ├── edit-published-privately.md
│   ├── publish-request.md
│   ├── withdraw-song.md
│   ├── fork-song.md
│   └── admin-request.md
└── architecture/                   ADRs
    ├── README.md                   index of ADRs
    ├── 0001-zoned-layout.md
    ├── 0002-google-oauth.md
    └── 0003-publish-state-machine.md
```

### Modularization principle

- **Code is organized by zone.** A change to "Sound Track" only touches `src/zones/songTrackZone/tracks/SoundTrack.jsx`. A change to "Edit Controls" only touches `src/zones/audioControlZone/EditControls.jsx`. The PRD section for that zone tells you which file owns it.
- **Documentation is organized by user flow.** A change to "how publish works" only touches [`docs/flows/publish-request.md`](flows/publish-request.md). The PRD links into that doc, doesn't duplicate it.
- **Architectural decisions live in ADRs.** Each non-trivial decision gets a numbered file under [`docs/architecture/`](architecture/). Future-you reads it to understand *why*, not just *what*.

---

## 7. Roadmap

Phases are numbered for ordering, not effort. Each phase ships independently and is load-bearing in production immediately. The split layout-first / auth-later was a deliberate decision (see [ADR-0001](architecture/0001-zoned-layout.md), §"Rollout").

### Phase 1 — Route unification + terminology (DONE, 2026-04-08)
- Route `editor-song/:id` and `song-view/:id` both mount the same component (`EditorSongView`).
- Removed the `readOnly` prop and the inline View/Edit toggle. Edit capabilities are always available.
- Renamed code-level vocabulary to match the mockup (Sound Track / Sahitya Track / Swara Track / Audio Control Zone / Song Track Zone / Bottom Bar / Edit Controls / Transport Controls).
- Deleted unused [`src/components/LaneLabel.jsx`](../src/components/LaneLabel.jsx).
- See change log §9.

### Phase 2 — Track abstraction (DONE, 2026-04-08)
- New [`src/hooks/useTrackMixer.js`](../src/hooks/useTrackMixer.js) — central per-track state (`muted`, `solo`, `volume`, `visible`, `heightPx`).
- New [`src/components/songview/TrackControls.jsx`](../src/components/songview/TrackControls.jsx) — compact horizontal Mute/Solo/Volume row, audio tracks only.
- New [`src/components/songview/TrackResizeHandle.jsx`](../src/components/songview/TrackResizeHandle.jsx) — bottom-edge drag-to-resize.
- Sound Track: clickable label = visibility toggle. Inline Mute/Solo/Volume controls below the label. Drag bottom edge to resize.
- Sahitya / Swara: clickable label = visibility toggle. NO Mute/Solo/Volume (visual-only). Drag bottom edge to resize.
- Wheel/swipe pan centralised at the Song Track Zone `<main>` via `useWheelZoom`. Removed per-child wheel listeners from `NotationLane` and `WaveformEditor`.
- Mute/Volume go through `audio.muted` / `audio.volume` directly (the Web Audio MediaElementSource approach was tried and rolled back for reliability under StrictMode).
- See change log §9.

### Phase 3 — Layout decomposition (next)
**Scope:** Extract the inlined zones from `EditorSongView.jsx` (~2200 lines) into the per-zone files under `src/zones/`. Same functionality, same rendering, smaller files.
- Create `src/zones/audioControlZone/{AudioControlZone, SongInfoPanel, TransportControls, EditControls, ComposerInfoPanel}.jsx`.
- Create `src/zones/songTrackZone/{SongTrackZone}.jsx` and the three current track files.
- Create `src/zones/bottomBar/{BottomBar, AdminControls, TimeControls}.jsx`. Move the existing Reset + Files buttons into `AdminControls`.
- `EditorSongView.jsx` becomes a thin orchestrator that composes the three zones and owns shared state.
- **Exit criteria:** `EditorSongView.jsx` is under ~600 lines. Visual diff: zero. Build clean.

### Phase 4 — New widgets
**Scope:** Add the cells the mockup demands but Phase 3 didn't create.
- `SpeedPitchControls.jsx` — tempo + pitch shift sliders.
- `AudioMixerControls.jsx` — master volume + drone toggle + mic monitor.
- `MinimapTrack.jsx` — Condensed Song Track with viewport indicator. Extracts the peak-extraction loop from `WaveformEditor.jsx:63-78` into `src/utils/waveformPeaks.js`.
- `InstrumentTrack.jsx` + `instrumentVoices.js` — Tala synth + Tambura via Tone.js, synced to `Tone.Transport`.
- **Exit criteria:** All five tracks in the Song Track Zone are present and audible (where applicable). Speed/Pitch slider affects playback. Minimap navigates.

### Phase 5 — Polish & state persistence
**Scope:** Tighten the layout, persist what matters.
- Persist `tracks` state (mute/solo/volume/visible/heightPx) in `editOps` JSON. `editOps` is already a free-form JSON column — no schema migration needed.
- Reducer extraction: consolidate the 30+ `useState` hooks in `EditorSongView.jsx` into `src/songview/state/songViewReducer.js`. Only worth it now that track state is also in there.
- **Exit criteria:** Reload preserves track config. `EditorSongView.jsx` uses one reducer.

### Phase 6 — Auth + ownership + publish flow
**Scope:** Multi-user ships.
- Google OAuth via `passport-google-oauth20` (or similar). Server: `/api/auth/google/*`. Client: `src/auth/`.
- DB migration: `users` table. `songs` gains `owner_id`, `parent_song_id`, `state`, `version`. Existing songs auto-migrated to bootstrap admin's `id` and `state='published'`.
- New tables: `publish_requests`.
- `Add song` flow: now gated on sign-in.
- `Update song`, `Edit private`, `Fork`, `Submit publish/withdrawal request`: all wired through the new `state` machine.
- Server enforces: only owners can edit; only admins can transition `pending_*` → `published`/`removed`.
- **Exit criteria:** Sign in with Google. See your drafts + the public library. Save/edit/fork/submit-for-publish all work end to end.

### Phase 7 — Admin console
**Scope:** The site-wide admin surface.
- New `admin_requests` table.
- `src/admin/AdminConsole.jsx` page (admin-only). Lists users, pending publish requests, pending admin requests.
- Approve/reject buttons → `/api/admin/*` routes.
- "Request admin" button on user profile → creates `admin_requests` row.
- **Exit criteria:** From the admin console, an admin can approve or reject any pending publish or admin request, and promote/demote users.

### Phase 8 — Deferred polish
**Scope:** Things flagged as TBD during planning. See "Known TBDs" at the bottom of this doc.

---

## 8. Out of Scope (v1)

Explicitly **not** in this PRD. Each may get its own PRD later.

- **Practice tracking per user.** The existing single-user `ExerciseRunner` feedback flow stays as-is. Per-user practice history (which songs you've practiced, scores over time, streaks) is a future product surface.
- **Public commenting / ratings on songs.** No comments, no upvotes, no reviews. Curation is by admin approval only.
- **Real-time collaboration on a song.** No multi-user editing of a single song. Editing is single-author at a time.
- **Mobile native apps.** Web only. Mobile-responsive layout is on the roadmap (see existing README §Roadmap) but a native app is out.
- **Internationalization beyond what's already in the data.** UI strings stay English. Composition lyrics/notation are in their native scripts.
- **Importing from MusicXML / external notation formats.** Sangeetham composition JSON is the only authoring format.
- **Exporting practice sessions as audio/video.** Out of scope.

---

## 9. Change Log

Append-only. New entries on top.

### 2026-04-08 — Initial PRD draft
- This document created.
- Captures decisions through the Phase 2 ship.
- Documents Phases 1 and 2 as complete.
- Documents Phases 3–8 as the forward roadmap.

### Phase 2 — Track abstraction (commit pending)
- Added `useTrackMixer` hook with central per-track state.
- Added `TrackControls` and `TrackResizeHandle` components.
- Sound Track gets visibility toggle, inline mute/solo/volume, drag-resize.
- Sahitya / Swara get visibility toggle and drag-resize only (visual-only — no controls row).
- Wheel pan centralised at the Song Track Zone `<main>` so swipes work anywhere in the zone.
- Audio mute/volume use `audio.muted`/`audio.volume` directly (not Web Audio).
- Sound Track header now matches Sahitya/Swara positioning (`top: 6, ml-4`).

### Phase 1 — Route unification + terminology (commit pending)
- `editor-song/:id` and `song-view/:id` both mount `EditorSongView`. Removed `readOnly` prop and the inline View/Edit toggle.
- Renamed all code-level "lane" vocabulary to "track". Renamed section comments to mockup terminology.
- Deleted `src/components/LaneLabel.jsx` (was an unused import).

---

## Known TBDs

These are deferred but tracked. Each will get a decision before the relevant phase ships.

- **Reject feedback delivery:** in-app inbox vs email vs both. *Phase 6.*
- **Migration ordering:** how to add `owner_id NOT NULL` to existing songs without breaking the load path. *Phase 6.*
- **Fork lineage depth:** does a fork-of-a-fork track its full ancestor chain, or just the immediate parent? *Phase 6.*
- **Rate limiting on publish requests** (anti-spam). *Phase 6.*
- **Audit log for admin actions:** who promoted whom, who approved what, when. *Phase 7.*
- **Session storage:** cookie + server session vs JWT. *Phase 6.*
