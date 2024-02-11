const { runtime } = require('../../runtime');
const { getLanguage } = require('../../data');
const fps = {};

function close() {
  for (const file in fps) {
    const fp = fps[file]
    // close file pointer fp
  }
}

function fromNano(nano) {
  // @todo extract content and text of elements, avoid attribute.
}

function extract(item) {
  return [
    JSON.stringify(item['$uri']),
    JSON.stringify(item['title']),
    JSON.stringify(item['desc'] || ''),
    JSON.stringify([fromNano(item['page']?.['content']), fromNano(item['page']?.['excerpt'])].join(' ')),
    JSON.stringify(item['page']?.['date'] || '')
  ].join("\n");
}

function search(item, i, len) {
  const lang = getLanguage(item['$uri']);
  const file = join(runtime['STATIC_DIR'], `${lang}.txt`);
  let fp;
  if ('undefined' === typeof fps[file]) {
    fp = fopen(file);
    fps[file] = fp;
  } else {
    fp = fps[file];
  }
  const index = extract(item);
  fwrite(fp, index);
  if (len - 1 === i) {
    // the last element
    close();
  }
}
module.exports = search;
