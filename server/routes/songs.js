const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { v4: uuidv4 } = require('uuid');
const { exec } = require('child_process');
const os = require('os');

const router = express.Router();

// Multer: memory storage
const AUDIO_EXTS = /\.(mp3|wav|ogg|aac|m4a|flac|webm)$/i;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'audio' || file.fieldname === 'swaraAudio' || file.fieldname === 'sahityaAudio') {
      const ok = file.mimetype.startsWith('audio/') ||
                 file.mimetype === 'application/octet-stream' ||
                 AUDIO_EXTS.test(file.originalname);
      return cb(ok ? null : new Error('Invalid audio file type'), ok);
    }
    if (file.fieldname === 'json') {
      const ok = file.mimetype === 'application/json' || file.originalname.endsWith('.json');
      return cb(ok ? null : new Error('Invalid JSON file type'), ok);
    }
    cb(new Error(`Unknown field: ${file.fieldname}`));
  }
});

/** Return a unique title by appending _1, _2, … if the base title is already taken. */
function uniqueTitle(baseTitle) {
  const existing = db.prepare('SELECT title FROM songs').all().map(s => s.title);
  if (!existing.includes(baseTitle)) return baseTitle;
  let n = 1;
  while (existing.includes(`${baseTitle}_${n}`)) n++;
  return `${baseTitle}_${n}`;
}

function getSongMeta(id) {
  const row = db.prepare('SELECT id, title, raga, tala, composer, hasSwara, hasSahitya, swaraFilename, sahityaFilename, isPublished, createdAt, updatedAt, editOps FROM songs WHERE id = ?').get(id);
  if (!row) return null;
  return {
    ...row,
    hasSwara: !!row.hasSwara,
    hasSahitya: !!row.hasSahitya,
    isPublished: !!row.isPublished,
    editOps: JSON.parse(row.editOps || '{}')
  };
}

/** List all songs metadata. */
router.get('/', (req, res) => {
  try {
    const rows = db.prepare('SELECT id, title, raga, tala, composer, hasSwara, hasSahitya, swaraFilename, sahityaFilename, isPublished, createdAt, updatedAt FROM songs ORDER BY createdAt DESC').all();
    const songs = rows.map(s => ({
      ...s,
      hasSwara: !!s.hasSwara,
      hasSahitya: !!s.hasSahitya,
      isPublished: !!s.isPublished,
      versionCount: 0 
    }));
    res.json(songs);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/** Upload raw audio + JSON details to create a new song record. */
router.post('/upload', upload.fields([
  { name: 'swaraAudio', maxCount: 1 },
  { name: 'sahityaAudio', maxCount: 1 },
  { name: 'json', maxCount: 1 }
]), (req, res) => {
  try {
    const swaraFile = req.files?.swaraAudio?.[0];
    const sahityaFile = req.files?.sahityaAudio?.[0];
    const jsonFile = req.files?.json?.[0];

    if (!swaraFile && !sahityaFile) {
        return res.status(400).json({ error: 'At least one audio file (Swara or Sahitya) is required' });
    }
    if (!jsonFile) {
        return res.status(400).json({ error: 'JSON file required' });
    }

    let compositionData;
    try {
      compositionData = JSON.parse(jsonFile.buffer.toString('utf8'));
    } catch (e) {
      return res.status(400).json({ error: 'Invalid JSON composition data' });
    }

    const { song_details = {} } = compositionData;
    const rawTitle = song_details.title || (swaraFile || sahityaFile).originalname.replace(/\.[^.]+$/, '');
    const title = uniqueTitle(rawTitle);
    const raga = song_details.raga || '';
    const tala = song_details.tala || song_details.talam || '';
    const composer = song_details.composer || '';
    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
        INSERT INTO songs (
            id, title, raga, tala, composer, composition, editOps, swaraAudio, sahityaAudio, 
            hasSwara, hasSahitya, swaraFilename, sahityaFilename, 
            isPublished, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    `).run(
        id, title, raga, tala, composer, JSON.stringify(compositionData), JSON.stringify({ trimStart: 0, trimEnd: null, cuts: [] }),
        swaraFile ? swaraFile.buffer : null, sahityaFile ? sahityaFile.buffer : null,
        swaraFile ? 1 : 0, sahityaFile ? 1 : 0,
        swaraFile ? swaraFile.originalname : '', sahityaFile ? sahityaFile.originalname : '',
        now, now
    );

    res.status(201).json(getSongMeta(id));
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

/** Get full song data. */
router.get('/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT id, title, raga, tala, composer, composition, editOps, hasSwara, hasSahitya, swaraFilename, sahityaFilename, isPublished, createdAt, updatedAt FROM songs WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Song not found' });

    const compositionData = JSON.parse(row.composition || '{}');
    const editOps = JSON.parse(row.editOps || '{"trimStart":0,"trimEnd":null,"cuts":[]}');

    res.json({
      meta: {
        id: row.id,
        title: row.title,
        raga: row.raga,
        tala: row.tala,
        composer: row.composer,
        hasSwara: !!row.hasSwara,
        hasSahitya: !!row.hasSahitya,
        swaraFilename: row.swaraFilename,
        sahityaFilename: row.sahityaFilename,
        isPublished: !!row.isPublished,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt
      },
      song_details: compositionData.song_details || {},
      composition: compositionData.composition || [],
      editOps
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Stream audio BLOB. */
router.get('/:id/audio', (req, res) => {
  const { type } = req.query; 
  const col = type === 'sahitya' ? 'sahityaAudio' : 'swaraAudio';
  const row = db.prepare(`SELECT ${col} FROM songs WHERE id = ?`).get(req.params.id);
  
  if (!row || !row[col]) {
    return res.status(404).send('Audio not found');
  }

  res.setHeader('Content-Type', 'audio/mpeg');
  res.send(row[col]);
});

/** Save composition + editOps. */
router.put('/:id', (req, res) => {
  try {
    const { composition, editOps } = req.body;
    if (!composition) return res.status(400).json({ error: 'composition required' });

    const now = new Date().toISOString();
    const song = db.prepare('SELECT composition FROM songs WHERE id = ?').get(req.params.id);
    if (!song) return res.status(404).json({ error: 'Song not found' });

    const compositionData = JSON.parse(song.composition || '{}');
    compositionData.composition = composition;
    
    // Check if details were mutated in editor somehow, update DB columns if they change
    const songDetails = compositionData.song_details || {};
    const raga = songDetails.raga || '';
    const tala = songDetails.tala || songDetails.talam || '';
    const composer = songDetails.composer || '';

    db.prepare('UPDATE songs SET composition = ?, editOps = ?, raga = ?, tala = ?, composer = ?, updatedAt = ? WHERE id = ?')
      .run(JSON.stringify(compositionData), JSON.stringify(editOps || {}), raga, tala, composer, now, req.params.id);

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Rename a song. */
router.patch('/:id/title', (req, res) => {
  try {
    const { title } = req.body;
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'title is required' });
    }
    const newTitle = title.trim();
    const now = new Date().toISOString();
    const result = db.prepare('UPDATE songs SET title = ?, updatedAt = ? WHERE id = ?').run(newTitle, now, req.params.id);
    
    if (result.changes === 0) return res.status(404).json({ error: 'Song not found' });
    res.json({ ok: true, title: newTitle });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Toggle published status. */
router.post('/:id/publish', (req, res) => {
  try {
    const { isPublished } = req.body;
    const now = new Date().toISOString();
    
    const song = db.prepare('SELECT isPublished FROM songs WHERE id = ?').get(req.params.id);
    if (!song) return res.status(404).json({ error: 'Song not found' });

    const nextState = isPublished !== undefined ? (isPublished ? 1 : 0) : (song.isPublished ? 0 : 1);
    db.prepare('UPDATE songs SET isPublished = ?, updatedAt = ? WHERE id = ?').run(nextState, now, req.params.id);
    
    res.json({ ok: true, isPublished: !!nextState });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Swap specific audio track. */
router.post('/:id/swap-audio', upload.single('audio'), (req, res) => {
  try {
    const { type = 'swara' } = req.query;
    const audioFile = req.file;
    if (!audioFile) return res.status(400).json({ error: 'Audio file required' });

    const col = type === 'sahitya' ? 'sahityaAudio' : 'swaraAudio';
    const hasCol = type === 'sahitya' ? 'hasSahitya' : 'hasSwara';
    const nameCol = type === 'sahitya' ? 'sahityaFilename' : 'swaraFilename';
    const now = new Date().toISOString();

    const result = db.prepare(`UPDATE songs SET ${col} = ?, ${hasCol} = 1, ${nameCol} = ?, updatedAt = ? WHERE id = ?`)
      .run(audioFile.buffer, audioFile.originalname, now, req.params.id);

    if (result.changes === 0) return res.status(404).json({ error: 'Song not found' });
    res.json({ ok: true, meta: getSongMeta(req.params.id) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Swap composition JSON. */
router.post('/:id/swap-json', upload.single('json'), (req, res) => {
  try {
    const jsonFile = req.file;
    if (!jsonFile) return res.status(400).json({ error: 'JSON file required' });

    let compositionData;
    try {
      compositionData = JSON.parse(jsonFile.buffer.toString('utf8'));
    } catch (e) {
      return res.status(400).json({ error: 'Invalid JSON composition data' });
    }

    const { song_details = {} } = compositionData;
    const raga = song_details.raga || '';
    const tala = song_details.tala || song_details.talam || '';
    const composer = song_details.composer || '';
    const title = song_details.title || 'Untitled';
    const now = new Date().toISOString();

    const result = db.prepare(`UPDATE songs SET composition = ?, title = ?, raga = ?, tala = ?, composer = ?, updatedAt = ? WHERE id = ?`)
      .run(JSON.stringify(compositionData), title, raga, tala, composer, now, req.params.id);

    if (result.changes === 0) return res.status(404).json({ error: 'Song not found' });
    res.json({ ok: true, meta: getSongMeta(req.params.id) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** System tool: Convert WAV to MP3 using ffmpeg. */
router.post('/convert-to-mp3', upload.single('wav'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'WAV file required' });
  const tempWav = path.join(os.tmpdir(), `sangeetha-${uuidv4()}.wav`);
  const tempMp3 = path.join(os.tmpdir(), `sangeetha-${uuidv4()}.mp3`);
  try {
    fs.writeFileSync(tempWav, req.file.buffer);
    const cmd = `ffmpeg -i "${tempWav}" -codec:a libmp3lame -qscale:a 2 "${tempMp3}"`;
    exec(cmd, (error, stdout, stderr) => {
      if (fs.existsSync(tempWav)) fs.unlinkSync(tempWav);
      if (error) {
        if (fs.existsSync(tempMp3)) fs.unlinkSync(tempMp3);
        return res.status(500).json({ error: 'Conversion failed' });
      }
      res.download(tempMp3, 'edited.mp3', () => {
        if (fs.existsSync(tempMp3)) fs.unlinkSync(tempMp3);
      });
    });
  } catch (err) {
    if (fs.existsSync(tempWav)) fs.unlinkSync(tempWav);
    if (fs.existsSync(tempMp3)) fs.unlinkSync(tempMp3);
    res.status(500).json({ error: err.message });
  }
});

/** Delete a song. */
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM songs WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Song not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
