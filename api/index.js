// Vercel serverless entry point. Vercel's Node runtime can invoke an Express
// app directly (it behaves like a (req, res) handler) as long as it never
// calls .listen() — that's exactly what server/app.js exports.
module.exports = require('../server/app');
