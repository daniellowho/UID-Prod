document.addEventListener('DOMContentLoaded', () => {
  checkAdminAuth();
  setupTabs();
  setupEventForms();
  setupEmailForm();
  setupLogout();
  loadAdminData();
  setupThemeToggle();
});

function checkAdminAuth() {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  if (user.role !== 'admin') {
    window.location.href = 'user-dashboard.html';
    return;
  }

  document.getElementById('adminName').textContent = user.name || 'Admin';
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

function setupTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.dataset.tab;
      
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      
      btn.classList.add('active');
      const content = document.getElementById(`${tabName}Tab`);
      if (content) {
        content.classList.add('active');
        content.style.animation = 'fadeIn 0.3s ease';
      }

      if (tabName === 'emails') loadEmailLogs();
    });
  });
}

function setupEventForms() {
  const createForm = document.getElementById('createEventForm');
  const editForm = document.getElementById('editEventForm');

  if (createForm) {
    createForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = createForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Creating...</span>';

      const eventData = {
        title: document.getElementById('eventTitle').value.trim(),
        date: document.getElementById('eventDate').value,
        location: document.getElementById('eventLocation').value.trim(),
        description: document.getElementById('eventDescription').value.trim(),
        start_time: document.getElementById('eventTime').value || '09:00',
        category: document.getElementById('eventCategory').value || null,
        speaker: document.getElementById('eventSpeaker') ? document.getElementById('eventSpeaker').value.trim() : null,
        max_capacity: document.getElementById('eventCapacity').value
          ? parseInt(document.getElementById('eventCapacity').value, 10)
          : null
      };

      try {
        await EventsAPI.create(eventData);
        showAlert('Success', 'Event created successfully!', 'success');
        createForm.reset();
        loadAdminData();
      } catch (error) {
        showAlert('Error', error.message, 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Create Event';
      }
    });
  }

  if (editForm) {
    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const eventId = document.getElementById('editEventId').value;
      const submitBtn = editForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Updating...</span>';

      const eventData = {
        title: document.getElementById('editEventTitle').value.trim(),
        date: document.getElementById('editEventDate').value,
        location: document.getElementById('editEventLocation').value.trim(),
        description: document.getElementById('editEventDescription').value.trim(),
        start_time: document.getElementById('editEventTime').value || '09:00',
        category: document.getElementById('editEventCategory').value || null,
        speaker: document.getElementById('editEventSpeaker') ? document.getElementById('editEventSpeaker').value.trim() : null,
        max_capacity: document.getElementById('editEventCapacity').value
          ? parseInt(document.getElementById('editEventCapacity').value, 10)
          : null
      };

      try {
        await EventsAPI.update(eventId, eventData);
        showAlert('Success', 'Event updated successfully!', 'success');
        closeModal('editEventModal');
        loadAdminData();
      } catch (error) {
        showAlert('Error', error.message, 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Update Event';
      }
    });
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
}

async function loadAdminData() {
  await Promise.all([
    loadAnalytics(),
    loadEvents(),
    loadRequests(),
    loadUsers(),
    loadEmailLogs(),
    populateUserDropdown()
  ]);
}

async function loadAnalytics() {
  try {
    const data = await AdminAPI.getAnalytics();

    animateNumber('totalUsers', data.totals.users);
    animateNumber('totalEvents', data.totals.events);
    animateNumber('totalRegistrations', data.totals.registrations);
    animateNumber('pendingRequests', data.totals.pendingRequests);
    animateNumber('approvedCount', data.totals.approved);
    animateNumber('deniedCount', data.totals.denied);

    // Event participation table
    const eventParticipation = document.getElementById('eventParticipation');
    if (data.eventParticipation && data.eventParticipation.length > 0) {
      eventParticipation.innerHTML = `
        <div class="event-stats-header">
          <div>Event</div>
          <div>Approved</div>
          <div>Pending</div>
          <div>Denied</div>
          <div>Total</div>
        </div>
        ${data.eventParticipation.map(event => `
          <div class="event-participation-item">
            <div>
              <strong>${escapeHtml(event.title)}</strong>
              <p style="font-size: 0.85rem; color: var(--text-secondary);">${formatDate(event.date)}</p>
            </div>
            <div>
              <div style="font-weight: 700; color: var(--success-color);">${event.approved_count}</div>
            </div>
            <div>
              <div style="font-weight: 700; color: var(--warning-color);">${event.pending_count}</div>
            </div>
            <div>
              <div style="font-weight: 700; color: var(--danger-color);">${event.denied_count}</div>
            </div>
            <div>
              <div style="font-weight: 700;">${event.total_registrations}</div>
            </div>
          </div>
        `).join('')}
      `;
    } else {
      eventParticipation.innerHTML = '<p>No event data available.</p>';
    }

    // Bar chart: registrations per event (CSS heights)
    renderBarChart(data.eventParticipation || []);

    // Average rating per event
    renderFeedbackByEvent(data.feedbackByEvent || []);

    // Events that exceeded capacity
    renderExceededCapacity(data.exceededCapacity || []);

    // Students without feedback
    renderNoFeedbackStudents(data.noFeedback || []);

  } catch (error) {
    console.error('Failed to load analytics:', error);
  }
}

function renderBarChart(events) {
  const container = document.getElementById('regBarChart');
  if (!container) return;

  if (!events || events.length === 0) {
    container.innerHTML = '<p style="color:var(--text-secondary);">No registration data available.</p>';
    return;
  }

  const maxVal = Math.max(...events.map(e => e.approved_count || 0), 1);
  const MAX_HEIGHT = 180; // px

  container.innerHTML = events.map(ev => {
    const count = ev.approved_count || 0;
    const barHeight = Math.max(Math.round((count / maxVal) * MAX_HEIGHT), count > 0 ? 8 : 0);
    const shortTitle = ev.title.length > 20 ? ev.title.substring(0, 18) + '…' : ev.title;
    return `
      <div class="bar-chart-bar-wrap" title="${escapeHtml(ev.title)}: ${count} approved">
        <div class="bar-chart-bar-value">${count}</div>
        <div class="bar-chart-bar" style="height:${barHeight}px;"></div>
        <div class="bar-chart-bar-label">${escapeHtml(shortTitle)}</div>
      </div>
    `;
  }).join('');
}

function renderFeedbackByEvent(feedbackData) {
  const container = document.getElementById('ratingByEvent');
  if (!container) return;

  if (!feedbackData || feedbackData.length === 0) {
    container.innerHTML = '<p style="color:var(--text-secondary);">No feedback data available yet.</p>';
    return;
  }

  container.innerHTML = `
    <div class="event-stats-header">
      <div>Event</div>
      <div>Avg Rating</div>
      <div>Responses</div>
      <div>Would Recommend</div>
    </div>
    ${feedbackData.map(fb => {
      const stars = '★'.repeat(Math.round(fb.avg_rating || 0)) + '☆'.repeat(5 - Math.round(fb.avg_rating || 0));
      const totalRec = (fb.recommend_yes || 0) + (fb.recommend_no || 0);
      const recPct = totalRec > 0 ? Math.round((fb.recommend_yes / totalRec) * 100) : null;
      return `
        <div class="event-participation-item">
          <div><strong>${escapeHtml(fb.title)}</strong></div>
          <div>
            <span style="color:#f59e0b;font-size:1rem;">${stars}</span>
            <div style="font-weight:700;">${fb.avg_rating || '—'}</div>
          </div>
          <div><div style="font-weight:700;">${fb.feedback_count}</div></div>
          <div>${recPct !== null ? `<div style="font-weight:700;color:var(--success-color);">${recPct}% yes</div>` : '<div style="color:var(--text-secondary);">N/A</div>'}</div>
        </div>
      `;
    }).join('')}
  `;
}

function renderExceededCapacity(events) {
  const container = document.getElementById('exceededCapacityList');
  if (!container) return;

  if (!events || events.length === 0) {
    container.innerHTML = '<p style="color:var(--text-secondary);">No events have reached full capacity.</p>';
    return;
  }

  container.innerHTML = `
    <div class="event-stats-header">
      <div>Event</div>
      <div>Capacity</div>
      <div>Approved</div>
      <div>Status</div>
    </div>
    ${events.map(ev => `
      <div class="event-participation-item">
        <div><strong>${escapeHtml(ev.title)}</strong></div>
        <div><div style="font-weight:700;">${ev.max_capacity}</div></div>
        <div><div style="font-weight:700;color:var(--danger-color);">${ev.approved_count}</div></div>
        <div><span class="status-badge status-denied">Full</span></div>
      </div>
    `).join('')}
  `;
}

function renderNoFeedbackStudents(students) {
  const container = document.getElementById('noFeedbackList');
  if (!container) return;

  if (!students || students.length === 0) {
    container.innerHTML = '<p style="color:var(--text-secondary);">All registered students have submitted feedback.</p>';
    return;
  }

  container.innerHTML = `
    <div class="event-stats-header" style="grid-template-columns:2fr 2fr 1fr;">
      <div>Student</div>
      <div>Event</div>
      <div>Event Date</div>
    </div>
    ${students.map(s => `
      <div class="event-participation-item" style="grid-template-columns:2fr 2fr 1fr;">
        <div>
          <strong>${escapeHtml(s.name)}</strong>
          <p style="font-size:0.8rem;color:var(--text-secondary);">${escapeHtml(s.email)}${s.roll_number ? ' · ' + escapeHtml(s.roll_number) : ''}${s.department ? ' · ' + escapeHtml(s.department) : ''}</p>
        </div>
        <div><strong>${escapeHtml(s.event_title)}</strong></div>
        <div>${formatDate(s.event_date)}</div>
      </div>
    `).join('')}
  `;
}

function animateNumber(elementId, target) {
  const element = document.getElementById(elementId);
  if (!element) return;
  
  const duration = 800;
  const start = parseInt(element.textContent) || 0;
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

async function loadEvents() {
  try {
    const events = await EventsAPI.getAll();
    const container = document.getElementById('adminEventsList');

    if (!events || events.length === 0) {
      container.innerHTML = '<p class="no-events">No events created yet.</p>';
      return;
    }

    container.innerHTML = events.map((event, index) => {
      const categoryLabels = {
        conference: 'Conference', workshop: 'Workshop', hackathon: 'Hackathon',
        seminar: 'Seminar', networking: 'Networking', other: 'Other'
      };
      const categoryBadge = event.category
        ? `<span class="event-category-badge category-${event.category}" style="font-size:0.65rem;padding:2px 8px;margin-right:8px;">${categoryLabels[event.category] || event.category}</span>`
        : '';
      const capacity = event.max_capacity;
      const approved = event.participants_count || 0;
      const isFull = capacity && approved >= capacity;
      const capacityLabel = capacity
        ? `<span style="font-size:0.8rem;color:${isFull ? 'var(--danger-color)' : 'var(--text-secondary)'};">${approved}/${capacity} seats${isFull ? ' · Full' : ''}</span>`
        : '';

      return `
        <div class="admin-event-item" style="animation-delay: ${index * 0.05}s">
          <div class="admin-event-info">
            <div style="display:flex;align-items:center;flex-wrap:wrap;gap:4px;margin-bottom:4px;">
              ${categoryBadge}
              <h4 style="margin:0;">${escapeHtml(event.title)}</h4>
            </div>
            <p style="margin:0;">${formatDate(event.date)}${event.start_time ? ' · ' + formatTime(event.start_time) : ''} · ${escapeHtml(event.location || 'TBD')} ${capacityLabel}</p>
          </div>
          <div class="admin-event-actions">
            <button class="btn btn-warning btn-sm" onclick="editEvent(${event.id})">
              Edit
            </button>
            <button class="btn btn-danger btn-sm" onclick="deleteEvent(${event.id})">
              Delete
            </button>
          </div>
        </div>
      `;
    }).join('');
  } catch (error) {
    console.error('Failed to load events:', error);
  }
}

async function loadRequests() {
  try {
    const registrations = await RegistrationsAPI.getAll();
    const container = document.getElementById('requestsList');
    const statusFilter = document.getElementById('statusFilter').value;

    let filtered = registrations;
    if (statusFilter !== 'all') {
      filtered = registrations.filter(r => r.status === statusFilter);
    }

    if (!filtered || filtered.length === 0) {
      container.innerHTML = '<p class="no-events">No registration requests found.</p>';
      return;
    }

    container.innerHTML = filtered.map((reg, index) => `
      <div class="request-item" style="animation-delay: ${index * 0.05}s; border-left-color: ${getStatusColor(reg.status)}">
        <div class="request-header">
          <div class="request-info">
            <h4>${escapeHtml(reg.user_name)}</h4>
            <p>${escapeHtml(reg.user_email)}</p>
          </div>
          <span class="status-badge status-${reg.status}">${reg.status}</span>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div class="request-info">
            <strong>${escapeHtml(reg.event_title)}</strong>
            <p>${formatDate(reg.event_date)}</p>
          </div>
          ${reg.status === 'pending' ? `
            <div class="request-actions">
              <button class="btn btn-success btn-sm" onclick="updateRequestStatus(${reg.id}, 'approved', this)">
                Approve
              </button>
              <button class="btn btn-danger btn-sm" onclick="updateRequestStatus(${reg.id}, 'denied', this)">
                Deny
              </button>
            </div>
          ` : ''}
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Failed to load requests:', error);
  }
}

async function loadUsers() {
  try {
    const users = await AdminAPI.getUsers();
    const container = document.getElementById('usersList');

    if (!users || users.length === 0) {
      container.innerHTML = '<p class="no-events">No users found.</p>';
      return;
    }

    container.innerHTML = users.map((user, index) => `
      <div class="user-item" style="animation-delay: ${index * 0.05}s">
        <div class="user-info">
          <h4>${escapeHtml(user.name)}</h4>
          <p>${escapeHtml(user.email)}${user.roll_number ? ' · ' + escapeHtml(user.roll_number) : ''}${user.department ? ' · ' + escapeHtml(user.department) : ''}</p>
        </div>
        <div style="text-align: right;">
          <p><strong>${user.registration_count || 0}</strong> registrations</p>
          <p><strong>${user.approved_count || 0}</strong> approved</p>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Failed to load users:', error);
  }
}

function getStatusColor(status) {
  const colors = {
    pending: '#f59e0b',
    approved: '#10b981',
    denied: '#ef4444'
  };
  return colors[status] || '#6366f1';
}

async function editEvent(eventId) {
  try {
    const event = await EventsAPI.getById(eventId);

    document.getElementById('editEventId').value = event.id;
    document.getElementById('editEventTitle').value = event.title;
    document.getElementById('editEventDate').value = event.date.split('T')[0];
    document.getElementById('editEventLocation').value = event.location || '';
    document.getElementById('editEventDescription').value = event.description || '';
    document.getElementById('editEventTime').value = event.start_time
      ? event.start_time.substring(0, 5)
      : '09:00';
    document.getElementById('editEventCategory').value = event.category || '';
    document.getElementById('editEventCapacity').value = event.max_capacity || '';
    const speakerEl = document.getElementById('editEventSpeaker');
    if (speakerEl) speakerEl.value = event.speaker || '';

    document.getElementById('editEventModal').style.display = 'flex';
  } catch (error) {
    showAlert('Error', error.message, 'error');
  }
}

async function deleteEvent(eventId) {
  if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
    return;
  }

  try {
    await EventsAPI.delete(eventId);
    showAlert('Deleted', 'Event deleted successfully!', 'success');
    loadAdminData();
  } catch (error) {
    showAlert('Error', error.message, 'error');
  }
}

async function updateRequestStatus(registrationId, status, btn) {
  btn.disabled = true;
  btn.innerHTML = '<span>Updating...</span>';

  try {
    await RegistrationsAPI.updateStatus(registrationId, status);
    showAlert('Updated', `Request ${status} successfully!`, 'success');
    loadAdminData();
  } catch (error) {
    showAlert('Error', error.message, 'error');
    btn.disabled = false;
    btn.innerHTML = status === 'approved' ? 'Approve' : 'Deny';
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

function closeModal(modalId) {
  document.getElementById(modalId).style.display = 'none';
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

function formatTime(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
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

document.getElementById('statusFilter')?.addEventListener('change', loadRequests);

// ─── Email Management ─────────────────────────────────────────────────────────

let _allUsers = [];

async function loadEmailLogs() {
  const container = document.getElementById('emailLogsList');
  if (!container) return;

  try {
    const logs = await AdminAPI.getEmailLogs();
    const typeFilter = document.getElementById('emailTypeFilter')?.value || 'all';
    const statusFilter = document.getElementById('emailStatusFilter')?.value || 'all';

    let filtered = logs;
    if (typeFilter !== 'all') filtered = filtered.filter(l => l.email_type === typeFilter);
    if (statusFilter !== 'all') filtered = filtered.filter(l => l.status === statusFilter);

    if (!filtered || filtered.length === 0) {
      container.innerHTML = '<p class="no-events">No email records found.</p>';
      return;
    }

    const typeLabels = {
      welcome: '👋 Welcome',
      qr_code: '🎟️ QR Pass',
      reminder: '⏰ Reminder',
      thank_you: '🎊 Thank You',
      custom: '📬 Custom'
    };

    container.innerHTML = `
      <div class="email-log-header" style="display:grid;grid-template-columns:2fr 2fr 1fr 1fr 1.5fr;gap:8px;padding:10px 16px;font-size:12px;text-transform:uppercase;letter-spacing:1px;color:var(--text-secondary);font-weight:600;border-bottom:1px solid var(--border-color);">
        <div>Recipient</div>
        <div>Subject</div>
        <div>Type</div>
        <div>Status</div>
        <div>Sent At</div>
      </div>
      ${filtered.map((log, index) => `
        <div class="email-log-item" style="display:grid;grid-template-columns:2fr 2fr 1fr 1fr 1.5fr;gap:8px;padding:12px 16px;border-bottom:1px solid var(--border-color);font-size:14px;animation-delay:${index * 0.03}s;" title="${log.error_message ? escapeHtml(log.error_message) : ''}">
          <div>
            <div style="font-weight:600;color:var(--text-primary);">${escapeHtml(log.recipient_name || '—')}</div>
            <div style="font-size:12px;color:var(--text-secondary);">${escapeHtml(log.recipient_email)}</div>
          </div>
          <div style="color:var(--text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHtml(log.subject || '')}">${escapeHtml(log.subject || '—')}</div>
          <div><span style="background:var(--card-bg);border:1px solid var(--border-color);padding:2px 8px;border-radius:99px;font-size:12px;white-space:nowrap;">${typeLabels[log.email_type] || log.email_type}</span></div>
          <div><span style="color:${log.status === 'sent' ? 'var(--success-color)' : 'var(--danger-color)'};font-weight:700;">${log.status === 'sent' ? '✓ Sent' : '✗ Failed'}</span></div>
          <div style="color:var(--text-secondary);font-size:12px;">${new Date(log.sent_at).toLocaleString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}</div>
        </div>
      `).join('')}
    `;
  } catch (error) {
    console.error('Failed to load email logs:', error);
    if (container) container.innerHTML = '<p class="no-events">Failed to load email logs.</p>';
  }
}

async function populateUserDropdown() {
  try {
    if (_allUsers.length === 0) {
      _allUsers = await AdminAPI.getUsers();
    }
    const select = document.getElementById('emailRecipients');
    if (!select) return;

    // Preserve first "All Users" option
    select.innerHTML = '<option value="all">All Users</option>';
    _allUsers.forEach(user => {
      const opt = document.createElement('option');
      opt.value = user.id;
      opt.textContent = `${user.name} (${user.email})`;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error('Failed to populate user dropdown:', err);
  }
}

function openComposeModal() {
  populateUserDropdown();
  document.getElementById('composeEmailForm')?.reset();
  document.getElementById('composeEmailModal').style.display = 'flex';
}

function setupEmailForm() {
  const form = document.getElementById('composeEmailForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('sendEmailBtn');
    btn.disabled = true;
    btn.innerHTML = 'Sending…';

    const recipientValue = document.getElementById('emailRecipients').value;
    const subject = document.getElementById('emailSubject').value.trim();
    const message = document.getElementById('emailMessage').value.trim();

    const payload = {
      recipients: recipientValue === 'all' ? 'all' : [parseInt(recipientValue, 10)],
      subject,
      message
    };

    try {
      const result = await AdminAPI.sendEmail(payload);
      closeModal('composeEmailModal');
      showAlert('Email Sent', result.message, 'success');
      loadEmailLogs();
    } catch (error) {
      showAlert('Error', error.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = 'Send Email';
    }
  });
}

document.getElementById('emailTypeFilter')?.addEventListener('change', loadEmailLogs);
document.getElementById('emailStatusFilter')?.addEventListener('change', loadEmailLogs);