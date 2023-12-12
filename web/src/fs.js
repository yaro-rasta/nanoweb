const fs = require('node:fs');
const path = require('node:path');

function removeDirectory(directoryPath, recursively = false) {
    if (fs.existsSync(directoryPath)) {
        fs.readdirSync(directoryPath).forEach((file) => {
            const currentPath = path.join(directoryPath, file);
            if (fs.lstatSync(currentPath).isDirectory()) {
                // Recursively delete directory
                if (recursively) removeDirectory(currentPath, true);
            } else {
                // Delete file
                fs.unlinkSync(currentPath);
            }
        });
        fs.rmdirSync(directoryPath);
    }
}

function ensureDirectory(distDir, removeBefore = false) {
    if (removeBefore && fs.existsSync(distDir)) {
        removeDirectory(distDir, true);
    }
    if (!fs.existsSync(distDir)) {
        fs.mkdirSync(distDir, { recursive: true });
    }
}

function findAllFiles(dir, acceptRegEx = null, skipRegEx = null) {
    let results = [];
    const list = fs.readdirSync(dir);

    for (const file of list) {
        const filePath = path.resolve(dir, file);
        if (skipRegEx && skipRegEx.test(filePath)) continue;

        const stat = fs.statSync(filePath);

        if (stat && stat.isDirectory()) {
            results = results.concat(findAllFiles(filePath, acceptRegEx, skipRegEx));
        } else if (!acceptRegEx || acceptRegEx.test(filePath)) {
            results.push(filePath);
        }
    }

    return results;
}

module.exports = {
    ensureDirectory,
    removeDirectory,
    findAllFiles
};