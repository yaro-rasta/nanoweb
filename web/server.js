const path = require('node:path');
const http = require('node:http');
const { serveStaticFile } = require('./src/data');
const { renderUri } = require('./src/template');

const port       = process.env.PORT || 3000;
const DATA_DIR   = path.resolve(__dirname, './data/');
const VIEWS_DIR  = path.resolve(__dirname, './views/');
const STATIC_DIR = path.resolve(__dirname, './public/');

// Handle different routes of request URI and render templates
const handleRequest = async (req, res) => {
    try {
        const html = await renderUri(req.url, DATA_DIR, VIEWS_DIR, true);
        res.writeHead(200, { 'Content-Type': 'text/html; charset=UTF-8' });
        res.end(html);
    } catch (err) {
        console.error('Error:', err);
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
};

const server = http.createServer((req, res) => {
    if (serveStaticFile(req, res, ['/css/', '/js/', '/img/', '/files/'], STATIC_DIR)) {
        return;
    }
    handleRequest(req, res);
});

// Start the server
server.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
