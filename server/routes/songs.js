const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { v4: uuidv4 } = require('uuid');
const { exec } = require('child_process');
const os = require('os');

const router = express.Router();

// ── Tala templates (mirrored from client) ────────────────────────────────────
const TALA_TEMPLATES = {
  "Adi": "_ _ _ _ | _ _ | _ _ ||",
  "Rupakam": "_ _ | _ _ _ _ ||",
  "Deshadi": "_ _ _ _ ||",
  "Madhyadi": "_ _ _ _ ||",
  "Khanda Chapu": "_ _ | _ | _ _ ||",
  "Misra Chapu": "_ _ _ | _ _ | _ _ ||",
  "Dhruva Talam": "_ _ _ _ | _ _ | _ _ _ _ | _ _ _ _ ||",
  "Dhruva": "_ _ _ _ | _ _ | _ _ _ _ | _ _ _ _ ||",
  "Tisra Dhruva": "_ _ _ | _ _ | _ _ _ | _ _ _ ||",
  "Chatusra Dhruva": "_ _ _ _ | _ _ | _ _ _ _ | _ _ _ _ ||",
  "Khanda Dhruva": "_ _ _ _ _ | _ _ | _ _ _ _ _ | _ _ _ _ _ ||",
  "Misra Dhruva": "_ _ _ _ _ _ _ | _ _ | _ _ _ _ _ _ _ | _ _ _ _ _ _ _ ||",
  "Sankeerna Dhruva": "_ _ _ _ _ _ _ _ _ | _ _ | _ _ _ _ _ _ _ _ _ | _ _ _ _ _ _ _ _ _ ||",
  "Matya Talam": "_ _ _ _ | _ _ | _ _ _ _ ||",
  "Matya": "_ _ _ _ | _ _ | _ _ _ _ ||",
  "Tisra Matya": "_ _ _ | _ _ | _ _ _ ||",
  "Chatusra Matya": "_ _ _ _ | _ _ | _ _ _ _ ||",
  "Khanda Matya": "_ _ _ _ _ | _ _ | _ _ _ _ _ ||",
  "Misra Matya": "_ _ _ _ _ _ _ | _ _ | _ _ _ _ _ _ _ ||",
  "Sankeerna Matya": "_ _ _ _ _ _ _ _ _ | _ _ | _ _ _ _ _ _ _ _ _ ||",
  "Rupaka Talam": "_ _ | _ _ _ _ ||",
  "Rupaka": "_ _ | _ _ _ _ ||",
  "Tisra Rupaka": "_ _ | _ _ _ ||",
  "Chatusra Rupaka": "_ _ | _ _ _ _ ||",
  "Khanda Rupaka": "_ _ | _ _ _ _ _ ||",
  "Misra Rupaka": "_ _ | _ _ _ _ _ _ _ ||",
  "Sankeerna Rupaka": "_ _ | _ _ _ _ _ _ _ _ _ ||",
  "Jhampa Talam": "_ _ _ _ _ _ _ | _ | _ _ ||",
  "Jhampa": "_ _ _ _ _ _ _ | _ | _ _ ||",
  "Tisra Jhampa": "_ _ _ | _ | _ _ ||",
  "Chatusra Jhampa": "_ _ _ _ | _ | _ _ ||",
  "Khanda Jhampa": "_ _ _ _ _ | _ | _ _ ||",
  "Misra Jhampa": "_ _ _ _ _ _ _ | _ | _ _ ||",
  "Sankeerna Jhampa": "_ _ _ _ _ _ _ _ _ | _ | _ _ ||",
  "Triputa Talam": "_ _ _ | _ _ | _ _ ||",
  "Triputa": "_ _ _ | _ _ | _ _ ||",
  "Tisra Triputa": "_ _ _ | _ _ | _ _ ||",
  "Chatusra Triputa": "_ _ _ _ | _ _ | _ _ ||",
  "Khanda Triputa": "_ _ _ _ _ | _ _ | _ _ ||",
  "Misra Triputa": "_ _ _ _ _ _ _ | _ _ | _ _ ||",
  "Sankeerna Triputa": "_ _ _ _ _ _ _ _ _ | _ _ | _ _ ||",
  "Ata Talam": "_ _ _ _ _ | _ _ _ _ _ | _ _ | _ _ ||",
  "Ata": "_ _ _ _ _ | _ _ _ _ _ | _ _ | _ _ ||",
  "Tisra Ata": "_ _ _ | _ _ _ | _ _ | _ _ ||",
  "Chatusra Ata": "_ _ _ _ | _ _ _ _ | _ _ | _ _ ||",
  "Khanda Ata": "_ _ _ _ _ | _ _ _ _ _ | _ _ | _ _ ||",
  "Misra Ata": "_ _ _ _ _ _ _ | _ _ _ _ _ _ _ | _ _ | _ _ ||",
  "Sankeerna Ata": "_ _ _ _ _ _ _ _ _ | _ _ _ _ _ _ _ _ _ | _ _ | _ _ ||",
  "Eka Talam": "_ _ _ _ ||",
  "Eka": "_ _ _ _ ||",
  "Tisra Eka": "_ _ _ ||",
  "Chatusra Eka": "_ _ _ _ ||",
  "Khanda Eka": "_ _ _ _ _ ||",
  "Misra Eka": "_ _ _ _ _ _ _ ||",
  "Sankeerna Eka": "_ _ _ _ _ _ _ _ _ ||"
};

/**
 * Parse a tala template into a bar pattern.
 * e.g. "_ _ _ _ | _ _ | _ _ ||" → [{ count: 4, bar: '|' }, { count: 2, bar: '|' }, { count: 2, bar: '||' }]
 */
function parseTalaPattern(template) {
  const segments = [];
  let count = 0;
  for (const tok of template.split(/\s+/)) {
    if (tok === '_') count++;
    else if (tok === '||') { segments.push({ count, bar: '||' }); count = 0; }
    else if (tok === '|') { segments.push({ count, bar: '|' }); count = 0; }
  }
  if (count > 0) segments.push({ count, bar: '||' });
  return segments;
}

/**
 * Retemplate a swaram or sahityam string to match a new tala pattern.
 * Strips existing bar markers, then inserts new ones at the right positions.
 */
function retemplateNotation(str, pattern) {
  if (!str || !str.trim()) return str;
  // Extract only notes (skip | and ||)
  const notes = str.split(/\s+/).filter(t => t !== '|' && t !== '||' && t.length > 0);
  if (notes.length === 0) return str;

  const beatsPerAav = pattern.reduce((sum, seg) => sum + seg.count, 0);
  const parts = [];
  let idx = 0;

  while (idx < notes.length) {
    const aavParts = [];
    for (const seg of pattern) {
      const segNotes = [];
      for (let i = 0; i < seg.count; i++) {
        segNotes.push(idx < notes.length ? notes[idx++] : '_');
      }
      aavParts.push(segNotes.join(' ') + ' ' + seg.bar);
    }
    parts.push(aavParts.join(' '));
  }
  return parts.join(' ');
}

/**
 * Retemplate an entire composition array to match a new tala.
 * Each content entry's swaram/sahityam gets its bars redistributed.
 */
function retemplateComposition(composition, newTala) {
  const template = TALA_TEMPLATES[newTala];
  if (!template) return composition; // unknown tala, leave as-is
  const pattern = parseTalaPattern(template);

  return composition.map(section => ({
    ...section,
    content: section.content.map(entry => ({
      ...entry,
      swaram: retemplateNotation(entry.swaram, pattern),
      sahityam: entry.sahityam ? retemplateNotation(entry.sahityam, pattern) : entry.sahityam
    }))
  }));
}

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
    const rows = db.prepare('SELECT id, title, raga, tala, composer, composition, hasSwara, hasSahitya, swaraFilename, sahityaFilename, isPublished, createdAt, updatedAt FROM songs ORDER BY createdAt DESC').all();
    const songs = rows.map(s => {
      const comp = JSON.parse(s.composition || '{}');
      const sd = comp.song_details || {};
      const { composition: _, ...rest } = s;
      return {
        ...rest,
        hasSwara: !!s.hasSwara,
        hasSahitya: !!s.hasSahitya,
        isPublished: !!s.isPublished,
        arohana: sd.arohana || null,
        avarohana: sd.avarohana || null,
        versionCount: 0
      };
    });
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
    // Form fields override JSON values
    const raga = (req.body.raga || song_details.raga || '').trim();
    const tala = (req.body.tala || song_details.tala || song_details.talam || '').trim();
    const composer = (req.body.composer || song_details.composer || '').trim();

    // Sync back into composition data
    if (raga) song_details.raga = raga;
    if (tala) song_details.tala = tala;
    compositionData.song_details = song_details;

    const title = (req.body.title || '').trim() || song_details.title || (swaraFile || sahityaFile).originalname.replace(/\.[^.]+$/, '');

    // Reject if a song with the same title, raga and tala already exists
    const dup = db.prepare(
      'SELECT id FROM songs WHERE LOWER(title) = LOWER(?) AND LOWER(raga) = LOWER(?) AND LOWER(tala) = LOWER(?)'
    ).get(title, raga, tala);
    if (dup) {
      return res.status(409).json({ error: `A song titled "${title}" with raga "${raga}" and tala "${tala}" already exists. Please pick a different name.` });
    }
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

/** Save composition + editOps (creates a version snapshot). */
router.put('/:id', (req, res) => {
  try {
    const { composition, editOps } = req.body;
    if (!composition) return res.status(400).json({ error: 'composition required' });

    const now = new Date().toISOString();
    const song = db.prepare('SELECT composition FROM songs WHERE id = ?').get(req.params.id);
    if (!song) return res.status(404).json({ error: 'Song not found' });

    const compositionData = JSON.parse(song.composition || '{}');
    compositionData.composition = composition;

    const songDetails = compositionData.song_details || {};
    const raga = songDetails.raga || '';
    const tala = songDetails.tala || songDetails.talam || '';
    const composer = songDetails.composer || '';

    db.prepare('UPDATE songs SET composition = ?, editOps = ?, raga = ?, tala = ?, composer = ?, updatedAt = ? WHERE id = ?')
      .run(JSON.stringify(compositionData), JSON.stringify(editOps || {}), raga, tala, composer, now, req.params.id);

    // Create version snapshot
    const versionId = uuidv4();
    const ops = editOps || {};
    const cutsCount = (ops.cuts || []).length;
    const hasTrim = (ops.trimStart > 0) || (ops.trimEnd !== null && ops.trimEnd !== undefined);
    db.prepare('INSERT INTO versions (id, songId, composition, editOps, label, timestamp) VALUES (?, ?, ?, ?, ?, ?)')
      .run(versionId, req.params.id, JSON.stringify(composition), JSON.stringify(ops), null, now);

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** List version history for a song. */
router.get('/:id/versions', (req, res) => {
  try {
    const rows = db.prepare('SELECT id, label, timestamp, editOps FROM versions WHERE songId = ? ORDER BY timestamp DESC').all(req.params.id);
    const versions = rows.map(v => {
      const ops = JSON.parse(v.editOps || '{}');
      return {
        id: v.id,
        label: v.label,
        timestamp: v.timestamp,
        cutsCount: (ops.cuts || []).length,
        hasTrim: (ops.trimStart > 0) || (ops.trimEnd !== null && ops.trimEnd !== undefined),
      };
    });
    res.json(versions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Get a specific version's full data. */
router.get('/:id/versions/:vid', (req, res) => {
  try {
    const v = db.prepare('SELECT composition, editOps FROM versions WHERE id = ? AND songId = ?').get(req.params.vid, req.params.id);
    if (!v) return res.status(404).json({ error: 'Version not found' });
    res.json({
      composition: JSON.parse(v.composition || '[]'),
      editOps: JSON.parse(v.editOps || '{}'),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Restore a version (makes it the current state + creates a new version). */
router.post('/:id/restore/:vid', (req, res) => {
  try {
    const v = db.prepare('SELECT composition, editOps FROM versions WHERE id = ? AND songId = ?').get(req.params.vid, req.params.id);
    if (!v) return res.status(404).json({ error: 'Version not found' });

    const composition = JSON.parse(v.composition || '[]');
    const editOps = JSON.parse(v.editOps || '{}');
    const now = new Date().toISOString();

    const song = db.prepare('SELECT composition AS comp FROM songs WHERE id = ?').get(req.params.id);
    if (!song) return res.status(404).json({ error: 'Song not found' });

    const compositionData = JSON.parse(song.comp || '{}');
    compositionData.composition = composition;

    db.prepare('UPDATE songs SET composition = ?, editOps = ?, updatedAt = ? WHERE id = ?')
      .run(JSON.stringify(compositionData), JSON.stringify(editOps), now, req.params.id);

    // Create a new version for the restore
    db.prepare('INSERT INTO versions (id, songId, composition, editOps, label, timestamp) VALUES (?, ?, ?, ?, ?, ?)')
      .run(uuidv4(), req.params.id, JSON.stringify(composition), JSON.stringify(editOps), 'Restored', now);

    res.json({ composition, editOps });
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

/** Update song metadata (raga, tala, composer). */
router.patch('/:id/metadata', (req, res) => {
  try {
    const { raga, tala, composer, arohana, avarohana } = req.body;
    if (!raga || !raga.trim()) return res.status(400).json({ error: 'Ragam is required' });
    if (!tala || !tala.trim()) return res.status(400).json({ error: 'Talam is required' });

    const song = db.prepare('SELECT composition, tala AS oldTala FROM songs WHERE id = ?').get(req.params.id);
    if (!song) return res.status(404).json({ error: 'Song not found' });

    const compositionData = JSON.parse(song.composition || '{}');
    if (!compositionData.song_details) compositionData.song_details = {};

    // Detect if composition needs retemplating:
    // Compare the requested tala's full bar structure (beat count + bar positions)
    // against what's actually in the first aavartana of the composition
    const newTemplate = TALA_TEMPLATES[tala.trim()];
    let talaChanged = false;
    if (newTemplate && compositionData.composition && compositionData.composition.length > 0) {
      const firstSwaram = compositionData.composition[0].content?.[0]?.swaram || '';
      // Extract the bar structure of the first aavartana: sequence of note-counts between bars
      const firstAav = firstSwaram.split('||')[0] || '';
      const existingSegments = firstAav.split('|').map(seg =>
        seg.split(/\s+/).filter(t => t.length > 0).length
      );
      const newPattern = parseTalaPattern(newTemplate);
      const newSegments = newPattern.map(seg => seg.count);
      // Compare segment-by-segment (catches both beat count and bar position differences)
      talaChanged = existingSegments.length !== newSegments.length ||
        existingSegments.some((count, i) => count !== newSegments[i]);
    }
    if (talaChanged && compositionData.composition) {
      compositionData.composition = retemplateComposition(compositionData.composition, tala.trim());
    }

    compositionData.song_details.raga = raga.trim();
    compositionData.song_details.tala = tala.trim();
    if (composer !== undefined) compositionData.song_details.composer = (composer || '').trim();
    if (arohana !== undefined) compositionData.song_details.arohana = arohana;
    if (avarohana !== undefined) compositionData.song_details.avarohana = avarohana;

    const now = new Date().toISOString();
    db.prepare('UPDATE songs SET raga = ?, tala = ?, composer = ?, composition = ?, updatedAt = ? WHERE id = ?')
      .run(raga.trim(), tala.trim(), (composer || '').trim(), JSON.stringify(compositionData), now, req.params.id);

    res.json({
      ok: true,
      raga: raga.trim(),
      tala: tala.trim(),
      composer: (composer || '').trim(),
      talaChanged,
      composition: talaChanged ? compositionData.composition : undefined
    });
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
