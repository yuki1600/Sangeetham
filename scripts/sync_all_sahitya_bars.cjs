/**
 * Walk every song row in the DB, parse its embedded composition JSON, and
 * append a trailing ` ||` to any non-empty sahitya field that doesn't
 * already have one. Mirrors what scripts/add_sahitya_trailing_bar.py does
 * for the /Songs/*.json files on disk so the live DB stays in sync.
 *
 * Idempotent — entries that already end in `||` are skipped.
 */
const db = require('../server/db');

const rows = db.prepare('SELECT id, composition FROM songs').all();
let rowsChanged = 0;
let entriesChanged = 0;

const update = db.prepare('UPDATE songs SET composition = ?, updatedAt = ? WHERE id = ?');

for (const row of rows) {
    let comp;
    try { comp = JSON.parse(row.composition || '{}'); }
    catch { continue; }

    if (!Array.isArray(comp.composition)) continue;

    let dirty = false;
    for (const section of comp.composition) {
        for (const entry of (section.content || [])) {
            const sah = entry.sahitya;
            if (typeof sah !== 'string') continue;
            const trimmed = sah.trimEnd();
            if (!trimmed.trim()) continue; // empty / whitespace — leave alone
            if (trimmed.endsWith('||')) continue;
            entry.sahitya = trimmed + ' ||';
            entriesChanged++;
            dirty = true;
        }
    }

    if (dirty) {
        update.run(JSON.stringify(comp), new Date().toISOString(), row.id);
        rowsChanged++;
    }
}

console.log(`DB rows updated: ${rowsChanged}`);
console.log(`Sahitya entries updated: ${entriesChanged}`);
