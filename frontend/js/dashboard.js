const defaultImages = [
  'https://images.unsplash.com/photo-1518779578993-ec3579fee39f?w=400&h=200&fit=crop',
  'https://images.unsplash.com/photo-1517697471339-43c9d7c9a45c?w=400&h=200&fit=crop',
  'https://images.unsplash.com/photo-1526378722484-6f9f1f0f7f1f?w=400&h=200&fit=crop',
  'https://images.unsplash.com/photo-1515879216487-1a1323ba1a45?w=400&h=200&fit=crop',
  'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&h=200&fit=crop'
];

document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  loadUserData();
  setupLogout();
  setupThemeToggle();
});

function checkAuth() {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (user.role === 'admin') {
    document.getElementById('adminLink').style.display = 'block';
  }
}

function setupThemeToggle() {
  const themeToggle = document.getElementById('themeToggle');
  const sunIcon = themeToggle?.querySelector('.sun-icon');
  const moonIcon = themeToggle?.querySelector('.moon-icon');
  
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme, sunIcon, moonIcon);

  themeToggle?.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme, sunIcon, moonIcon);
  });
}

function updateThemeIcon(theme, sunIcon, moonIcon) {
  if (sunIcon && moonIcon) {
    if (theme === 'dark') {
      sunIcon.style.display = 'none';
      moonIcon.style.display = 'block';
    } else {
      sunIcon.style.display = 'block';
      moonIcon.style.display = 'none';
    }
  }
}

async function loadUserData() {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    document.getElementById('userName').textContent = user.name || 'User';
    document.getElementById('welcomeName').textContent = user.name ? user.name.split(' ')[0] : 'User';

    const registrations = await RegistrationsAPI.getMyRegistrations();
    displayRegistrations(registrations);
    updateStats(registrations);

    const events = await EventsAPI.getAll();
    displayUpcomingEvents(events, registrations);
  } catch (error) {
    console.error('Error loading user data:', error);
    if (error.message.includes('Invalid token') || error.message.includes('Access denied')) {
      logout();
    }
    document.getElementById('registrationsList').innerHTML = `
      <div class="error-message">Failed to load data. Please try again later.</div>
    `;
  }
}

function displayRegistrations(registrations) {
  const list = document.getElementById('registrationsList');

  if (!registrations || registrations.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" stroke-width="1.5">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <p>You haven't registered for any events yet.</p>
        <a href="index.html" class="btn btn-primary btn-sm">Browse Events</a>
      </div>
    `;
    return;
  }

  list.innerHTML = registrations.map((reg, index) => `
    <div class="registration-item" style="animation-delay: ${index * 0.1}s">
      <div class="registration-info">
        <h4>${escapeHtml(reg.title)}</h4>
        <p>${formatDate(reg.date)} • ${escapeHtml(reg.location || 'TBD')}</p>
      </div>
      <div style="display: flex; align-items: center; gap: 12px;">
        <span class="status-badge status-${reg.status}">${reg.status}</span>
        ${reg.status === 'pending' ? `
          <button class="btn btn-danger btn-sm" onclick="cancelRegistration(${reg.event_id})">
            Cancel
          </button>
        ` : ''}
      </div>
    </div>
  `).join('');

  animateListItems(list);
}

function animateListItems(container) {
  const items = container.querySelectorAll('.registration-item');
  items.forEach((item, index) => {
    item.style.opacity = '0';
    item.style.transform = 'translateX(-20px)';
    setTimeout(() => {
      item.style.transition = 'all 0.3s ease';
      item.style.opacity = '1';
      item.style.transform = 'translateX(0)';
    }, index * 100);
  });
}

function updateStats(registrations) {
  const registered = registrations ? registrations.length : 0;
  const pending = registrations ? registrations.filter(r => r.status === 'pending').length : 0;
  const approved = registrations ? registrations.filter(r => r.status === 'approved').length : 0;

  animateNumber('statRegistered', registered);
  animateNumber('statPending', pending);
  animateNumber('statApproved', approved);
}

function animateNumber(elementId, target) {
  const element = document.getElementById(elementId);
  const duration = 1000;
  const start = 0;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easeOut = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(start + (target - start) * easeOut);
    
    element.textContent = current;
    
    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

function displayUpcomingEvents(allEvents, userRegistrations) {
  const registeredEventIds = userRegistrations ? userRegistrations.map(r => r.event_id) : [];
  const upcomingEvents = allEvents.filter(e => 
    !registeredEventIds.includes(e.id) && new Date(e.date) > new Date()
  );

  const container = document.getElementById('upcomingEvents');

  if (upcomingEvents.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" stroke-width="1.5">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        <p>No upcoming events available.</p>
      </div>
    `;
    return;
  }

    container.innerHTML = upcomingEvents.slice(0, 5).map((event, index) => `
      <div class="mini-event-card" style="animation-delay: ${index * 0.1}s">
        <img src="${event.image_url || defaultImages[event.id % defaultImages.length]}" 
             alt="${escapeHtml(event.title)}" 
             style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px;"
             onerror="this.src='${defaultImages[event.id % defaultImages.length]}'">
        <div class="mini-event-info">
          <h4>${escapeHtml(event.title)}</h4>
          <p>${formatDate(event.date)}</p>
        </div>
        <button class="btn btn-primary btn-sm" onclick="registerForEvent(${event.id})">
          Register
        </button>
      </div>
    `).join('');

  animateListItems(container);
}

async function registerForEvent(eventId) {
  try {
    await RegistrationsAPI.register(eventId);
    showAlert('Success', 'Registration request submitted!', 'success');
    loadUserData();
  } catch (error) {
    showAlert('Error', error.message, 'error');
  }
}

async function cancelRegistration(eventId) {
  if (!confirm('Are you sure you want to cancel this registration?')) {
    return;
  }

  try {
    await RegistrationsAPI.cancel(eventId);
    showAlert('Cancelled', 'Registration cancelled successfully.', 'success');
    loadUserData();
  } catch (error) {
    showAlert('Error', error.message, 'error');
  }
}

function setupLogout() {
  document.getElementById('logoutBtn').addEventListener('click', (e) => {
    e.preventDefault();
    logout();
  });
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  showToast('Logged out successfully!', 'success');
  setTimeout(() => {
    window.location.href = 'index.html';
  }, 500);
}

function showAlert(title, message, type) {
  const modal = document.getElementById('alertModal');
  const content = document.getElementById('alertContent');

  const icons = {
    success: '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    error: '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    warning: '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
  };

  const colors = {
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b'
  };

  content.innerHTML = `
    <div style="text-align: center;">
      ${icons[type]}
      <h2 style="color: ${colors[type]}; margin: 20px 0 10px;">${title}</h2>
      <p style="color: var(--text-secondary); margin-bottom: 20px;">${message}</p>
      <button class="btn btn-primary" onclick="closeAlertModal()" style="min-width: 120px;">Got it</button>
    </div>
  `;

  modal.style.display = 'flex';
}

function closeAlertModal() {
  document.getElementById('alertModal').style.display = 'none';
}

function showToast(message, type) {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${message}</span>
    <button onclick="this.parentElement.remove()">×</button>
  `;
  
  const colors = {
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b'
  };
  
  toast.style.borderLeftColor = colors[type];
  document.body.appendChild(toast);
  
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function formatDate(dateString) {
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('en-US', options);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

document.querySelectorAll('.close-modal').forEach(btn => {
  btn.addEventListener('click', () => {
    btn.closest('.modal').style.display = 'none';
  });
});

window.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal')) {
    e.target.style.display = 'none';
  }
});