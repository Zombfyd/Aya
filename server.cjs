const handler = require('serve-handler');
const http = require('http');
const path = require('path');
const cors = require('cors');

const corsHeaders = {
 'Access-Control-Allow-Origin': 'https://www.ayaonsui.xyz',
 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
 'Access-Control-Allow-Headers': 'Content-Type',
 'Access-Control-Allow-Credentials': 'true'
};

const server = http.createServer((request, response) => {
 // Handle preflight OPTIONS requests
 if (request.method === 'OPTIONS') {
   response.writeHead(204, corsHeaders);
   response.end();
   return;
 }

 // Add CORS headers to all responses
 Object.entries(corsHeaders).forEach(([key, value]) => {
   response.setHeader(key, value);
 });

 return handler(request, response, {
   public: path.join(__dirname, 'dist'),
   rewrites: [
     { source: '/**', destination: '/index.html' }
   ],
   headers: [
     {
       source: '**',
       headers: [{
         key: 'Cache-Control',
         value: 'public, max-age=0, must-revalidate'
       }]
     }
   ]
 });
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
 console.log(`Server running on port ${port}`);
});
