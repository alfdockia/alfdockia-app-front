const { BASE_URL, SEARCH_URL } = process.env;
const searchEndpoint = parseUrl(SEARCH_URL || 'http://localhost:8084/search');
const searchTarget = `${searchEndpoint.protocol}//${searchEndpoint.host}`;
const searchPath = normalizeSearchPath(searchEndpoint.pathname);

console.log('Using backend URL: ' + (BASE_URL || 'unknown'));
console.log('Using AlfDockia Search URL: ' + `${searchTarget}${searchPath}`);

module.exports = {
  '/search': {
    target: searchTarget,
    secure: false,
    pathRewrite: {
      '^/search': searchPath
    },
    changeOrigin: true
  },
  '/alfresco': {
    target: BASE_URL,
    secure: false,
    pathRewrite: {
      '^/alfresco/alfresco': ''
    },
    changeOrigin: true,
    onProxyReq: (request) => {
      if (request['method'] !== 'GET') {
        request.setHeader('origin', BASE_URL);
      }
    }
  }
};

function parseUrl(value) {
  try {
    return new URL(value);
  } catch {
    return new URL(`http://${value}`);
  }
}

function normalizeSearchPath(value) {
  if (!value || value === '/') {
    return '/search';
  }

  return value.startsWith('/') ? value : `/${value}`;
}
