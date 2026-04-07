/**
 * Re-import a single /Songs/<title>.json file into the live DB row that
 * matches its title. Replaces the row's `composition` JSON wholesale and
 * updates raga / tala / composer / compositionType.
 *
 * Usage: node scripts/sync_one_song.cjs "Mate Malaya Dvaja"
 */
const fs = require('fs');
const path = require('path');
const db = require('../server/db');

const title = process.argv[2];
if (!title) {
    console.error('Usage: node scripts/sync_one_song.cjs "<title>"');
    process.exit(2);
}

const filePath = path.resolve(__dirname, '..', 'Songs', `${title}.json`);
if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
}

const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
const sd = data.song_details || {};
const row = db.prepare('SELECT id FROM songs WHERE LOWER(title) = LOWER(?)').get(title);
if (!row) {
    console.error(`No DB row found for title "${title}"`);
    process.exit(1);
}

const now = new Date().toISOString();
db.prepare(`
    UPDATE songs SET
        composition = ?,
        raga = ?,
        tala = ?,
        composer = ?,
        compositionType = ?,
        updatedAt = ?
    WHERE id = ?
`).run(
    JSON.stringify(data),
    sd.raga || '',
    sd.tala || '',
    sd.composer || '',
    sd.compositionType || null,
    now,
    row.id
);
console.log(`Synced "${title}" (id=${row.id}).`);
