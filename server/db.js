const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.resolve(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'sangeetha.db'));

// Enable foreign keys (required for ON DELETE CASCADE)
db.pragma('foreign_keys = ON');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS songs (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    composition TEXT,        -- JSON string of the song structure
    editOps TEXT,            -- JSON string of the edit history/ops
    swaraAudio BLOB,         -- The swara track audio data
    sahityaAudio BLOB,       -- The sahitya track audio data
    hasSwara INTEGER DEFAULT 0,
    hasSahitya INTEGER DEFAULT 0,
    swaraFilename TEXT,
    sahityaFilename TEXT,
    isPublished INTEGER DEFAULT 0,
    publishStatus TEXT DEFAULT 'draft',  -- 'draft' | 'pending' | 'published'
    raga TEXT,               -- Song raga metadata
    tala TEXT,               -- Song tala metadata
    composer TEXT,           -- Song composer metadata
    isFavorite INTEGER DEFAULT 0,
    avartanasPerRow INTEGER DEFAULT 1,
    compositionType TEXT,    -- Geetham | Swarajathi | Varnam | Kriti | Tillana | Javali | Padam | Devaranama | Sankeertana | Bhajan
    ownerId TEXT,            -- User ID of the creator
    lastModifiedBy TEXT,     -- User ID of the last editor
    createdAt TEXT,          -- ISO string
    updatedAt TEXT           -- ISO string
  )
`);

// Backfill columns on pre-existing DBs
try {
  const cols = db.prepare("PRAGMA table_info(songs)").all().map(c => c.name);
  if (!cols.includes('compositionType')) {
    db.exec('ALTER TABLE songs ADD COLUMN compositionType TEXT');
  }
  if (!cols.includes('publishStatus')) {
    db.exec("ALTER TABLE songs ADD COLUMN publishStatus TEXT DEFAULT 'draft'");
  }
  if (!cols.includes('ownerId')) {
    db.exec('ALTER TABLE songs ADD COLUMN ownerId TEXT');
  }
  if (!cols.includes('lastModifiedBy')) {
    db.exec('ALTER TABLE songs ADD COLUMN lastModifiedBy TEXT');
  }
} catch (e) {
  console.error('Failed to backfill song columns:', e.message);
}

// Users table
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,     -- Firebase UID
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    picture TEXT,
    role TEXT DEFAULT 'viewer', -- 'admin' | 'editor' | 'viewer'
    title TEXT,
    bio TEXT,
    location TEXT,
    createdAt TEXT,
    updatedAt TEXT
  )
`);

// Backfill user columns
try {
  const userCols = db.prepare("PRAGMA table_info(users)").all().map(c => c.name);
  if (!userCols.includes('title')) db.exec('ALTER TABLE users ADD COLUMN title TEXT');
  if (!userCols.includes('bio')) db.exec('ALTER TABLE users ADD COLUMN bio TEXT');
  if (!userCols.includes('location')) db.exec('ALTER TABLE users ADD COLUMN location TEXT');
} catch (e) {
  console.error('Failed to backfill user columns:', e.message);
}

// Version history table
db.exec(`
  CREATE TABLE IF NOT EXISTS versions (
    id TEXT PRIMARY KEY,
    songId TEXT NOT NULL,
    composition TEXT,
    editOps TEXT,
    label TEXT,
    timestamp TEXT,
    FOREIGN KEY (songId) REFERENCES songs(id) ON DELETE CASCADE
  )
`);

module.exports = db;
