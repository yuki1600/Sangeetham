/**
 * One-shot script: read each row's `composition` JSON, copy
 * `song_details.compositionType` into the new top-level `compositionType`
 * column, AND re-write the embedded JSON so the persisted song_details
 * stays in sync with whatever the /Songs/*.json files now contain.
 *
 * If the row's composition JSON does not yet carry compositionType (e.g. the
 * row was migrated before the classifier ran), we look up the matching
 * /Songs/<title>.json file and re-import its song_details.compositionType.
 */
const fs = require('fs');
const path = require('path');
const db = require('../server/db');

const SONGS_DIR = path.resolve(__dirname, '..', 'Songs');

// Build a title -> compositionType lookup from the JSON files on disk so we
// can repair rows that don't have it embedded yet.
const fileLookup = {};
for (const fname of fs.readdirSync(SONGS_DIR)) {
  if (!fname.endsWith('.json')) continue;
  try {
    const d = JSON.parse(fs.readFileSync(path.join(SONGS_DIR, fname), 'utf8'));
    const sd = d.song_details || {};
    const key = (sd.name || fname.replace(/\.json$/, '')).toLowerCase();
    if (sd.compositionType) fileLookup[key] = sd.compositionType;
  } catch (e) {
    console.warn(`skip ${fname}: ${e.message}`);
  }
}

const rows = db.prepare('SELECT id, title, composition FROM songs').all();
let updated = 0;
let missing = 0;

for (const row of rows) {
  let comp;
  try { comp = JSON.parse(row.composition || '{}'); }
  catch { comp = {}; }

  const sd = comp.song_details || (comp.song_details = {});
  let type = sd.compositionType;

  if (!type) {
    type = fileLookup[(row.title || '').toLowerCase()] || null;
    if (type) sd.compositionType = type;
  }

  if (!type) { missing++; continue; }

  db.prepare('UPDATE songs SET compositionType = ?, composition = ? WHERE id = ?')
    .run(type, JSON.stringify(comp), row.id);
  updated++;
}

console.log(`Updated ${updated} rows, ${missing} rows had no type to sync.`);
