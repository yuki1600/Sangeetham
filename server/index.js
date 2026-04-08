const express = require('express');
const path = require('path');
const cors = require('cors');

const songsRouter = require('./routes/songs');
const migrate = require('./migrate');

// Run migration
migrate();

const app = express();

// CORS: allow local dev origins plus any explicitly-allowed production
// origins (Firebase Hosting domains) supplied via the ALLOWED_ORIGINS env var
// as a comma-separated list. Falls back sensibly when the var is unset.
const DEFAULT_ALLOWED = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:4173',
    'https://carnatic-sangeetham.web.app',
    'https://carnatic-sangeetham.firebaseapp.com',
];
const extraAllowed = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
const allowedOrigins = [...new Set([...DEFAULT_ALLOWED, ...extraAllowed])];

app.use(cors({
    origin: (origin, cb) => {
        // Allow same-origin / curl / server-to-server (no Origin header)
        if (!origin) return cb(null, true);
        if (allowedOrigins.includes(origin)) return cb(null, true);
        return cb(new Error(`Origin ${origin} not allowed by CORS`));
    },
}));
app.use(express.json({ limit: '1mb' }));

// Lightweight health check for Render
app.get('/healthz', (_req, res) => res.json({ ok: true }));

app.use('/api/songs', songsRouter);
app.use('/api/PDFs', express.static(path.join(__dirname, '../PDFs')));


const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on :${PORT}`));
