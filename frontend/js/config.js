// Local development default.
// On Railway the frontend is served by the same Express server as the API,
// so the relative path '/api' works in all environments without any changes.
const isLocalDevHost = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);

const API_BASE_URL = isLocalDevHost
  ? 'http://localhost:3000/api'
  : '/api';

const API_ORIGIN = API_BASE_URL.startsWith('http')
  ? new URL(API_BASE_URL).origin
  : window.location.origin;

const resolveMediaUrl = (url) => {
  if (!url) return url;
  if (/^(https?:)?\/\//i.test(url) || url.startsWith('data:')) return url;

  if (url.startsWith('/')) {
    return `${API_ORIGIN}${url}`;
  }

  return `${API_ORIGIN}/${url}`;
};
