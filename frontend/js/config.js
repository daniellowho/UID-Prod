// Local development default.
// On Railway the frontend is served by the same Express server as the API,
// so the relative path '/api' works in all environments without any changes.
const API_BASE_URL = window.location.origin.includes('localhost')
  ? 'http://localhost:3000/api'
  : '/api';