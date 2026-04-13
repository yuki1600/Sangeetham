import admin from 'firebase-admin';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- 1. Provider Detection ---
const isCloud = process.env.NODE_ENV === 'production' || process.env.USE_FIREBASE === 'true';

let firestore = null;
let bucket = null;
let sqlite = null;

if (isCloud) {
    console.log("🌥 Using Cloud Storage (Firestore + Firebase Storage)");
    // Initialize Firebase Admin if not already
    if (!admin.apps.length) {
        const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || path.join(__dirname, '../service-account.json');
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            storageBucket: 'carnatic-sangeetham.firebasestorage.app'
        });
    }
    firestore = admin.firestore();
    bucket = admin.storage().bucket();
} else {
    console.log("🏠 Using Local Storage (SQLite)");
    const sqlitePath = path.join(__dirname, '../data/sangeetha.db');
    if (!fs.existsSync(path.dirname(sqlitePath))) fs.mkdirSync(path.dirname(sqlitePath), { recursive: true });
    sqlite = new Database(sqlitePath);
    // Note: Schema sync/setup should be handled in a separate migrate file or on startup
}

// --- 2. Song Operations ---
export const songs = {
    async list(role) {
        if (isCloud) {
            let query = firestore.collection('songs');
            if (role !== 'admin' && role !== 'editor') {
                query = query.where('publishStatus', '==', 'published');
            }
            const snap = await query.orderBy('createdAt', 'desc').get();
            return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } else {
            let sql = 'SELECT * FROM songs';
            if (role !== 'admin' && role !== 'editor') {
                // Return songs that are either marked as published (new system) or have isPublished=1 (old system)
                sql += " WHERE (publishStatus = 'published' OR isPublished = 1)";
            }
            sql += ' ORDER BY createdAt DESC';
            return sqlite.prepare(sql).all();
        }
    },

    async get(id) {
        if (isCloud) {
            const doc = await firestore.collection('songs').doc(id).get();
            return doc.exists ? { id: doc.id, ...doc.data() } : null;
        } else {
            return sqlite.prepare('SELECT * FROM songs WHERE id = ?').get(id);
        }
    },

    async upsert(id, data) {
        if (isCloud) {
            await firestore.collection('songs').doc(id).set(data, { merge: true });
        } else {
            const cols = Object.keys(data);
            const vals = Object.values(data);
            const placeholders = cols.map(() => '?').join(', ');
            const updates = cols.map(c => `${c} = ?`).join(', ');
            
            // Try insert, then update
            try {
                sqlite.prepare(`INSERT INTO songs (${cols.join(', ')}) VALUES (${placeholders})`).run(...vals);
            } catch (e) {
                sqlite.prepare(`UPDATE songs SET ${updates} WHERE id = ?`).run(...vals, id);
            }
        }
    },

    async delete(id) {
        if (isCloud) {
            await firestore.collection('songs').doc(id).delete();
            // Also cleanup audio files in storage
            await bucket.deleteFiles({ prefix: `audio/${id}/` });
        } else {
            sqlite.prepare('DELETE FROM songs WHERE id = ?').run(id);
        }
    }
};

// --- 3. User Operations ---
export const users = {
    async get(id) {
        if (isCloud) {
            const doc = await firestore.collection('users').doc(id).get();
            return doc.exists ? doc.data() : null;
        } else {
            return sqlite.prepare('SELECT * FROM users WHERE id = ?').get(id);
        }
    },

    async getByEmail(email) {
        if (isCloud) {
            const snap = await firestore.collection('users').where('email', '==', email).limit(1).get();
            return !snap.empty ? snap.docs[0].data() : null;
        } else {
            return sqlite.prepare('SELECT * FROM users WHERE email = ?').get(email);
        }
    },

    async upsert(id, data) {
        if (isCloud) {
            await firestore.collection('users').doc(id).set(data, { merge: true });
        } else {
            const cols = Object.keys(data);
            const vals = Object.values(data);
            const updates = cols.map(c => `${c} = ?`).join(', ');
            try {
                sqlite.prepare(`INSERT INTO users (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`).run(...vals);
            } catch (e) {
                sqlite.prepare(`UPDATE users SET ${updates} WHERE id = ?`).run(...vals, id);
            }
        }
    },

    async count() {
        if (isCloud) {
            const snap = await firestore.collection('users').count().get();
            return snap.data().count;
        } else {
            return sqlite.prepare('SELECT COUNT(*) as count FROM users').get().count;
        }
    }
};

// --- 4. Audio Storage ---
export const storage = {
    async uploadAudio(songId, type, buffer, originalName) {
        if (isCloud) {
            const filename = type === 'swara' ? 'swara.mp3' : 'sahitya.mp3';
            const file = bucket.file(`audio/${songId}/${filename}`);
            await file.save(buffer, { contentType: 'audio/mpeg' });
            return await file.getSignedUrl({ action: 'read', expires: '03-09-2491' });
        } else {
            // In local mode, we still use the SQLite BLOB (or we could save to disk, but sticking to existing logic)
            const col = type === 'swara' ? 'swaraAudio' : 'sahityaAudio';
            const nameCol = type === 'swara' ? 'swaraFilename' : 'sahityaFilename';
            const hasCol = type === 'swara' ? 'hasSwara' : 'hasSahitya';
            sqlite.prepare(`UPDATE songs SET ${col} = ?, ${nameCol} = ?, ${hasCol} = 1 WHERE id = ?`).run(buffer, originalName, songId);
            return null;
        }
    },

    async getAudio(songId, type) {
        if (isCloud) {
            const filename = type === 'swara' ? 'swara.mp3' : 'sahitya.mp3';
            const file = bucket.file(`audio/${songId}/${filename}`);
            const [exists] = await file.exists();
            if (!exists) return null;
            return file.createReadStream();
        } else {
            const col = type === 'swara' ? 'swaraAudio' : 'sahityaAudio';
            const row = sqlite.prepare(`SELECT ${col} FROM songs WHERE id = ?`).get(songId);
            return row ? row[col] : null;
        }
    }
};

// --- 5. Version History ---
export const versions = {
    async list(songId) {
        if (isCloud) {
            const snap = await firestore.collection('songs').doc(songId).collection('versions').orderBy('timestamp', 'desc').get();
            return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } else {
            return sqlite.prepare('SELECT * FROM versions WHERE songId = ? ORDER BY timestamp DESC').all(songId);
        }
    },

    async get(songId, versionId) {
        if (isCloud) {
            const doc = await firestore.collection('songs').doc(songId).collection('versions').doc(versionId).get();
            return doc.exists ? doc.data() : null;
        } else {
            return sqlite.prepare('SELECT * FROM versions WHERE id = ? AND songId = ?').get(versionId, songId);
        }
    },

    async add(songId, versionData) {
        if (isCloud) {
            await firestore.collection('songs').doc(songId).collection('versions').doc(versionData.id).set(versionData);
        } else {
            sqlite.prepare('INSERT INTO versions (id, songId, composition, editOps, label, timestamp) VALUES (?, ?, ?, ?, ?, ?)')
                .run(versionData.id, songId, versionData.composition, versionData.editOps, versionData.label, versionData.timestamp);
        }
    }
};
