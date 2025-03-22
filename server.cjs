const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');
const crypto = require('crypto');

const app = express();
const DATABASE_URL = 'https://ayagame.onrender.com';
// Use the same secret as specified in the .env.dev.testnet file
const SCORE_SUBMISSION_SECRET = process.env.SCORE_SUBMISSION_SECRET || 'c84f7b9c3a6e8d052f6c1e9b4a7d0e3f2c1b5a9d8e7f6c3b2a1d0e9f8c7b6a5d4';
// Get skip score submission setting from env variables with default to false
const SKIP_SCORE_SUBMIT = process.env.SKIP_SCORE_SUBMIT === 'true' || process.env.VITE_APP_SKIP_SCORE_SUBMIT === 'true';

// Log environment settings for debugging
console.log('Environment settings:', {
  DATABASE_URL,
  SKIP_SCORE_SUBMIT,
  NODE_ENV: process.env.NODE_ENV,
  VITE_APP_ENVIRONMENT: process.env.VITE_APP_ENVIRONMENT
});

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
  // When SKIP_SCORE_SUBMIT is true, bypass all verification
  if (SKIP_SCORE_SUBMIT) {
    console.log(`SKIP_SCORE_SUBMIT is true, bypassing timestamp verification.`);
    return true;
  }

  const currentTime = Date.now();
  // 15 seconds window as per documentation
  const fifteenSecondsInMs = 15 * 1000;
  
  // Check if timestamp is within valid time window
  const timeDiff = Math.abs(currentTime - timestamp);
  const isValid = timeDiff <= fifteenSecondsInMs;
  
  if (!isValid) {
    console.log(`Timestamp ${timestamp} is outside the 15-second window.`);
    console.log(`Current time: ${currentTime}, time difference: ${timeDiff}ms`);
    console.log(`Valid timestamp window: ${new Date(currentTime - fifteenSecondsInMs).toISOString()} to ${new Date(currentTime + fifteenSecondsInMs).toISOString()}`);
  }
  
  return isValid;
};

// Verify that the submission occurred at the required time
const verifySubmissionTime = (requiredTime, actualTime) => {
  // When skipping database submission, bypass all verification
  if (SKIP_SCORE_SUBMIT) {
    console.log(`SKIP_SCORE_SUBMIT is true, bypassing submission time verification.`);
    return true;
  }

  // Use a reasonable tolerance per documentation
  const tolerance = 250; // 250ms tolerance as mentioned in BackEndREADME.md
  const timeDiff = Math.abs(actualTime - requiredTime);
  
  console.log(`Submission time verification: requiredTime=${requiredTime}, actualTime=${actualTime}, diff=${timeDiff}ms, tolerance=${tolerance}ms`);
  console.log(`Result: ${timeDiff <= tolerance ? 'PASSED' : 'FAILED'}`);
  
  return timeDiff <= tolerance;
};

// Generate timestamp - simply current time
const generateTimestamp = () => {
  const now = Date.now();
  console.log(`Generated timestamp: ${now} (${new Date(now).toISOString()})`);
  return now;
};

// Generate a submission time in near future
const generateSubmissionTime = () => {
  const now = Date.now();
  // Set submission time 3 seconds in the future to allow client to prepare
  const submissionTime = now + 3000;
  
  console.log(`Generated submission time: ${submissionTime} (${new Date(submissionTime).toISOString()})`);
  console.log(`Current time: ${now} (${new Date(now).toISOString()})`);
  console.log(`Time until submission: ${submissionTime - now}ms`);
  
  return submissionTime;
};

const generateWeb2Signature = (playerName, score, timestamp, game) => {
  const data = `${playerName}:${score}:${timestamp}:${game}`;
  console.log('Generating Web2 signature for data:', data);
  console.log('Using secret:', SCORE_SUBMISSION_SECRET.substring(0, 8) + '...');
  const signature = crypto.createHmac('sha256', SCORE_SUBMISSION_SECRET)
    .update(data)
    .digest('hex');
  console.log('Generated signature:', signature);
  return signature;
};

const generateWeb3Signature = (playerName, playerWallet, score, timestamp, type, mode, game) => {
  // Format exactly matches what the backend expects for Web3 scores
  const data = `${playerName}:${playerWallet}:${score}:${timestamp}:${type}:${mode}:${game}`;
  console.log('Generating Web3 signature for data:', data);
  console.log('Using secret:', SCORE_SUBMISSION_SECRET.substring(0, 8) + '...');
  const signature = crypto.createHmac('sha256', SCORE_SUBMISSION_SECRET)
    .update(data)
    .digest('hex');
  console.log('Generated signature:', signature);
  return signature;
};

// Proxy endpoints to the database server with enhanced security
app.post('/api/web2/scores', async (req, res) => {
  try {
    const { playerName, score, game, timestamp, signature, submissionTime } = req.body;
    const requestReceivedTime = Date.now(); // Record when we received this request
    
    console.log('Received Web2 score submission:', {
      playerName,
      score,
      game,
      timestamp,
      submissionTime,
      requestReceivedTime,
      timeDiff: Math.abs(submissionTime - requestReceivedTime)
    });
    
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
    
    if (!timestamp) {
      return res.status(400).json({ error: 'Missing timestamp' });
    }
    
    // Verify timestamp is within 15-second window
    if (!verifyTimestamp(timestamp)) {
      console.log(`Timestamp verification failed: ${timestamp}, current time: ${Date.now()}, diff: ${Math.abs(timestamp - Date.now())}ms`);
      return res.status(400).json({ error: 'Invalid or expired timestamp' });
    }
    
    // Verify the submissionTime parameter against the requestReceivedTime
    if (!submissionTime) {
      return res.status(400).json({ error: 'Missing submission time' });
    }
    
    if (!verifySubmissionTime(submissionTime, requestReceivedTime)) {
      console.log(`Submission time verification failed: required=${submissionTime}, actual=${requestReceivedTime}, diff=${Math.abs(submissionTime - requestReceivedTime)}ms`);
      return res.status(400).json({ error: 'Invalid submission time or submission not made at required time' });
    }
    
    // Generate signature server-side for comparison
    const serverSignature = generateWeb2Signature(playerName, score, timestamp, game);
    
    // Verify signature matches
    if (signature !== serverSignature) {
      console.log(`Signature mismatch: expected=${serverSignature}, received=${signature}`);
      return res.status(403).json({ error: 'Invalid signature' });
    }
    
    // Skip database submission if configured
    if (SKIP_SCORE_SUBMIT) {
      console.log('Score submission skipped due to SKIP_SCORE_SUBMIT=true');
      return res.json({ 
        message: 'Score submission successful (database skipped)', 
        score: {
          id: crypto.randomUUID(),
          playerName,
          score,
          game,
          timestamp,
          createdAt: new Date().toISOString()
        }
      });
    }
    
    // Forward to database server with the generated signature
    console.log('Forwarding to database at:', `${DATABASE_URL}/api/web2/scores`);
    
    // Include all required fields including the submissionTime
    const requestBody = {
      playerName,
      score,
      game,
      timestamp,
      signature: serverSignature,
      submissionTime  // Include submissionTime in the request to the database
    };
    
    console.log('With data:', requestBody);
    
    try {
      const response = await fetch(`${DATABASE_URL}/api/web2/scores`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Database error response: ${response.status} - ${errorText}`);
        throw new Error(`Database error: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Successfully submitted score to database:', data);
      res.json(data);
    } catch (error) {
      console.error('Database fetch error:', error);
      throw error;
    }
  } catch (error) {
    console.error('Score submission error:', error);
    res.status(500).json({ error: 'Failed to submit score', details: error.message });
  }
});

// Handle web3 score submission
app.post('/api/scores/:mode', async (req, res) => {
  try {
    const { mode } = req.params;
    const { playerName, playerWallet, score, type, game, timestamp, signature, submissionTime } = req.body;
    const requestReceivedTime = Date.now(); // Record when we received this request
    
    console.log('Received Web3 score submission:', {
      mode,
      playerName,
      playerWallet: playerWallet ? playerWallet.substring(0, 10) + '...' : undefined, // Log truncated wallet for privacy
      score,
      type,
      game,
      timestamp,
      submissionTime,
      requestReceivedTime
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
      return res.status(400).json({ error: 'Invalid score type' });
    }
    
    if (!game || !['TOA', 'TOB'].includes(game)) {
      return res.status(400).json({ error: 'Invalid game type' });
    }
    
    if (!timestamp) {
      return res.status(400).json({ error: 'Missing timestamp' });
    }
    
    // Verify timestamp is within 15-second window
    if (!verifyTimestamp(timestamp)) {
      console.log(`Timestamp verification failed: ${timestamp}, current time: ${Date.now()}, diff: ${Math.abs(timestamp - Date.now())}ms`);
      return res.status(400).json({ error: 'Invalid or expired timestamp' });
    }
    
    if (!submissionTime) {
      return res.status(400).json({ error: 'Missing submission time' });
    }
    
    // Verify the submissionTime parameter against the requestReceivedTime
    if (!verifySubmissionTime(submissionTime, requestReceivedTime)) {
      console.log(`Submission time verification failed: required=${submissionTime}, actual=${requestReceivedTime}, diff=${Math.abs(submissionTime - requestReceivedTime)}ms`);
      return res.status(400).json({ error: 'Invalid submission time or submission not made at required time' });
    }
    
    // Skip score submission if configured
    if (SKIP_SCORE_SUBMIT) {
      console.log('Score submission skipped due to SKIP_SCORE_SUBMIT=true');
      return res.json({ 
        message: 'Score submission successful (database skipped)',
        id: crypto.randomUUID(),
        playerName,
        playerWallet,
        score,
        gameType: type,
        gameMode: mode,
        game,
        verified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    
    // Generate signature server-side for comparison
    const serverSignature = generateWeb3Signature(playerName, playerWallet, score, timestamp, type, mode, game);
    console.log('Generated signature for submission');
    
    // Verify signature matches
    if (signature !== serverSignature) {
      console.log(`Signature mismatch: expected=${serverSignature}, received=${signature}`);
      return res.status(403).json({ error: 'Invalid signature' });
    }
    
    // Create request body with the exact same fields and order as the backend expects
    const requestBody = {
      playerName,
      playerWallet,
      score,
      type,
      game,
      timestamp,
      signature: serverSignature, // Use our generated signature
      submissionTime  // Include submissionTime in the request to the database
    };
    
    // Log the request we're about to make
    console.log('Forwarding to database at:', `${DATABASE_URL}/api/scores/${mode}`);
    console.log('With data:', requestBody);
    
    // Forward to database server
    const response = await fetch(`${DATABASE_URL}/api/scores/${mode}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    // Handle database error responses
    if (!response.ok) {
      const errorText = await response.text();
      console.log('Database error response:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      throw new Error(`Database error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Web3 score submission error:', error);
    res.status(500).json({ 
      error: 'Failed to submit score', 
      details: error.message
    });
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

// Score signature endpoint for two-step score submission
app.post('/api/auth/score-signature', async (req, res) => {
  try {
    console.log('Received score signature request:', req.body);
    
    // Get current time for all timing calculations
    const now = Date.now();
    
    // Create timestamp - this is what client will submit with their score
    const timestamp = generateTimestamp();
    
    // Calculate submission time - when we expect the client to submit
    const submissionTime = generateSubmissionTime();
    
    // Calculate expiration time - 15 seconds from now as per documentation
    const expiresAt = now + 15 * 1000;
    
    console.log(`Timing information:`);
    console.log(`Current time: ${now} (${new Date(now).toISOString()})`);
    console.log(`Timestamp: ${timestamp} (${new Date(timestamp).toISOString()})`);
    console.log(`Submission time: ${submissionTime} (${new Date(submissionTime).toISOString()})`);
    console.log(`Expires at: ${expiresAt} (${new Date(expiresAt).toISOString()})`);
    console.log(`Time until expiration: ${expiresAt - now}ms`);
    console.log(`Time until submission: ${submissionTime - now}ms`);
    
    let signature;
    
    if (req.body.playerWallet) {
      // Web3 request
      const { playerName, playerWallet, score, type, mode, game } = req.body;
      
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
      
      // Generate signature
      signature = generateWeb3Signature(playerName, playerWallet, score, timestamp, type, mode, game);
    } else {
      // Web2 request
      const { playerName, score, game } = req.body;
      
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
      
      // Generate signature
      signature = generateWeb2Signature(playerName, score, timestamp, game);
    }
    
    // Return signature, timestamp, expiration, and the required submission time
    // Match the format specified in the documentation
    res.json({
      signature,
      timestamp,
      expiresAt,
      submissionTime,
      serverTime: now
    });
  } catch (error) {
    console.error('Error generating score signature:', error);
    res.status(500).json({ error: 'Failed to generate score signature' });
  }
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
