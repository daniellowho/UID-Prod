document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  if (token && user) {
    const role = user.role;
    window.location.href = role === 'admin' ? 'admin.html' : 'user-dashboard.html';
    return;
  }

  loadEvents();
  setupModals();
  setupScrollAnimations();
  setupNavigation();
});

async function loadEvents() {
  const grid = document.getElementById('eventsGrid');
  grid.innerHTML = '<div class="loading">Loading events...</div>';

  try {
    const events = await EventsAPI.getAll();
    displayEvents(events);
    animateEventCards();
  } catch (error) {
    console.error('Failed to load events:', error);
    grid.innerHTML = `
      <div class="error-message" style="grid-column: 1/-1; text-align: center; padding: 40px;">
        Failed to load events. Please check your connection and try again.<br>
        <button class="btn btn-primary" onclick="loadEvents()" style="margin-top: 15px;">Retry</button>
      </div>
    `;
  }
}

function displayEvents(events) {
  const grid = document.getElementById('eventsGrid');

  if (!events || events.length === 0) {
    grid.innerHTML = '<p class="no-events">No events available at the moment. Check back soon!</p>';
    return;
  }

  const defaultImages = [
    'https://images.unsplash.com/photo-1518779578993-ec3579fee39f?w=400&h=200&fit=crop',
    'https://images.unsplash.com/photo-1517697471339-43c9d7c9a45c?w=400&h=200&fit=crop',
    'https://images.unsplash.com/photo-1526378722484-6f9f1f0f7f1f?w=400&h=200&fit=crop',
    'https://images.unsplash.com/photo-1515879216487-1a1323ba1a45?w=400&h=200&fit=crop',
    'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&h=200&fit=crop'
  ];

  grid.innerHTML = events.map((event, index) => {
    const imageIndex = event.id % defaultImages.length;
    const imageUrl = event.image_url || defaultImages[imageIndex];

    return `
      <div class="event-card" style="animation-delay: ${index * 0.1}s" data-event-id="${event.id}" onclick="openEventDetail(${event.id})">
        <div class="event-header">
          <h3>${escapeHtml(event.title)}</h3>
          <div class="event-meta">
            <span>${formatDate(event.date)}</span>
            <span>${escapeHtml(event.location || 'TBD')}</span>
          </div>
        </div>
        <div class="event-body">
          <p class="event-description">${escapeHtml(event.description || 'No description available')}</p>
          <div class="event-footer">
            <span class="participants">${event.participants_count || 0} participants</span>
            <button class="btn btn-primary btn-sm register-btn" onclick="event.stopPropagation(); handleRegisterClick(${event.id})">
              Register
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function animateEventCards() {
  const cards = document.querySelectorAll('.event-card');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }, index * 100);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  cards.forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(30px)';
    observer.observe(card);
  });
}

function setupModals() {
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

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
      });
    }
  });
}

function setupScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.animate-on-scroll').forEach(el => {
    observer.observe(el);
  });
}

function setupNavigation() {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userInfo = document.getElementById('userInfo');
  const loginLink = document.getElementById('loginLink');
  const signupLink = document.getElementById('signupLink');
  const dashboardLink = document.getElementById('dashboardLink');
  const profileLink = document.getElementById('profileLink');
  const adminLink = document.getElementById('adminLink');

  if (token && user) {
    if (userInfo) {
      userInfo.style.display = 'flex';
      const userNameEl = document.getElementById('userName');
      if (userNameEl) userNameEl.textContent = user.name || 'User';
    }
    
    if (loginLink) loginLink.style.display = 'none';
    if (signupLink) signupLink.style.display = 'none';
    
    if (dashboardLink) dashboardLink.style.display = 'block';
    if (profileLink) profileLink.style.display = 'block';
    
    if (user.role === 'admin' && adminLink) {
      adminLink.style.display = 'block';
    }

    document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.reload();
    });
  }
}

function handleRegisterClick(eventId) {
  const token = localStorage.getItem('token');

  if (!token) {
    document.getElementById('authModal').style.display = 'flex';
    return;
  }

  registerForEvent(eventId);
}

async function registerForEvent(eventId) {
  const btn = document.querySelector(`[data-event-id="${eventId}"] .register-btn`);
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span>Registering...</span>';
  }

  try {
    const result = await RegistrationsAPI.register(eventId);
    showAlert('Registration Successful!', result.message, 'success');
    
    if (btn) {
      btn.innerHTML = '<span>Registered!</span>';
      btn.classList.remove('btn-primary');
      btn.classList.add('btn-success');
    }
  } catch (error) {
    if (error.message.includes('Already registered')) {
      showAlert('Already Registered', error.message, 'warning');
    } else {
      showAlert('Registration Failed', error.message, 'error');
    }
    
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span>Register</span>';
    }
  }
}

function showAlert(title, message, type) {
  const modal = document.getElementById('eventModal');
  const content = document.getElementById('eventModalContent');

  const icons = {
    success: '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    warning: '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    error: '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>'
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
      <button class="btn btn-primary" onclick="closeModal('eventModal')" style="min-width: 120px;">Got it</button>
    </div>
  `;

  modal.style.display = 'flex';
  modal.style.animation = 'scaleIn 0.3s ease';
}

function closeModal(modalId) {
  document.getElementById(modalId).style.display = 'none';
}

function openEventDetail(eventId) {
  window.location.href = `event-detail.html?id=${eventId}`;
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