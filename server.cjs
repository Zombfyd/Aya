const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// Enable pre-flight requests for all routes
app.options('*', cors());

// More permissive CORS configuration
app.use(cors({
  origin: ['https://www.ayaonsui.xyz', 'https://aya-3i9c.onrender.com'],
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Type', 'Content-Length']
}));

// Additional headers for all routes
app.use((req, res, next) => {
  // Set headers for all responses
  res.header('Access-Control-Allow-Origin', 'https://www.ayaonsui.xyz');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  
  // Handle OPTIONS requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Serve static files
app.use(express.static(path.join(__dirname, 'dist')));

// All other routes
app.get('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', 'https://www.ayaonsui.xyz');
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

module.exports = app;
