const fs = require('node:fs');
const path = require('node:path');
const { runtime } = require('../../runtime');
const { getLanguage } = require('../../data');

const fps = {};

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
  return [
    JSON.stringify(item['$uri']),
    JSON.stringify(item['title']),
    JSON.stringify(item['ogImage'] || item['thumb'] || item['image']),
    JSON.stringify(item['desc'] || ''),
    JSON.stringify([
      fromNano(item['page']?.['content']),
      fromNano(item['page']?.['excerpt']),
    ].join(' ')),
    JSON.stringify(item['page']?.['date'] || '')
  ].join("\n");
}

function search(item, i, len) {
  const lang = getLanguage(item['$uri']);
  const file = path.join(runtime['STATIC_DIR'], `${lang}.txt`);

  if (typeof fps[file] === 'undefined') {
    fps[file] = fs.openSync(file, 'w'); // Open file for appending
  }
  
  const index = extract(item);
  fs.writeSync(fps[file], index + "\n\n"); // Append newline for each entry

  if (len - 1 === i) {
    close(); // Close all file descriptors
  }
}

module.exports = search;
