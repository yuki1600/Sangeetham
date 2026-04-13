const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const admin = require('firebase-admin');
const fs = require('fs');

// Initialize Firebase Admin
try {
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || path.join(__dirname, 'service-account.json');
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase Admin initialized from file');
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase Admin initialized from env');
  } else {
    console.warn('Firebase Admin NOT initialized. Please provide FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_SERVICE_ACCOUNT.');
    // Initialize with dummy for local dev if needed, or handle errors in middleware
  }
} catch (error) {
  console.error('Firebase Admin initialization failed:', error.message);
}

const songsRouter = require('./routes/songs');
const authRouter = require('./routes/auth');
const migrate = require('./migrate');
const { authenticateUser } = require('./middleware/auth');

// Run migration
migrate();

const app = express();

// CORS: allow local dev origins plus any explicitly-allowed production
// origins (Firebase Hosting domains) supplied via the ALLOWED_ORIGINS env var
// as a comma-separated list. Falls back sensibly when the var is unset.
const DEFAULT_ALLOWED = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:5176',
    'http://localhost:5177',
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
        
        // Allow any localhost port from 5173 to 5180 for development
        const isLocalDev = /^http:\/\/localhost:517[3-9]$|^http:\/\/localhost:5180$/.test(origin);
        if (isLocalDev || allowedOrigins.includes(origin)) {
            return cb(null, true);
        }
        
        return cb(new Error(`Origin ${origin} not allowed by CORS`));
    },
}));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(authenticateUser); // Global identity middleware

// Lightweight health check for Render
app.get('/healthz', (_req, res) => res.json({ ok: true }));

app.use('/api/songs', songsRouter);
app.use('/api/auth', authRouter);
app.use('/api/PDFs', express.static(path.join(__dirname, '../PDFs')));


const PORT = process.env.PORT || 3001;

function startServer(port) {
    const server = app.listen(port, () => {
        console.log(`Server running on :${port}`);
    }).on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`Port ${port} is busy, trying ${port + 1}...`);
            startServer(port + 1);
        } else {
            console.error('Server error:', err);
        }
    });
}

startServer(Number(PORT));
