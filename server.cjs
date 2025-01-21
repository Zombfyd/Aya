const handler = require('serve-handler');
const http = require('http');
const path = require('path');

const server = http.createServer((request, response) => {
  return handler(request, response, {
    public: path.join(__dirname, 'dist'),
    rewrites: [
      { source: '/**', destination: '/index.html' }
    ]
  });
});

const port = process.env.PORT || 3000;

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
