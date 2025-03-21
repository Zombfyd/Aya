const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');
const crypto = require('crypto');

const app = express();
const DATABASE_URL = 'https://ayagame.onrender.com';
// Get the secret from environment variables, with a fallback for development
const SCORE_SUBMISSION_SECRET = process.env.SCORE_SUBMISSION_SECRET || 'dev_secret_do_not_use_in_production';

// Enable pre-flight requests for all routes
app.options('*', cors());

// More permissive CORS configuration
app.use(cors({
  origin: [
    'https://www.ayaonsui.xyz', 
    'https://aya-3i9c.onrender.com', 
    'https://www.tears-of-aya.webflow.io',
    'https://aya-1.onrender.com',
    'https://aya-test-server.onrender.com',
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
    'https://aya-test-server.onrender.com',
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

// Security verification helpers
const verifyTimestamp = (timestamp) => {
  const currentTime = Date.now();
  const fiveMinutesInMs = 5 * 60 * 1000;
  return Math.abs(currentTime - timestamp) <= fiveMinutesInMs;
};

const generateWeb2Signature = (playerName, score, timestamp, game) => {
  const data = `${playerName}:${score}:${timestamp}:${game}`;
  return crypto.createHmac('sha256', SCORE_SUBMISSION_SECRET)
    .update(data)
    .digest('hex');
};

const generateWeb3Signature = (playerName, playerWallet, score, timestamp, type, mode, game) => {
  const data = `${playerName}:${playerWallet}:${score}:${timestamp}:${type}:${mode}:${game}`;
  return crypto.createHmac('sha256', SCORE_SUBMISSION_SECRET)
    .update(data)
    .digest('hex');
};

// Proxy endpoints to the database server with enhanced security
app.post('/api/web2/scores', async (req, res) => {
  try {
    const { playerName, score, game, timestamp } = req.body;
    
    // Input validation
    if (!playerName || typeof playerName !== 'string' || playerName.length > 25) {
      return res.status(400).json({ error: 'Invalid player name' });
    }
    
    if (!score || typeof score !== 'number' || score <= 0 || score >= 1000000) {
      return res.status(400).json({ error: 'Invalid score' });
    }
    
    if (!game || !['TOA', 'TOB'].includes(game)) {
      return res.status(400).json({ error: 'Invalid game type' });
    }
    
    if (!timestamp || !verifyTimestamp(timestamp)) {
      return res.status(400).json({ error: 'Invalid or expired timestamp' });
    }
    
    // Generate signature server-side
    const signature = generateWeb2Signature(playerName, score, timestamp, game);
    
    // Forward to database server with the generated signature
    const response = await fetch(`${DATABASE_URL}/api/web2/scores`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        playerName,
        score,
        game,
        timestamp,
        signature
      })
    });
    
    if (!response.ok) throw new Error(`Database error: ${response.status}`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Score submission error:', error);
    res.status(500).json({ error: 'Failed to submit score' });
  }
});

// Handle web3 score submission
app.post('/api/scores/:mode', async (req, res) => {
  try {
    const { mode } = req.params;
    const { playerName, playerWallet, score, type, game, timestamp, paymentVerification } = req.body;
    
    console.log('Received score submission:', {
      mode,
      playerName,
      playerWallet: playerWallet ? playerWallet.substring(0, 10) + '...' : undefined, // Log truncated wallet for privacy
      score,
      type,
      game,
      hasPaymentVerification: !!paymentVerification,
      timestamp
    });
    
    // Input validation
    if (!playerName || typeof playerName !== 'string' || playerName.length > 25) {
      return res.status(400).json({ error: 'Invalid player name' });
    }
    
    if (!playerWallet || typeof playerWallet !== 'string') {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }
    
    if (!score || typeof score !== 'number' || score <= 0 || score >= 1000000) {
      return res.status(400).json({ error: 'Invalid score' });
    }
    
    if (!type || !['main', 'secondary'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type' });
    }
    
    if (!mode || !['free', 'paid'].includes(mode)) {
      return res.status(400).json({ error: 'Invalid mode' });
    }
    
    if (!game || !['TOA', 'TOB'].includes(game)) {
      return res.status(400).json({ error: 'Invalid game type' });
    }
    
    if (!timestamp || !verifyTimestamp(timestamp)) {
      return res.status(400).json({ error: 'Invalid or expired timestamp' });
    }
    
    // Extra validation for paid mode
    if (mode === 'paid' && (!paymentVerification || !paymentVerification.transactionId)) {
      return res.status(400).json({ error: 'Payment verification required for paid mode' });
    }
    
    // Generate signature server-side
    const signature = generateWeb3Signature(playerName, playerWallet, score, timestamp, type, mode, game);
    console.log('Generated signature for submission');
    
    // Create the request body for the database
    const requestBody = {
      playerName,
      playerWallet,
      score,
      type,
      game,
      timestamp,
      signature,
      paymentVerification
    };
    
    // Forward to database server with the generated signature
    console.log(`Forwarding to database at: ${DATABASE_URL}/api/scores/${mode}`);
    
    try {
      const response = await fetch(`${DATABASE_URL}/api/scores/${mode}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Database error response:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        throw new Error(`Database error: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Score submission successful');
      res.json(data);
    } catch (fetchError) {
      console.error('Fetch error when calling database:', fetchError);
      throw fetchError;
    }
  } catch (error) {
    console.error('Web3 score submission error:', error);
    res.status(500).json({ error: 'Failed to submit score', details: error.message });
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
    const game = req.query.game || 'TOA';
    const response = await fetchWithRetry(`${DATABASE_URL}/api/web2/leaderboard?game=${game}`);
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
    const game = req.query.game || 'TOA';
    const response = await fetch(
      `${DATABASE_URL}/api/scores/leaderboard/${gameType}/${mode}?game=${game}`
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
