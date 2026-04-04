const express = require('express');
const cors = require('cors');
const songsRouter = require('./routes/songs');
const migrate = require('./migrate');

// Run migration
migrate();

const app = express();

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:4173'] }));
app.use(express.json({ limit: '1mb' }));
app.use('/api/songs', songsRouter);

const PORT = 3001;
app.listen(PORT, () => console.log(`Server running on :${PORT}`));
