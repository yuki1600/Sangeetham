const db = require('./db');
const fs = require('fs');
const path = require('path');

const SONGS_DIR = path.resolve(__dirname, 'songs');

function migrate() {
    if (!fs.existsSync(SONGS_DIR)) return;

    const dirs = fs.readdirSync(SONGS_DIR)
        .filter(d => fs.statSync(path.join(SONGS_DIR, d)).isDirectory());

    console.log(`Found ${dirs.length} songs to migrate.`);

    const insert = db.prepare(`
        INSERT OR IGNORE INTO songs (
            id, title, composition, editOps, swaraAudio, sahityaAudio, 
            hasSwara, hasSahitya, swaraFilename, sahityaFilename, 
            isPublished, createdAt, updatedAt
        ) VALUES (
            @id, @title, @composition, @editOps, @swaraAudio, @sahityaAudio, 
            @hasSwara, @hasSahitya, @swaraFilename, @sahityaFilename, 
            @isPublished, @createdAt, @updatedAt
        )
    `);

    for (const id of dirs) {
        const dir = path.join(SONGS_DIR, id);
        const metaPath = path.join(dir, 'meta.json');
        if (!fs.existsSync(metaPath)) continue;

        try {
            const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
            const compPath = path.join(dir, 'composition.json');
            const composition = fs.existsSync(compPath) ? fs.readFileSync(compPath, 'utf8') : null;
            
            // Read audio files
            const swaraAudio = fs.existsSync(path.join(dir, 'swara.mp3')) ? fs.readFileSync(path.join(dir, 'swara.mp3')) : null;
            const sahityaAudio = fs.existsSync(path.join(dir, 'sahitya.mp3')) ? fs.readFileSync(path.join(dir, 'sahitya.mp3')) : null;

            insert.run({
                id: meta.id,
                title: meta.title,
                composition: composition,
                editOps: JSON.stringify(meta.editOps || {}),
                swaraAudio: swaraAudio,
                sahityaAudio: sahityaAudio,
                hasSwara: meta.hasSwara ? 1 : 0,
                hasSahitya: meta.hasSahitya ? 1 : 0,
                swaraFilename: meta.swaraFilename || '',
                sahityaFilename: meta.sahityaFilename || '',
                isPublished: meta.isPublished ? 1 : 0,
                createdAt: meta.createdAt || new Date().toISOString(),
                updatedAt: meta.updatedAt || new Date().toISOString()
            });

            console.log(`Migrated: ${meta.title} (${id})`);
        } catch (e) {
            console.error(`Error migrating ${id}:`, e.message);
        }
    }
    console.log('Migration complete.');
}

module.exports = migrate;
