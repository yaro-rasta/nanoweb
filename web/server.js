const path = require('node:path');
const http = require('node:http');
const { serveStaticFile, loadAllData, detectLang } = require('./src/data');
const { renderUri } = require('./src/template');

const port       = process.env.PORT || 3000;
const DATA_DIR   = path.resolve(__dirname, './data/');
const VIEWS_DIR  = path.resolve(__dirname, './views/');
const STATIC_DIR = path.resolve(__dirname, './public/');

// Handle different routes of request URI and render templates
const handleRequest = async (req, res) => {
    let firstError;
    let secondError;
    try {
        const html = await renderUri(req.url, DATA_DIR, VIEWS_DIR, true);
        res.writeHead(200, { 'Content-Type': 'text/html; charset=UTF-8' });
        res.end(html);
        return;
    } catch (err) {
        firstError = err;
    }
    try {
        const global = loadAllData(DATA_DIR);
        const lang = detectLang(req.url, global['langs']);
        let uri = '/404.html';
        if (lang && global['langs'] && global['langs'][0].code !== lang) {
            uri = `/${lang}${uri}`;
        }
        const html = await renderUri(uri, DATA_DIR, VIEWS_DIR, true);
        res.writeHead(404, { 'Content-Type': 'text/html; charset=UTF-8' });
        res.end(html);
        return;
    } catch (err) {
        secondError = err;
    }
    console.error('Error 1st:', firstError);
    console.error('Error 2nd:', secondError);
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
};

const server = http.createServer((req, res) => {
    if (serveStaticFile(req, res, ['/favicon.ico', '/css/', '/js/', '/img/', '/files/'], STATIC_DIR)) {
        return;
    }
    handleRequest(req, res);
});

// Start the server
server.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
