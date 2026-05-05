// Points to the existing backend
const ATTENDANCE_API_BASE = 'http://localhost:3000/api';

const getToken = () => localStorage.getItem('token');

const authHeaders = () => {
  const t = getToken();
  return t ? { 'Authorization': `Bearer ${t}`, 'Content-Type': 'application/json' }
           : { 'Content-Type': 'application/json' };
};

const apiRequest = async (endpoint, options = {}) => {
  const res = await fetch(`${ATTENDANCE_API_BASE}${endpoint}`, {
    ...options,
    headers: { ...authHeaders(), ...(options.headers || {}) }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
};

const AttendanceAPI = {
  // User: get or create QR token for an event
  getToken: (eventId) => apiRequest(`/attendance/token/${eventId}`),

  // Admin: check in via scanned token
  checkIn: (token) => apiRequest('/attendance/checkin', {
    method: 'POST',
    body: JSON.stringify({ token })
  }),

  // Admin: all attendees for one event
  getEventAttendance: (eventId) => apiRequest(`/attendance/event/${eventId}`),

  // Admin: all attendance
  getAllAttendance: () => apiRequest('/attendance'),

  // Existing events list (reuse backend)
  getEvents: () => apiRequest('/events'),

  // Existing user registrations
  getMyRegistrations: () => apiRequest('/registrations/my')
};

// Theme helpers shared across pages
function setupThemeToggle() {
  const btn = document.getElementById('themeToggle');
  if (!btn) return;
  const saved = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  btn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  });
}

// Check auth and redirect to login if missing
function requireAuth(redirectTo) {
  const token = getToken();
  if (!token) {
    window.location.href = redirectTo || '../login.html';
    return null;
  }
  return JSON.parse(localStorage.getItem('user') || '{}');
}

function requireAdmin(redirectTo) {
  const user = requireAuth(redirectTo);
  if (user && user.role !== 'admin') {
    alert('Admin access required.');
    window.location.href = redirectTo || '../index.html';
    return null;
  }
  return user;
}
