const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');

const app = express();
const DATABASE_URL = 'https://ayagame.onrender.com';

// Enable pre-flight requests for all routes
app.options('*', cors());

// More permissive CORS configuration
app.use(cors({
  origin: [
    'https://www.ayaonsui.xyz', 
    'https://aya-3i9c.onrender.com', 
    'https://www.tears-of-aya.webflow.io',
    'https://aya-1.onrender.com',
    'https://www.tears-of-aya.com',
    'http://localhost:6969'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Type', 'Content-Length']
}));

// Parse JSON bodies
app.use(express.json());

// Serve static files from the dist directory
app.use(express.static('dist'));

// Additional headers for all routes
app.use((req, res, next) => {
  const allowedOrigins = [
    'https://www.ayaonsui.xyz',
    'https://aya-3i9c.onrender.com',
    'https://www.tears-of-aya.webflow.io',
    'https://aya-1.onrender.com',
    'https://www.tears-of-aya.com',
    'http://localhost:6969'
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
  }

  res.set({
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Credentials': 'true',
    'Cross-Origin-Resource-Policy': 'cross-origin'
  });
  next();
});

// Proxy endpoints to the database server
app.post('/api/web2/scores', async (req, res) => {
  try {
    const response = await fetch(`${DATABASE_URL}/api/web2/scores`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(req.body)
    });
    
    if (!response.ok) throw new Error(`Database error: ${response.status}`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Score submission error:', error);
    res.status(500).json({ error: 'Failed to submit score' });
  }
});

// Add retry logic for database requests
const fetchWithRetry = async (url, options = {}, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
      
      if (response.status === 502) {
        console.error(`Attempt ${i + 1}: Database server unavailable`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        continue;
      }
      
      throw new Error(`HTTP error! status: ${response.status}`);
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  throw new Error('Max retries reached');
};

// Update the endpoints to use retry logic
app.get('/api/web2/leaderboard', async (req, res) => {
  try {
    const response = await fetchWithRetry(`${DATABASE_URL}/api/web2/leaderboard`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Leaderboard fetch error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch leaderboard',
      details: error.message 
    });
  }
});

// Proxy Web3 endpoints
app.get('/api/scores/leaderboard/:gameType/:mode', async (req, res) => {
  try {
    const { gameType, mode } = req.params;
    const response = await fetch(
      `${DATABASE_URL}/api/scores/leaderboard/${gameType}/${mode}`
    );
    if (!response.ok) throw new Error(`Database error: ${response.status}`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Web3 leaderboard fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch Web3 leaderboard' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error', 
    message: err.message 
  });
});

// All other routes - serve the index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const port = process.env.PORT || 6969;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

module.exports = app;
