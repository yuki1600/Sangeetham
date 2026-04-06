const db = require('./db');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const SONGS_DIR = path.resolve(__dirname, '..', 'Songs');

function migrate() {
    if (!fs.existsSync(SONGS_DIR)) {
        console.warn(`Songs directory not found at ${SONGS_DIR}`);
        return;
    }

    const files = fs.readdirSync(SONGS_DIR)
        .filter(f => f.endsWith('.json'));

    console.log(`Found ${files.length} songs to migrate.`);

    const insert = db.prepare(`
        INSERT OR IGNORE INTO songs (
            id, title, composition, editOps, 
            hasSwara, hasSahitya, isPublished, 
            raga, tala, composer,
            createdAt, updatedAt
        ) VALUES (
            ?, ?, ?, ?, 
            0, 0, 1, 
            ?, ?, ?,
            ?, ?
        )
    `);

    for (const fileName of files) {
        const filePath = path.join(SONGS_DIR, fileName);

        try {
            const rawData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            const { song_details = {}, sections = {} } = rawData;
            
            const title = song_details.name || fileName.replace(/\.json$/, '');
            const raga = song_details.raga || '';
            const tala = song_details.tala || '';
            const composer = song_details.composer || '';

            // Transform sections to the database composition format
            const composition = [];
            
            // Sections might be an object { pallavi: [...], anupallavi: [...] }
            // Or an array if it was already in the new format.
            if (Array.isArray(sections)) {
                composition.push(...sections);
            } else {
                for (const [sectionName, entries] of Object.entries(sections)) {
                    if (!Array.isArray(entries)) continue;
                    
                    composition.push({
                        name: sectionName.charAt(0).toUpperCase() + sectionName.slice(1),
                        content: entries.map(e => ({
                            swaram: e.swara || '',
                            sahityam: e.sahitya || ''
                        }))
                    });
                }
            }

            // Sync raga/tala/composer back into song_details if they are missing
            if (!song_details.raga) song_details.raga = raga;
            if (!song_details.tala) song_details.tala = tala;
            if (!song_details.composer) song_details.composer = composer;

            // The composition field in the database should contain the WHOLE structure if needed,
            // but the app usually stores { song_details, composition: [...] }
            const fullCompositionData = {
                song_details,
                composition
            };

            // Check if song with this name/raga/tala already exists to avoid duplicates
            const exists = db.prepare('SELECT id FROM songs WHERE title = ? AND raga = ? AND tala = ?').get(title, raga, tala);
            if (exists) {
                continue;
            }

            const id = uuidv4();
            const now = new Date().toISOString();

            insert.run(
                id,
                title,
                JSON.stringify(fullCompositionData),
                JSON.stringify({ trimStart: 0, trimEnd: null, cuts: [] }),
                raga,
                tala,
                composer,
                now,
                now
            );

            console.log(`Migrated: ${title} (${id})`);
        } catch (e) {
            console.error(`Error migrating ${fileName}:`, e.message);
        }
    }
    console.log('Migration complete.');
}

module.exports = migrate;
