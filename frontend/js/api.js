const getToken = () => localStorage.getItem('token');

const getAuthHeader = () => {
  const token = getToken();
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

const apiRequest = async (endpoint, options = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...options.headers
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `Request failed with status ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

const AuthAPI = {
  signup: (userData) => apiRequest('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(userData)
  }),

  login: (credentials) => apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials)
  }),

  getCurrentUser: () => apiRequest('/auth/me'),

  updateProfile: (userData) => apiRequest('/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(userData)
  }),

  changePassword: (passwordData) => apiRequest('/auth/password', {
    method: 'PUT',
    body: JSON.stringify(passwordData)
  }),

  deleteAccount: () => apiRequest('/auth/account', {
    method: 'DELETE'
  })
};

const EventsAPI = {
  getAll: () => apiRequest('/events'),

  getById: (id) => apiRequest(`/events/${id}`),

  create: (eventData) => apiRequest('/events', {
    method: 'POST',
    body: JSON.stringify(eventData)
  }),

  update: (id, eventData) => apiRequest(`/events/${id}`, {
    method: 'PUT',
    body: JSON.stringify(eventData)
  }),

  delete: (id) => apiRequest(`/events/${id}`, {
    method: 'DELETE'
  })
};

const RegistrationsAPI = {
  register: (eventId) => apiRequest(`/registrations/events/${eventId}/register`, {
    method: 'POST'
  }),

  getMyRegistrations: () => apiRequest('/registrations/my'),

  cancel: (eventId) => apiRequest(`/registrations/events/${eventId}/cancel`, {
    method: 'DELETE'
  }),

  getAll: () => apiRequest('/registrations'),

  updateStatus: (registrationId, status) => apiRequest(`/registrations/${registrationId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status })
  })
};

const AdminAPI = {
  getAnalytics: () => apiRequest('/admin/analytics'),

  getUsers: () => apiRequest('/admin/users'),

  getEmailLogs: () => apiRequest('/admin/email/logs'),

  sendEmail: (payload) => apiRequest('/admin/email/send', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
};