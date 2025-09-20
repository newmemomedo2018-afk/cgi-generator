// Vercel Serverless Function Handler
const handler = require('../dist/index.js');

// Export for Vercel
module.exports = handler.default || handler;