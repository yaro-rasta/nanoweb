const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');
const { decodeUri, getDataFile, loadCatalog, loadData, loadAllData, loadAllCatalogs, loadAlternates, deepMerge, detectLang } = require('./data');
const { removeQueryParams, getQueryParams } = require('./url');

// Get template file path based on URI
function getTemplateFile(uri, viewsDir) {
    const decodedUri = decodeUri(uri);
    const parts = removeQueryParams(decodedUri).replace(/\.html$/, '').split('/');
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
    const dataFile    = getDataFile(uri, dataDir);
    let templateFile  = getTemplateFile(uri, viewsDir);
    const catalogData = loadCatalog(dataFile, dataDir);
    const pageData    = loadData(dataFile);
    let data          = deepMerge(catalogData, pageData);
    let global        = loadAllData(dataDir, '_');
    const lang        = detectLang(uri, global['langs']);
    data.global       = JSON.parse(JSON.stringify(global));
    let globalLang;
    if (global['langs'] && global['langs'].length && lang !== global['langs'][0].code) {
        // not a default language, load global of the current language
        globalLang = loadAllData(`${dataDir}/${lang}`, '_', false, false, true);
        data.global = deepMerge(global, globalLang);
    }

    data.$uri    = uri.replace(/\/index$/, '/');
    data.$alternates = loadAlternates(data.$uri, dataDir, global.langs);
    data.all     = loadAllCatalogs(dataDir);
    data.query   = getQueryParams(uri);

    const timestamp = Date.now();
    data.v       = timestamp.toString(36);
    if (data['$refer']) {
        const dataFileOrig = getDataFile(data['$refer'], dataDir);
        const origData = loadData(dataFileOrig);
        data = deepMerge(origData, data);
        // handle the missing page data from the original data instead of the catalog.
        Object.entries(origData).forEach(([k, v]) => {
            if ('undefined' === typeof pageData[k]) {
                data[k] = v;
            }
        })
    }
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