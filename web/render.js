const fs = require('node:fs');
const path = require('node:path');
const { renderUri } = require('./src/template');
const { ensureDirectory, findAllFiles } = require('./src/fs');

const DATA_DIR = path.resolve(__dirname, './data/');
const DIST_DIR = path.resolve(__dirname, './dist/');
const VIEWS_DIR = path.resolve(__dirname, './views/');

async function renderAllFiles() {
    ensureDirectory(DIST_DIR, true);
    // @todo fix the 3rd argument to ignore all the /_ directories and all the .yaml files.
    const yamlFiles = findAllFiles(DATA_DIR, /\.yaml$/, /\/_|\/_\.yaml$/);

    for (const file of yamlFiles) {
        const uri = file.replace(DATA_DIR, '').replace('.yaml', '');
        try {
            const html = await renderUri(uri, DATA_DIR, VIEWS_DIR, true);
            const outputFilePath = path.join(DIST_DIR, uri + '.html');
            ensureDirectory(path.dirname(outputFilePath));
            fs.writeFileSync(outputFilePath, html);
        } catch (err) {
            console.error('Error rendering file:', file, err);
        }
    }
}

renderAllFiles();
// @todo To upload changed files on the server I need you to write a server (apache) script that accepts next calls:
//  - POST postData - list of all files with their relative to rootDir path, size: in the response I receive a list of files with the sizes and 0 if do not exist, for files with the same size server returns their hash. Files which are not present in postData must be returned as separeted list of filesToRemove. Local script check the hashes for the list of files with hashes to understand which must be updated and which not. All the files which no need to be updated must be removed from DIST_DIR. All the rest file are zipped and sending with the next request:
//  - PUT filesToRemove, dist.zip - unzip the file on the server, removes all the filesToRemove, returns OK on success and ERROR with the proper code and exception on failure.
// All the api requests must be authorized.
// All authorized AUTH_KEY and API_URL are stored in .env same on the localhost and server and must be sent through headers.