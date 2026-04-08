/**
 * DB-side mirror of normalize_sahitya_case.py — title-case every sahitya
 * field embedded inside the songs.composition JSON column.
 *
 * For every whitespace-separated token, the first alphabetic character is
 * uppercased and all other alphabetic characters are lowercased. Non-letter
 * characters and whitespace are preserved.
 *
 * Idempotent.
 */
const db = require('../server/db');

function titleCaseToken(tok) {
    let seenAlpha = false;
    let out = '';
    for (const ch of tok) {
        if (/\p{L}/u.test(ch)) {
            if (!seenAlpha) {
                out += ch.toUpperCase();
                seenAlpha = true;
            } else {
                out += ch.toLowerCase();
            }
        } else {
            out += ch;
        }
    }
    return out;
}

function normalizeSahitya(s) {
    return s.replace(/\S+/g, titleCaseToken);
}

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
            if (typeof sah !== 'string' || !sah.trim()) continue;
            const next = normalizeSahitya(sah);
            if (next !== sah) {
                entry.sahitya = next;
                entriesChanged++;
                dirty = true;
            }
        }
    }

    if (dirty) {
        update.run(JSON.stringify(comp), new Date().toISOString(), row.id);
        rowsChanged++;
    }
}

console.log(`DB rows updated: ${rowsChanged}`);
console.log(`Sahitya entries updated: ${entriesChanged}`);
