const db = require('./db');

console.log('Running metadata migration...');

try {
  db.exec('ALTER TABLE songs ADD COLUMN raga TEXT');
  console.log('Added raga column.');
} catch (e) {
  console.log('Column raga might already exist:', e.message);
}

try {
  db.exec('ALTER TABLE songs ADD COLUMN tala TEXT');
  console.log('Added tala column.');
} catch (e) {
  console.log('Column tala might already exist:', e.message);
}

try {
  db.exec('ALTER TABLE songs ADD COLUMN composer TEXT');
  console.log('Added composer column.');
} catch (e) {
  console.log('Column composer might already exist:', e.message);
}

const rows = db.prepare('SELECT id, composition FROM songs').all();
const stmt = db.prepare('UPDATE songs SET raga = ?, tala = ?, composer = ? WHERE id = ?');

let count = 0;
for (const row of rows) {
  try {
    const data = JSON.parse(row.composition || '{}');
    const details = data.song_details || {};
    
    const raga = details.raga || '';
    const tala = details.tala || details.talam || '';
    const composer = details.composer || '';
    
    stmt.run(raga, tala, composer, row.id);
    count++;
  } catch (e) {
    console.error(`Error migrating row ${row.id}:`, e.message);
  }
}

console.log(`Successfully migrated metadata for ${count} songs.`);
