const fs = require('node:fs');
const path = require('node:path');
const { runtime } = require('../../runtime');
const { getLanguage } = require('../../data');
const { thumbSrc } = require('../../static');
const { ensureDirectory } = require('../../fs');

const fps = {};
const blockRowsLimit = runtime['SEARCH_BLOCK_ROWS'] || 0;
const blockSizeLimit = runtime['SEARCH_BLOCK_SIZE'] || 0;

function close() {
  Object.keys(fps).forEach(file => {
    fs.closeSync(fps[file]);
    delete fps[file];
  });
}

function fromNano(nano, divider = ' ') {
  if (!nano) return '';
  const result = [];
  if (typeof nano === 'string') {
    result.push(nano);
  } else if (Array.isArray(nano)) {
    nano.forEach(element => result.push(fromNano(element, divider)));
  } else if (typeof nano === 'object') {
    Object.keys(nano).forEach(key => {
      if (!key.startsWith('$')) {
        result.push(fromNano(nano[key], divider));
      }
    });
  }
  return result.join(divider);
}

function extract(item) {
  let image = '';
  const keys = runtime['SEARCH_IMAGE_KEYS'] || ['ogImage', 'image', 'thumb'];
  for (const key of keys) {
    if (item[key]) {
      image = runtime['SEARCH_INDEX_GALLERY'] ? thumbSrc(item[key], runtime['SEARCH_INDEX_GALLERY']) : item[key];
      break;
    }
  }
  return [
    JSON.stringify(item['$uri']),
    JSON.stringify(item['title']),
    JSON.stringify(image),
    JSON.stringify(item['desc'] || ''),
    JSON.stringify([
      fromNano(item['page']?.['content']),
      fromNano(item['page']?.['excerpt']),
    ].join(' ')),
    JSON.stringify(item['page']?.['date'] || '')
  ].join("\n");
}

function blockFile(file, block = 0) {
  if (!block) return file;
  return file.replace(/\.txt$/, `-${block}.txt`);
}

function saveMeta() {
  const meta = {};
  for (const file in fps) {
    const rows = fps[file].rows;
    const size = fps[file].size;
    meta[file] = [];
    for (const i in rows) {
      meta[file].push({
        block: blockFile(file, i),
        rows: rows[i],
        size: size[i]
      });
    }
  }
  const file = path.join(runtime['STATIC_DIR'], 'search.json');
  fs.writeSync(file, JSON.stringify(meta));
}

function search(item, i, len) {
  const lang = getLanguage(item['$uri']);
  const file = path.join(runtime['STATIC_DIR'], 'search', `${lang}.txt`);
  ensureDirectory(file);

  if (typeof fps[file] === 'undefined') {
    const fp = fs.openSync(blockFile(file), 'w'); // Open file
    fps[file] = { fp, rows: [0], size: [0], block: 0 };
  }
  
  const index = extract(item);
  const size = Buffer.byteLength(index, 'utf8');
  const overLong = blockRowsLimit > 0 && rows === blockRowsLimit;
  const overSize = blockSizeLimit > 0 && size + fps[file].size[fps[file].block] > blockSizeLimit;
  if (overLong || overSize) {
    fs.closeSync(fps[file].fp);
    fps[file].block++;
    const fp = fs.openSync(blockFile(file, fps[file].block), 'w');
    fps[file].fp = fp;
    fps[file].rows[fps[file].block] = 0;
    fps[file].size[fps[file].block] = 0;
  }
  fs.writeSync(fps[file].fp, index + runtime['SEARCH_INDEX_DIVIDER'] || "\n\n"); // Append newline for each entry
  fps[file].rows[fps[file].block]++;
  fps[file].size[fps[file].block] += size;

  if (len - 1 === i) {
    saveMeta();
    close(); // Close all file descriptors
  }
}

module.exports = search;
