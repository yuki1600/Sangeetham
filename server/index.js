const express = require('express');
const path = require('path');
const cors = require('cors');

const songsRouter = require('./routes/songs');
const migrate = require('./migrate');

// Run migration
migrate();

const app = express();

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:4173'] }));
app.use(express.json({ limit: '1mb' }));
app.use('/api/songs', songsRouter);
app.use('/api/PDFs', express.static(path.join(__dirname, '../PDFs')));


const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on :${PORT}`));
