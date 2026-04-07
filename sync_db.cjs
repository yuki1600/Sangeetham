const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.resolve(__dirname, 'server', 'data', 'sangeetha.db');
const SONGS_DIR = path.resolve(__dirname, 'Songs');

const db = new Database(DB_PATH);

// Get all songs from the database
const songs = db.prepare('SELECT id, title, raga, tala, composition FROM songs').all();

console.log(`Found ${songs.length} songs in the database.`);

let updated = 0;
let skipped = 0;
let errors = 0;

for (const song of songs) {
    try {
        // Find matching JSON file by title
        const jsonPath = path.join(SONGS_DIR, `${song.title}.json`);
        
        if (!fs.existsSync(jsonPath)) {
            console.log(`  SKIP: No JSON file for "${song.title}"`);
            skipped++;
            continue;
        }

        // Read the updated JSON file
        const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        const newComposition = jsonData.composition || [];

        // Read existing DB composition blob and update the composition array inside it
        const dbCompositionData = JSON.parse(song.composition || '{}');
        dbCompositionData.composition = newComposition;

        // Write back to database
        const now = new Date().toISOString();
        db.prepare('UPDATE songs SET composition = ?, updatedAt = ? WHERE id = ?')
            .run(JSON.stringify(dbCompositionData), now, song.id);

        updated++;
    } catch (e) {
        console.error(`  ERROR: ${song.title}: ${e.message}`);
        errors++;
    }
}

console.log(`\nDatabase sync complete.`);
console.log(`  Updated: ${updated}`);
console.log(`  Skipped: ${skipped}`);
console.log(`  Errors:  ${errors}`);

db.close();
