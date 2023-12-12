const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');
const Stream = require('node:stream').Stream;
const archiver = require('archiver');
const crypto = require('crypto'); // Import the crypto module for hash calculation

require('dotenv').config();

const DIST_DIR = path.resolve(__dirname, './dist');
const API_URL = new URL(process.env.API_URL);
const AUTH_KEY = process.env.AUTH_KEY;

function httpsRequest(method, data, headers = {}, query = '') {
    const options = {
        hostname: API_URL.hostname,
        port: API_URL.port,
        path: `${API_URL.pathname}${query}`,
        method,
        headers: Object.assign({
            'Authorization': 'Bearer ' + AUTH_KEY,
            'Content-Type': 'application/json'
        }, headers)
    };
    return new Promise((resolve, reject) => {
        const req = https.request(options, res => {
            let responseData = '';
            let rejected = null;
            if (res.statusCode >= 400) {
                rejected = { code: res.statusCode, message: res.statusMessage };
            }
            res.on('data', chunk => responseData += chunk);
            res.on('end', () => {
                if (null === rejected) {
                    resolve(responseData ? JSON.parse(responseData) : '');
                } else {
                    reject(Object.assign(rejected, { body: responseData }));
                }
            });
        });

        req.on('error', reject);
        if (data) {
            if (data instanceof Stream) {
                // If data is a stream, pipe it to the request
                data.pipe(req);
                data.on('end', () => req.end());
            } else {
                // If data is a string or buffer, write it to the request
                if (null !== data) req.write(data);
                req.end();
            }
        } else {
            req.end();
        }
    });
}

function calculateFileHash(filePath) {
    const data = fs.readFileSync(filePath);
    const hash = crypto.createHash('md5');
    hash.update(data);
    return hash.digest('hex');
}

function getFilesToUpdate() {
    const filesToUpdate = [];

    const processDirectory = (dir, ignoreExp) => {
        const files = fs.readdirSync(dir);

        for (const file of files) {
            const filePath = path.join(dir, file);
            const relPath = path.relative(DIST_DIR, filePath);
            if (ignoreExp.test(relPath)) {
                continue;
            }
            const stats = fs.statSync(filePath);

            if (stats.isDirectory()) {
                // If it's a directory, recursively process it
                processDirectory(filePath, ignoreExp);
            } else {
                // If it's a file, add it to the list
                filesToUpdate.push({
                    name: file,
                    path: relPath,
                    size: stats.size
                });
            }
        }
    };

    processDirectory(DIST_DIR, /dist\.zip$/);

    return httpsRequest('POST', JSON.stringify({ files: filesToUpdate }));
}

async function sendFiles(filesToUpdate) {
    return new Promise((resolve, reject) => {
        const zipPath = path.join(DIST_DIR, 'dist.zip');
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', function() {
            const zipStats = fs.statSync(zipPath);

            const headers = {
                'Content-Type': 'application/octet-stream',
                'Content-Length': zipStats.size
            };

            httpsRequest('PUT', fs.createReadStream(zipPath), headers)
                .then(response => resolve({ response, zipPath }))
                .catch(error => reject(error));
        });

        archive.on('error', function(err) {
            reject(err);
        });

        archive.pipe(output);

        filesToUpdate.forEach(file => {
            archive.file(path.join(DIST_DIR, file.path), { name: file.path });
        });

        archive.finalize();
    });
}

async function deleteFiles(files) {
    const deleted = [];
    for (const file of files) {
        const res = await httpsRequest('DELETE', null, {}, `?file=${encodeURIComponent(file)}`);
        deleted.push(res['fileRemoved'] || null);
    };
    return deleted;
}

async function publish() {
    const { filesToUpdate, filesToRemove } = await getFilesToUpdate();

    const toUpdate = [];
    for (const file of filesToUpdate) {
        const localFilePath = `${DIST_DIR}/${file.path}`; // Replace with the actual local directory path
        const localFileHash = calculateFileHash(localFilePath);
        if (localFileHash !== file.hash) {
            toUpdate.push(file);
        }
    }

    const response = await sendFiles(toUpdate);
    console.log(response);
    if (response['zipPath']) {
        fs.unlink(response['zipPath'], (err) => {
            if (err) {
                console.error(`Error deleting file: ${err}`);
            } else {
                console.log(`File deleted: ${response['zipPath']}`);
            }
        });
    }
    const deleted = await deleteFiles(filesToRemove);
    console.log(deleted);
}

publish().catch(err => {
    console.error(err);
});
