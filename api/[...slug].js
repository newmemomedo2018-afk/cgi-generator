// Vercel serverless function that handles all API routes
// This delegates all /api/* requests to our Express app

import handler from '../dist/index.js';

export default async function(req, res) {
  // Log the request for debugging
  console.log(`[Vercel Function] ${req.method} ${req.url}`);
  
  // Ensure the request path starts with /api for our Express app
  if (!req.url.startsWith('/api')) {
    req.url = '/api' + req.url;
  }
  
  // Set proper headers for API responses
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  try {
    return await handler(req, res);
  } catch (error) {
    console.error(`[Vercel Function] Error:`, error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}