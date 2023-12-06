const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');
const yaml = require('yaml');

const port = process.env.PORT || 3000;
const DATA_PATH = './data/';
const VIEWS_PATH = './views/';
const STATIC_PATH = './public/';

// Remove query params from URI
function removeQueryParams(uri) {
    return uri.split('?')[0];
}

// Get data file path based on URI
function getDataFile(uri) {
    const decodedUri = removeQueryParams(decodeURIComponent(uri)).replace(/\/$/, '');
    const parts = decodedUri.split('/');
    let fileName = parts.slice(1).join('/');
    if ('' === fileName) {
        fileName = 'index';
    }
    const dataFile = `${DATA_PATH}${fileName}.yaml`;
    return dataFile;
}

// Get template file path based on URI
function getTemplateFile(uri) {
    const decodedUri = decodeURIComponent(uri);
    const parts = removeQueryParams(decodedUri).split('/');
    let fileName = parts.slice(1).join('/');
    if ('' === fileName) {
        fileName = 'index';
    }
    const templateFile = `${VIEWS_PATH}${fileName}.ejs`;
    return templateFile;
}

// Load data from YAML file
async function loadData(dataFile) {
    if (!fs.existsSync(dataFile)) {
        throw new Error(`Data file not found: ${dataFile}`);
    }

    const data = await yaml.parse(fs.readFileSync(dataFile, 'utf8'));
    return data;
}

async function loadAllData() {
    const directory = path.dirname(getDataFile('/_/index'));
    const files = fs.readdirSync(directory);
    const data = {};

    for (const file of files) {
        if (path.extname(file)) {
            const key = path.basename(file, path.extname(file));
            data[key] = await loadData(path.join(directory, file));
        }
    }

    return data;
}
// Render EJS template with data
async function renderTemplate(templateFile, data) {
    const templatesRoot = path.join(__dirname, './views');

    if (!fs.existsSync(templateFile)) {
        throw new Error(`Template file not found: ${templateFile}`);
    }
    const options = { root: templatesRoot };
    const renderedTemplate = await ejs.renderFile(templateFile, data, options);
    return renderedTemplate;
}


// Handle different routes of request URI and render templates
const handleRequest = async (req, res) => {
    const uri = removeQueryParams(req.url);
    const dataFile = getDataFile(uri);
    let templateFile = getTemplateFile(uri);

    try {
        const data = await loadData(dataFile);
        const global = await loadAllData();
        data.global = global;
        if (!fs.existsSync(templateFile)) {
            templateFile = getTemplateFile('/_/page-standard');
        }
        const renderedTemplate = await renderTemplate(templateFile, data);
        res.writeHead(200, { 'Content-Type': 'text/html; charset=UTF-8' });
        res.end(renderedTemplate);
    } catch (err) {
        console.error('Error:', err);
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
};

// Function to get mime type based on file extension
function getMimeType(fileExtension) {
    const mimeTypes = {
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'application/javascript',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.eot': 'application/vnd.ms-fontobject',
        '.svg': 'image/svg+xml',
        '.ttf': 'font/ttf',
        '.woff': 'font/woff',
        // Add more mime types as needed
    };

    return mimeTypes[fileExtension.toLowerCase()] || 'application/octet-stream';
}

// Serve static files from `./css/**`, `./js/**`, `./img/**`
function serveStaticFile(req, res) {
    const filePath = removeQueryParams(req.url);
    if (filePath.startsWith('/css/') || filePath.startsWith('/js/') || filePath.startsWith('/img/')) {
        const staticFilePath = `${STATIC_PATH}${filePath}`;
        if (fs.existsSync(staticFilePath)) {
            const contentType = getMimeType(filePath.split('.').pop());
            res.writeHead(200, { 'Content-Type': contentType });
            fs.createReadStream(staticFilePath).pipe(res);
        } else {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not Found');
        }
    } else {
        // Not a static file, handle as normal request
        handleRequest(req, res);
    }
}

const server = http.createServer(serveStaticFile);

// Start the server
server.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
