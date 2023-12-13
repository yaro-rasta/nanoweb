const fs = require('node:fs');
const path = require('node:path');
const yaml = require('yaml');
const { decodeUri, removeQueryParams } = require('./url');

let alternatesOriginal;

// Get data file path based on URI
function getDataFile(uri, dataDir) {
    const decodedUri = decodeUri(uri).replace(/.html$/, '');
    const parts = decodedUri.split('/');
    let fileName = parts.slice(1).join('/');
    if ('' === fileName) {
        fileName = 'index';
    }
    if ('/' === fileName.slice(-1)) {
        fileName += 'index';
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

function loadAllData(dataPath, subdir = '_', asArray = false, fullKeys = false, softError = false) {
    // Use findAllDataFiles to recursively find all data files
    const allFiles = findAllDataFiles(dataPath, subdir, softError);
    const data = asArray ? [] : {};

    for (const file of allFiles) {
        // Load data for each file
        const filePath = path.join(dataPath, file);
        const fileData = loadData(filePath);

        if (asArray) {
            data.push(fileData);
        } else {
            let key;
            if (fullKeys) {
                key = path.relative(dataPath, file).slice(0, - path.extname(file).length).replace(/^\.+/, '');
            } else {
                key = path.basename(file, path.extname(file));
            }
            data[key] = fileData;
        }
    }
    return data;
}

function getAlternatesOriginal(dataPath, langs) {
    if (alternatesOriginal) return alternatesOriginal;
    let orig = {};
    langs.slice(1).forEach(l => {
        const pages = loadAllData(dataPath, l.code, false, true);
        Object.entries(pages).forEach(([u, p]) => {
            const fullUri = `${u}.html`;
            if (p['$refer']) {
                const dataFile = getDataFile(p['$refer'], dataPath);
                try {
                    fs.statSync(dataFile);
                } catch (err) {
                    throw `Reference $refer ${p['$refer']} not found in data: ${u}`;
                }
                if ('undefined' === typeof orig[p['$refer']]) orig[p['$refer']] = {};
                orig[p['$refer']][l.code] = fullUri;
            }
        });
    });
    alternatesOriginal = orig;
    return alternatesOriginal;
}

function loadAlternates(uri, dataPath, langs) {
    const url = decodeUri(uri);
    if (!langs.length) return [];
    const mainLang = langs[0].code;
    let alts = {};
    const orig = getAlternatesOriginal(dataPath, langs);
    let stop = false;
    let found = false;
    Object.entries(orig).forEach(([origUri, alt]) => {
        if (stop) return;
        if (origUri === url) {
            alts = alt;
            found = true;
            return;
        }
        Object.entries(alt).forEach(([l, u]) => {
            if (stop) return;
            if (u === url) {
                alts[mainLang] = origUri;
                stop = true;
            }
        })
    });
    if (!found && alts[mainLang]) Object.entries(orig[alts[mainLang]]).forEach(([l, u]) => {
        if (u !== url) {
            alts[l] = u;
        }
    });

    return alts;
}

/**
 * Finds all data files in the dataPath + subdir, ignores ** / _.yaml
 * @param {*} dataPath 
 * @param {*} subdir 
 * @returns files in array.
 */
function findAllDataFiles(dataPath, subdir = '_', softError = false) {
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

    if (softError && !fs.existsSync(directory)) return allFiles;
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
        'html': 'text/html',
        'css': 'text/css',
        'js': 'application/javascript',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'eot': 'application/vnd.ms-fontobject',
        'svg': 'image/svg+xml',
        'ttf': 'font/ttf',
        'woff': 'font/woff',
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

function deepMerge(target, source) {
    // Create a deep copy of the target
    let newTarget = JSON.parse(JSON.stringify(target));

    for (const key in source) {
        if (source.hasOwnProperty(key)) {
            if (source[key] && typeof source[key] === 'object') {
                if (Array.isArray(source[key])) {
                    // Replace with a copy of the array
                    newTarget[key] = source[key].slice();
                } else {
                    // Perform a deep merge on a copy of the object
                    newTarget[key] = newTarget[key] || {};
                    newTarget[key] = deepMerge(newTarget[key], source[key]);
                }
            } else {
                newTarget[key] = source[key];
            }
        }
    }
    return newTarget;
}

function detectLang(uri, langs = []) {
    let lang;
    const slugs = uri.split('/');
    if (slugs[1] && langs && langs.map(l => l.code).indexOf(slugs[1]) > -1) {
        lang = slugs[1];
    }
    if (!lang && langs && langs.length) {
        lang = langs[0].code;
    }
    return lang;
}

module.exports = {
    removeQueryParams,
    decodeUri,
    getDataFile,
    loadCatalog,
    loadData,
    loadAllData,
    loadAllCatalogs,
    loadAlternates,
    getMimeType,
    serveStaticFile,
    deepMerge,
    detectLang
};
