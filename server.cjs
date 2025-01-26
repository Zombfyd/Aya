const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// Set CORS headers for all routes including static files
app.use((req, res, next) => {
  res.set({
    'Access-Control-Allow-Origin': 'https://www.ayaonsui.xyz',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Credentials': 'true',
    'Cross-Origin-Resource-Policy': 'cross-origin'
  });

  // Handle OPTIONS requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  next();
});

// Serve static files with explicit CORS headers
app.use(express.static(path.join(__dirname, 'dist'), {
  setHeaders: (res, path) => {
    // Set headers specifically for JavaScript files
    if (path.endsWith('.js')) {
      res.set({
        'Access-Control-Allow-Origin': 'https://www.ayaonsui.xyz',
        'Content-Type': 'application/javascript',
        'Cross-Origin-Resource-Policy': 'cross-origin'
      });
    }
  }
}));

// Handle all routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

module.exports = app;
