const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { exec } = require('child_process');
const os = require('os');

const router = express.Router();
const SONGS_DIR = path.resolve(__dirname, '../songs');

// Ensure songs directory exists
if (!fs.existsSync(SONGS_DIR)) fs.mkdirSync(SONGS_DIR, { recursive: true });

// Multer: temp storage, then we move files manually
const AUDIO_EXTS = /\.(mp3|wav|ogg|aac|m4a|flac|webm)$/i;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'audio') {
      // Accept by MIME type OR extension — browsers sometimes send application/octet-stream for mp3
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
  if (!fs.existsSync(SONGS_DIR)) return baseTitle;
  const existing = fs.readdirSync(SONGS_DIR)
    .filter(d => fs.statSync(path.join(SONGS_DIR, d)).isDirectory())
    .map(d => readJson(path.join(SONGS_DIR, d, 'meta.json'))?.title)
    .filter(Boolean);

  if (!existing.includes(baseTitle)) return baseTitle;
  let n = 1;
  while (existing.includes(`${baseTitle}_${n}`)) n++;
  return `${baseTitle}_${n}`;
}

function songDir(id) {
  return path.join(SONGS_DIR, id);
}

function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// GET /api/songs — list all songs
router.get('/', (req, res) => {
  try {
    if (!fs.existsSync(SONGS_DIR)) return res.json([]);
    const dirs = fs.readdirSync(SONGS_DIR).filter(d => {
      const s = fs.statSync(path.join(SONGS_DIR, d));
      return s.isDirectory();
    });
    const songs = dirs
      .map(id => {
        const meta = readJson(path.join(SONGS_DIR, id, 'meta.json'));
        if (!meta) return null;
        const versionsDir = path.join(SONGS_DIR, id, 'versions');
        const versionCount = fs.existsSync(versionsDir)
          ? fs.readdirSync(versionsDir).filter(f => f.endsWith('.json')).length
          : 0;
        return { ...meta, versionCount, isPublished: meta.isPublished || false };
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    res.json(songs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/songs/upload — upload audio + JSON
router.post('/upload', upload.fields([{ name: 'audio', maxCount: 1 }, { name: 'json', maxCount: 1 }]), (req, res) => {
  try {
    const audioFile = req.files?.audio?.[0];
    const jsonFile = req.files?.json?.[0];
    if (!audioFile) return res.status(400).json({ error: 'Audio file required' });
    if (!jsonFile) return res.status(400).json({ error: 'JSON file required' });

    let compositionData;
    try {
      compositionData = JSON.parse(jsonFile.buffer.toString('utf8'));
    } catch {
      return res.status(400).json({ error: 'Invalid JSON file' });
    }

    if (!compositionData.composition || !Array.isArray(compositionData.composition)) {
      return res.status(400).json({ error: 'JSON must have a composition array' });
    }

    const id = uuidv4();
    const dir = songDir(id);
    fs.mkdirSync(dir, { recursive: true });
    fs.mkdirSync(path.join(dir, 'versions'), { recursive: true });

    // Save files
    fs.writeFileSync(path.join(dir, 'audio.mp3'), audioFile.buffer);
    writeJson(path.join(dir, 'composition.json'), compositionData);
    writeJson(path.join(dir, 'editOps.json'), { trimStart: 0, trimEnd: null, cuts: [] });

    const now = new Date().toISOString();
    const song_details = compositionData.song_details || {};
    const rawTitle = song_details.title || audioFile.originalname.replace(/\.[^.]+$/, '');
    const meta = {
      id,
      title: uniqueTitle(rawTitle),
      raga: song_details.raga || '',
      tala: song_details.tala || '',
      composer: song_details.composer || '',
      audioFilename: audioFile.originalname,
      createdAt: now,
      updatedAt: now,
    };
    writeJson(path.join(dir, 'meta.json'), meta);

    res.status(201).json({ ...meta, versionCount: 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/songs/:id — get full song data
router.get('/:id', (req, res) => {
  try {
    const dir = songDir(req.params.id);
    if (!fs.existsSync(dir)) return res.status(404).json({ error: 'Song not found' });

    const meta = readJson(path.join(dir, 'meta.json'));
    const compositionData = readJson(path.join(dir, 'composition.json'));
    const editOps = readJson(path.join(dir, 'editOps.json'), { trimStart: 0, trimEnd: null, cuts: [] });

    res.json({
      meta,
      song_details: compositionData?.song_details || {},
      composition: compositionData?.composition || [],
      editOps,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/songs/:id/title — rename a song
router.patch('/:id/title', (req, res) => {
  try {
    const dir = songDir(req.params.id);
    if (!fs.existsSync(dir)) return res.status(404).json({ error: 'Song not found' });
    const { title } = req.body;
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'title is required' });
    }
    const meta = readJson(path.join(dir, 'meta.json')) || {};
    meta.title = title.trim();
    meta.updatedAt = new Date().toISOString();
    writeJson(path.join(dir, 'meta.json'), meta);
    res.json({ ok: true, title: meta.title });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/songs/:id/audio — stream original audio
router.get('/:id/audio', (req, res) => {
  const audioPath = path.resolve(songDir(req.params.id), 'audio.mp3');
  if (!fs.existsSync(audioPath)) return res.status(404).json({ error: 'Audio not found' });
  res.sendFile(audioPath); // Express handles range requests automatically
});

// POST /api/songs/:id/publish — toggle published status
router.post('/:id/publish', (req, res) => {
  try {
    const dir = songDir(req.params.id);
    if (!fs.existsSync(dir)) return res.status(404).json({ error: 'Song not found' });
    const meta = readJson(path.join(dir, 'meta.json')) || {};
    // Toggle state or explicitly set via body. For the button it's easier to toggle if no body is provided.
    meta.isPublished = req.body.isPublished !== undefined ? req.body.isPublished : !meta.isPublished;
    meta.updatedAt = new Date().toISOString();
    writeJson(path.join(dir, 'meta.json'), meta);
    res.json({ ok: true, isPublished: meta.isPublished });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/songs/:id — save composition + editOps (creates version)
router.put('/:id', (req, res) => {
  try {
    const dir = songDir(req.params.id);
    if (!fs.existsSync(dir)) return res.status(404).json({ error: 'Song not found' });

    const { composition, editOps, label = '' } = req.body;
    if (!composition) return res.status(400).json({ error: 'composition required' });

    // Save version snapshot
    const versionsDir = path.join(dir, 'versions');
    if (!fs.existsSync(versionsDir)) fs.mkdirSync(versionsDir);
    const versionId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const versionData = {
      id: versionId,
      timestamp: new Date().toISOString(),
      label,
      composition,
      editOps: editOps || { trimStart: 0, trimEnd: null, cuts: [] },
    };
    writeJson(path.join(versionsDir, `${versionId}.json`), versionData);

    // Prune old versions (keep 50)
    const versions = fs.readdirSync(versionsDir).filter(f => f.endsWith('.json')).sort();
    if (versions.length > 50) {
      versions.slice(0, versions.length - 50).forEach(f => {
        fs.unlinkSync(path.join(versionsDir, f));
      });
    }

    // Update current files
    const compositionData = readJson(path.join(dir, 'composition.json')) || {};
    compositionData.composition = composition;
    writeJson(path.join(dir, 'composition.json'), compositionData);
    writeJson(path.join(dir, 'editOps.json'), editOps || { trimStart: 0, trimEnd: null, cuts: [] });

    // Update meta
    const meta = readJson(path.join(dir, 'meta.json')) || {};
    meta.updatedAt = new Date().toISOString();
    writeJson(path.join(dir, 'meta.json'), meta);

    res.json({ ok: true, versionId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/songs/:id/versions — list versions (no composition for perf)
router.get('/:id/versions', (req, res) => {
  try {
    const versionsDir = path.join(songDir(req.params.id), 'versions');
    if (!fs.existsSync(versionsDir)) return res.json([]);
    const files = fs.readdirSync(versionsDir).filter(f => f.endsWith('.json')).sort().reverse();
    const versions = files.map(f => {
      const v = readJson(path.join(versionsDir, f));
      if (!v) return null;
      return {
        id: v.id,
        timestamp: v.timestamp,
        label: v.label || '',
        cutsCount: (v.editOps?.cuts || []).length,
        hasTrim: !!(v.editOps?.trimStart || v.editOps?.trimEnd),
      };
    }).filter(Boolean);
    res.json(versions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/songs/:id/versions/:vid — get full version data
router.get('/:id/versions/:vid', (req, res) => {
  try {
    const versionPath = path.join(songDir(req.params.id), 'versions', `${req.params.vid}.json`);
    if (!fs.existsSync(versionPath)) return res.status(404).json({ error: 'Version not found' });
    res.json(readJson(versionPath));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/songs/:id/restore/:vid — restore a version
router.post('/:id/restore/:vid', (req, res) => {
  try {
    const dir = songDir(req.params.id);
    const versionPath = path.join(dir, 'versions', `${req.params.vid}.json`);
    if (!fs.existsSync(versionPath)) return res.status(404).json({ error: 'Version not found' });

    const v = readJson(versionPath);
    const compositionData = readJson(path.join(dir, 'composition.json')) || {};
    compositionData.composition = v.composition;
    writeJson(path.join(dir, 'composition.json'), compositionData);
    writeJson(path.join(dir, 'editOps.json'), v.editOps || { trimStart: 0, trimEnd: null, cuts: [] });

    const meta = readJson(path.join(dir, 'meta.json')) || {};
    meta.updatedAt = new Date().toISOString();
    writeJson(path.join(dir, 'meta.json'), meta);

    res.json({ ok: true, composition: v.composition, editOps: v.editOps });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/songs/:id/swap-audio — replace audio file
router.post('/:id/swap-audio', upload.single('audio'), (req, res) => {
  try {
    const dir = songDir(req.params.id);
    if (!fs.existsSync(dir)) return res.status(404).json({ error: 'Song not found' });

    const audioFile = req.file;
    if (!audioFile) return res.status(400).json({ error: 'Audio file required' });

    // Backup old if exists? No, just overwrite for simplicity as requested "swap out"
    fs.writeFileSync(path.join(dir, 'audio.mp3'), audioFile.buffer);

    // Update meta
    const meta = readJson(path.join(dir, 'meta.json')) || {};
    meta.audioFilename = audioFile.originalname;
    meta.updatedAt = new Date().toISOString();
    writeJson(path.join(dir, 'meta.json'), meta);

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/songs/:id/swap-json — replace composition JSON
router.post('/:id/swap-json', upload.single('json'), (req, res) => {
  try {
    const dir = songDir(req.params.id);
    if (!fs.existsSync(dir)) return res.status(404).json({ error: 'Song not found' });

    const jsonFile = req.file;
    if (!jsonFile) return res.status(400).json({ error: 'JSON file required' });

    let compositionData;
    try {
      compositionData = JSON.parse(jsonFile.buffer.toString('utf8'));
    } catch {
      return res.status(400).json({ error: 'Invalid JSON file' });
    }

    if (!compositionData.composition || !Array.isArray(compositionData.composition)) {
      return res.status(400).json({ error: 'JSON must have a composition array' });
    }

    // Save version snapshot of current before swap? Yes, for safety.
    const versionsDir = path.join(dir, 'versions');
    if (!fs.existsSync(versionsDir)) fs.mkdirSync(versionsDir);
    const versionId = `pre-swap-${Date.now()}`;
    const currentComp = readJson(path.join(dir, 'composition.json'));
    const currentOps = readJson(path.join(dir, 'editOps.json'));
    writeJson(path.join(versionsDir, `${versionId}.json`), {
      id: versionId,
      timestamp: new Date().toISOString(),
      label: 'Before JSON swap',
      composition: currentComp?.composition || [],
      editOps: currentOps || { trimStart: 0, trimEnd: null, cuts: [] },
    });

    // Replace composition.json
    writeJson(path.join(dir, 'composition.json'), compositionData);

    // Update meta based on new JSON
    const meta = readJson(path.join(dir, 'meta.json')) || {};
    const song_details = compositionData.song_details || {};
    if (song_details.title) meta.title = song_details.title;
    if (song_details.raga) meta.raga = song_details.raga;
    if (song_details.tala) meta.tala = song_details.tala;
    if (song_details.composer) meta.composer = song_details.composer;
    meta.updatedAt = new Date().toISOString();
    writeJson(path.join(dir, 'meta.json'), meta);

    res.json({ ok: true, meta, composition: compositionData.composition });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/songs/convert-to-mp3 — convert WAV to MP3 using system ffmpeg
router.post('/convert-to-mp3', upload.single('wav'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'WAV file required' });

  const tempWav = path.join(os.tmpdir(), `sangeetha-${uuidv4()}.wav`);
  const tempMp3 = path.join(os.tmpdir(), `sangeetha-${uuidv4()}.mp3`);

  try {
    fs.writeFileSync(tempWav, req.file.buffer);

    // Run ffmpeg: -i input -codec:a libmp3lame -qscale:a 2 output
    const cmd = `ffmpeg -i "${tempWav}" -codec:a libmp3lame -qscale:a 2 "${tempMp3}"`;
    
    exec(cmd, (error, stdout, stderr) => {
      // Clean up WAV immediately
      if (fs.existsSync(tempWav)) fs.unlinkSync(tempWav);

      if (error) {
        console.error('ffmpeg error:', stderr);
        if (fs.existsSync(tempMp3)) fs.unlinkSync(tempMp3);
        return res.status(500).json({ error: 'Conversion failed' });
      }

      // Stream MP3 back and clean up
      res.download(tempMp3, 'edited.mp3', (downloadError) => {
        if (fs.existsSync(tempMp3)) fs.unlinkSync(tempMp3);
      });
    });
  } catch (err) {
    if (fs.existsSync(tempWav)) fs.unlinkSync(tempWav);
    if (fs.existsSync(tempMp3)) fs.unlinkSync(tempMp3);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/songs/:id
router.delete('/:id', (req, res) => {
  try {
    const dir = songDir(req.params.id);
    if (!fs.existsSync(dir)) return res.status(404).json({ error: 'Song not found' });
    fs.rmSync(dir, { recursive: true, force: true });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
