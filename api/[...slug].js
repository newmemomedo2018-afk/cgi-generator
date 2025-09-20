// Vercel serverless function that handles all API routes
// This delegates all /api/* requests to our Express app

import handler from '../dist/index.js';

export default async function(req, res) {
  // Ensure the request path starts with /api for our Express app
  if (!req.url.startsWith('/api')) {
    req.url = '/api' + req.url;
  }
  
  return handler(req, res);
}