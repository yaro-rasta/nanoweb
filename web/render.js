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
        const uri = file.replace(DATA_DIR, '').replace('.yaml', '.html').replace('\\', '/');
        try {
            const html = await renderUri(uri, DATA_DIR, VIEWS_DIR, true);
            const outputFilePath = path.join(DIST_DIR, uri);
            ensureDirectory(path.dirname(outputFilePath));
            fs.writeFileSync(outputFilePath, html);
        } catch (err) {
            console.error('Error rendering file:', file, err);
        }
    }
}

renderAllFiles();
