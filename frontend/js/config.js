// Local development default.
// On Railway the frontend is served by the same Express server as the API,
// so the relative path '/api' works in all environments without any changes.
const isLocalDevHost = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);

const API_BASE_URL = isLocalDevHost
  ? 'http://localhost:3000/api'
  : '/api';
