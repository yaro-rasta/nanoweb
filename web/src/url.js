const removeQueryParams = uri => uri.split('?')[0];
const decodeUri = uri => removeQueryParams(decodeURIComponent(uri));
function getQueryParams(url) {
    const queryParams = {};
    const queryStringIndex = url.indexOf('?');

    if (queryStringIndex !== -1) {
        const queryString = url.substring(queryStringIndex + 1);
        const params = queryString.split('&');

        for (const param of params) {
            const [key, value] = param.split('=');
            queryParams[decodeURIComponent(key)] = decodeURIComponent(value || '');
        }
    }

    return queryParams;
}

module.exports = {
    removeQueryParams,
    decodeUri,
    getQueryParams
};