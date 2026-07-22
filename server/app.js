require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');

const { requireAuth } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const itemsRoutes = require('./routes/items');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/items', requireAuth, itemsRoutes);

// Serve the built React app when it's present alongside this file (local
// `npm start` / a single-service host like Railway). On Vercel the frontend
// is served separately as static output, so this block is a no-op there.
const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
