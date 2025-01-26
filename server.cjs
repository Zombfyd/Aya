const express = require('express');
const cors = require('cors');
const path = require('path');


const app = express();

// CORS configuration
app.use(cors({
 origin: 'https://www.ayaonsui.xyz',
 methods: ['GET', 'POST', 'OPTIONS'],
 allowedHeaders: ['Content-Type'],
 credentials: true
}));

// Serve static files from dist
app.use(express.static(path.join(__dirname, 'dist')));

// Additional headers
app.use((req, res, next) => {
 res.header('Cross-Origin-Resource-Policy', 'cross-origin');
 res.header('Access-Control-Allow-Origin', 'https://www.ayaonsui.xyz');
 res.header('Access-Control-Allow-Credentials', 'true');
 next();
});

// Handle all routes
app.get('*', (req, res) => {
 res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
 console.log(`Server running on port ${port}`);
});

module.exports = app;
