require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');

const { requireAuth } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const itemsRoutes = require('./routes/items');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/items', requireAuth, itemsRoutes);

// Serve the built React app when it exists (single-service deploy, e.g. Railway).
const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Dashboard server listening on port ${PORT}`);
});
