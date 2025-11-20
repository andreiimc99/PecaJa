const http = require('http');
const fs = require('fs');
const path = require('path');

const port = process.env.PORT || 3001;
const publicDir = path.join(__dirname, 'public');

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

function sendFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const type = mimeTypes[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];

  // Route to download CSV (demo endpoint)
  if (url === '/download-csv') {
    const auth = req.headers['authorization'] || req.headers['Authorization'];
    if (!auth || !auth.startsWith('Bearer ')) {
      res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Missing or invalid Authorization header' }));
      return;
    }
    const token = auth.slice(7).trim();
    if (!token) {
      res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Empty token' }));
      return;
    }

    // Example CSV content for demo purposes
    const csv = 'id,name,price\n1,Peça A,10.00\n2,Peça B,20.50\n3,Peça C,15.75\n';
    res.writeHead(200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="export.csv"'
    });
    res.end(csv);
    return;
  }

  // Serve static files from public/
  let safePath = path.normalize(path.join(publicDir, url));
  // If url ends with / or is root, serve export.html by default
  if (url === '/' || url === '') {
    safePath = path.join(publicDir, 'export.html');
  }

  // Prevent directory traversal
  if (!safePath.startsWith(publicDir)) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Bad request');
    return;
  }

  // If the path is a directory, try to serve index.html
  fs.stat(safePath, (err, stats) => {
    if (!err && stats.isDirectory()) {
      safePath = path.join(safePath, 'index.html');
    }
    sendFile(res, safePath);
  });
});

server.listen(port, () => {
  console.log(`Static server listening at http://localhost:${port}`);
  console.log('Open http://localhost:' + port + '/export.html in your browser');
});
