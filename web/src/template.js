const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');
const { decodeUri, getDataFile, loadCatalog, loadData, loadAllData, loadAllCatalogs } = require('./data');
const { removeQueryParams, getQueryParams } = require('./url');

// Get template file path based on URI
function getTemplateFile(uri, viewsDir) {
    const decodedUri = decodeUri(uri);
    const parts = removeQueryParams(decodedUri).split('/');
    let fileName = parts.slice(1).join('/');
    if ('' === fileName) {
        fileName = 'index';
    }
    const templateFile = `${viewsDir}/${fileName}.ejs`;
    return templateFile;
}

// Render EJS template with data
async function renderTemplate(templateFile, data, viewsDir = '.') {
    if (!fs.existsSync(templateFile)) {
        throw new Error(`Template file not found: ${templateFile}`);
    }
    const options = { root: viewsDir };
    const renderedTemplate = await ejs.renderFile(templateFile, data, options);
    return renderedTemplate;
}

function renderUri(uri, dataDir, viewsDir, debugging = false) {
    const dataFile = getDataFile(uri, dataDir);
    let templateFile = getTemplateFile(uri, viewsDir);

    const data   = Object.assign(loadCatalog(dataFile, dataDir), loadData(dataFile));
    const global = loadAllData(dataDir);
    data.global  = global;
    data.all     = loadAllCatalogs(dataDir);
    data.query   = getQueryParams(uri);
    data.$uri    = uri.replace(/\/index$/, '/');
    if (!fs.existsSync(templateFile) && data['$template']) {
        templateFile = getTemplateFile(data['$template'], viewsDir);
    }
    if (debugging) {
        const dir = path.dirname(__dirname);
        console.log(`${path.relative(dir, dataFile)} >> ${path.relative(dir, templateFile)}`);
    }
    return renderTemplate(templateFile, data, viewsDir);
}

module.exports = {
    getTemplateFile,
    renderUri,
    renderTemplate,
};