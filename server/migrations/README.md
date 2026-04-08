# `server/migrations/`

Versioned schema changes. Each migration is a numbered SQL or JS file that runs once, in order, to bring the database from one schema version to the next.

## Status

**Not yet built.** Currently the schema lives in [`server/db.js`](../db.js) as inline `CREATE TABLE` statements that run on first boot. That's fine for a single-developer single-environment app, but it doesn't survive Phase 6's `users` / `publish_requests` / `admin_requests` additions cleanly.

Phase 6 of the [roadmap](../../docs/PRD.md#7-roadmap) introduces this directory and migrates the existing schema into a `0001_initial.sql` baseline.

## Target file layout

```
migrations/
├── README.md                       ← this file
├── 0001_initial.sql                snapshot of the current schema (songs, song_versions)
├── 0002_users.sql                  Phase 6 — users table
├── 0003_song_ownership.sql         Phase 6 — songs.owner_id, parent_song_id, state, version
├── 0004_publish_requests.sql       Phase 6 — publish_requests table
└── 0005_admin_requests.sql         Phase 7 — admin_requests table
```

## Convention

- **Forward-only.** No down-migrations. Rolling back is reverting code + restoring from backup.
- **Numbered with a leading zero-padded integer.** So they sort naturally.
- **Pure SQL.** Express runs them at boot in lexical order, tracking the highest applied version in a `_migrations` table.
- **Idempotent at the boundary.** Each migration starts with `BEGIN;`, ends with `COMMIT;`. If the migration is already applied (recorded in `_migrations`), it's skipped.

## Migration runner sketch (Phase 6)

```js
// server/migrate.js (extended)
const applied = db.prepare(`SELECT version FROM _migrations`).all().map(r => r.version);
const files = fs.readdirSync(__dirname + '/migrations').filter(f => f.endsWith('.sql')).sort();
for (const file of files) {
  const version = parseInt(file.split('_')[0], 10);
  if (applied.includes(version)) continue;
  const sql = fs.readFileSync(__dirname + '/migrations/' + file, 'utf8');
  db.exec(sql);
  db.prepare(`INSERT INTO _migrations (version, applied_at) VALUES (?, ?)`).run(version, new Date().toISOString());
  console.log(`Applied migration ${file}`);
}
```

## Migrating existing data

The trickiest migration is `0003_song_ownership.sql` — it adds `owner_id NOT NULL` to a populated `songs` table. The plan ([PRD known TBDs](../../docs/PRD.md#known-tbds)) is to:

1. Hard-code the bootstrap admin's user ID in the migration.
2. `ALTER TABLE songs ADD COLUMN owner_id TEXT;`
3. `UPDATE songs SET owner_id = '<bootstrap-admin-uuid>';`
4. Add the `NOT NULL` constraint via a recreate-table dance (SQLite limitation).

That migration is part of Phase 6 and gets its own ADR if it gets complicated.
