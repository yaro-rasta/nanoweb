const fs = require('node:fs');
const path = require('node:path');
const yaml = require('yaml');
const { decodeUri, removeQueryParams } = require('./url');

// Get data file path based on URI
function getDataFile(uri, dataDir) {
    const decodedUri = decodeUri(uri).replace(/.html$/, '');
    const parts = decodedUri.split('/');
    let fileName = parts.slice(1).join('/');
    if ('' === fileName) {
        fileName = 'index';
    }
    const dataFile = `${dataDir}/${fileName}.yaml`;
    return dataFile;
}

// Load data from YAML file
function loadData(dataFile) {
    if (!fs.existsSync(dataFile)) {
        throw new Error(`Data file not found: ${dataFile}`);
    }

    const data = yaml.parse(fs.readFileSync(dataFile, 'utf8'));
    return data;
}

function loadAllData(dataPath, subdir = '_', asArray = false) {
    // Use findAllDataFiles to recursively find all data files
    const allFiles = findAllDataFiles(dataPath, subdir);
    const data = asArray ? [] : {};

    for (const file of allFiles) {
        // Load data for each file
        const filePath = path.join(dataPath, file);
        const fileData = loadData(filePath);

        if (asArray) {
            data.push(fileData);
        } else {
            const key = path.basename(file, path.extname(file));
            data[key] = fileData;
        }
    }
    return data;
}

/**
 * Finds all data files in the dataPath + subdir, ignores ** / _.yaml
 * @param {*} dataPath 
 * @param {*} subdir 
 * @returns files in array.
 */
function findAllDataFiles(dataPath, subdir = '_') {
    const directory = path.join(dataPath, subdir);
    let allFiles = [];

    const processDirectory = (dir) => {
        const files = fs.readdirSync(dir);

        for (const file of files) {
            const fullPath = path.join(dir, file);
            const stats = fs.statSync(fullPath);
            
            if (stats.isDirectory()) {
                processDirectory(fullPath); // Recursively process subdirectories
            } else if (path.extname(file)) {
                // Add file to array, relative to dataPath
                if (!/\/_\.yaml$/.test(fullPath)) {
                    allFiles.push(path.relative(dataPath, fullPath));
                }
            }
        }
    };

    processDirectory(directory);
    return allFiles;
}

// @todo write a function to load directories of the dataPath in the object (as result) where keys are 1st directory name, 
// all the deeper levels of the directories/files read as data of the catalog, extend the data of every loaded file
// with the file name $fileName, file path $filePath related to dataPath, $fileUri that is dataPath + file path related 
// to dataPath without the file extension, use loadData, loadAllData, findAllDataFiles.
function loadAllCatalogs(dataPath) {
    let catalogs = {};

    // Get all first-level directories
    const topLevelDirs = fs.readdirSync(dataPath).filter(file => {
        const fullPath = path.join(dataPath, file);
        return fs.statSync(fullPath).isDirectory() && !file.startsWith('_');
    });

    // Process each directory
    topLevelDirs.forEach(dir => {
        const allFiles = findAllDataFiles(dataPath, dir);

        // Load data for each file in the directory
        const dirData = allFiles.map(file => {
            const filePath = path.join(dataPath, file);
            const fileData = loadData(filePath);
            const fileBaseName = path.basename(file, path.extname(file));
            const $filePath = filePath.replace(dataPath, '');

            // Extend the data with file properties
            return {
                ...fileData,
                $filePath,
                $fileName: fileBaseName,
                $uri: $filePath.replace(/\.yaml$/, '.html')
            };
        });

        // Assign the array of file data to the respective catalog key
        catalogs[dir] = dirData;
    });

    return catalogs;
}

// @todo check all the subfolders in the path of dataDir but not upper than dataDir,
// if _.yaml file is found read its data by loadData(), merge with the _.yaml recursively if existed and return.
// by default return {}.
// for the path /data/новини/2022/20221130-Тест.yaml, reads:
// - data/_.yaml (if exists)
// - data/новини/_.yaml (if exists)
// - data/новини/2022/_.yaml (if exists)
function loadCatalog(dataFile, dataDir) {
    let catalogData = {};
    let currentDir = path.dirname(dataFile);
    let files = [];

    while (currentDir.startsWith(dataDir)) {
        const catalogFilePath = path.join(currentDir, '_.yaml');

        if (fs.existsSync(catalogFilePath)) {
            files.push(catalogFilePath);
        }

        // Check if we have reached the dataDir
        if (currentDir === dataDir) {
            break;
        }

        // Move up a directory level
        currentDir = path.dirname(currentDir);
    }
    for (let i = files.length - 1; i >= 0; i--) {
        catalogData = Object.assign(catalogData, loadData(files[i]));
    }

    return catalogData;
}

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
function serveStaticFile(req, res, staticSlugs = [], staticPath = './public/') {
    const filePath = removeQueryParams(decodeUri(req.url));
    let found = false;
    for (const slug of staticSlugs) {
        if (filePath.startsWith(slug)) {
            found = true;
            break;
        }
    }
    if (!found) return false;

    const staticFilePath = `${staticPath}${filePath}`;
    if (fs.existsSync(staticFilePath)) {
        const contentType = getMimeType(filePath.split('.').pop());
        res.writeHead(200, { 'Content-Type': contentType });
        fs.createReadStream(staticFilePath).pipe(res);
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
    return true;
}

module.exports = {
    removeQueryParams,
    decodeUri,
    getDataFile,
    loadCatalog,
    loadData,
    loadAllData,
    loadAllCatalogs,
    getMimeType,
    serveStaticFile
};
