import admin from 'firebase-admin';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 1. Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, '../server/service-account.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.error("❌ Service account key not found at", serviceAccountPath);
  process.exit(1);
}
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

// We'll try the legacy .appspot.com one first as the newer .firebasestorage.app returned 404 earlier
const bucketName = `${serviceAccount.project_id}.appspot.com`;

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: bucketName
});

const db = admin.firestore();
const storage = admin.storage();
const bucket = storage.bucket();

console.log(`📡 Initialized with bucket: ${bucketName}`);

// 2. Open Local SQLite
const sqlitePath = path.join(__dirname, '../server/data/sangeetha.db');
if (!fs.existsSync(sqlitePath)) {
  console.error("❌ SQLite database not found at", sqlitePath);
  process.exit(1);
}
const localDb = new Database(sqlitePath);

async function migrate() {
  console.log(`🚀 Starting migration from SQLite to Firebase (Bucket: ${bucketName})...`);

  // --- Migrate Users ---
  try {
    console.log("👤 Migrating users...");
    const users = localDb.prepare('SELECT * FROM users').all();
    for (const user of users) {
      await db.collection('users').doc(user.id).set({
        ...user,
        updatedAt: user.updatedAt || new Date().toISOString()
      }, { merge: true });
    }
    console.log(` ✅ Migrated ${users.length} users.`);
  } catch (e) {
    console.warn("⚠️ Users migration failed:", e.message);
  }

  // --- Migrate Songs ---
  console.log("🎵 Migrating songs and audio...");
  const songs = localDb.prepare('SELECT * FROM songs').all();
  let successCount = 0;
  let audioFailures = 0;

  for (const song of songs) {
    const songId = song.id;
    const songData = { ...song };

    // Handle Audio Uploads
    const uploadAudio = async (blob, suffix) => {
        if (!blob) return null;
        try {
            const fileName = `audio/${songId}/${suffix}.mp3`;
            const file = storage.bucket().file(fileName);
            await file.save(blob, { contentType: 'audio/mpeg' });
            return `https://firebasestorage.googleapis.com/v0/b/${storage.bucket().name}/o/${encodeURIComponent(fileName)}?alt=media`;
        } catch (e) {
          console.error(`  ❌ Failed to upload ${suffix} audio for: ${song.title} (${e.message})`);
          audioFailures++;
          return null;
        }
    };

    if (song.swaraAudio) {
        const url = await uploadAudio(song.swaraAudio, 'swara');
        if (url) songData.swaraUrl = url;
    }
    if (song.sahityaAudio) {
        const url = await uploadAudio(song.sahityaAudio, 'sahitya');
        if (url) songData.sahityaUrl = url;
    }

    // Clean up fields for Firestore
    delete songData.swaraAudio;
    delete songData.sahityaAudio;
    
    // Normalize booleans for Firestore
    songData.isPublished = !!song.isPublished;
    songData.isFavorite = !!song.isFavorite;

    try {
        await db.collection('songs').doc(songId).set({
          ...songData,
          composition: JSON.parse(song.composition || '{}'),
          editOps: JSON.parse(song.editOps || '{}'),
          updatedAt: song.updatedAt || new Date().toISOString()
        }, { merge: true });

        // --- Migrate Versions ---
        const versions = localDb.prepare('SELECT * FROM versions WHERE songId = ?').all(songId);
        for (const version of versions) {
            await db.collection('songs').doc(songId).collection('versions').doc(version.id).set({
                ...version,
                composition: JSON.parse(version.composition || '{}'),
                editOps: JSON.parse(version.editOps || '{}')
            }, { merge: true });
        }
        successCount++;
        if (successCount % 50 === 0) console.log(` ...processed ${successCount} songs`);
    } catch (e) {
        console.error(` ❌ Failed to migrate metadata for: ${song.title} (${e.message})`);
    }
  }

  console.log(`✨ Migration finished!`);
  console.log(`   - Songs Migrated: ${successCount}`);
  console.log(`   - Audio Failures: ${audioFailures}`);
  process.exit(0);
}

migrate().catch(err => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
