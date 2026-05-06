let allAdminEvents = [];
let _allUsers = [];

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
  if (!token) { window.location.href = 'login.html'; return; }
  if (user.role !== 'admin') { window.location.href = 'user-dashboard.html'; return; }
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
    const cur = document.documentElement.getAttribute('data-theme');
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    updateThemeIcon(next, sunIcon, moonIcon);
  });
}

function updateThemeIcon(theme, s, m) {
  if (s && m) { s.style.display = theme === 'dark' ? 'none' : 'block'; m.style.display = theme === 'dark' ? 'block' : 'none'; }
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
      if (content) { content.classList.add('active'); content.style.animation = 'fadeIn 0.3s ease'; }
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
      submitBtn.disabled = true; submitBtn.innerHTML = 'Creating...';
      const eventData = {
        title: document.getElementById('eventTitle').value.trim(),
        date: document.getElementById('eventDate').value,
        location: document.getElementById('eventLocation').value.trim(),
        description: document.getElementById('eventDescription').value.trim(),
        start_time: document.getElementById('eventTime').value || '09:00',
        category: document.getElementById('eventCategory').value || null,
        speaker: document.getElementById('eventSpeaker')?.value.trim() || null,
        max_capacity: document.getElementById('eventCapacity').value ? parseInt(document.getElementById('eventCapacity').value, 10) : null
      };
      try { await EventsAPI.create(eventData); showAlert('Success', 'Event created!', 'success'); createForm.reset(); loadAdminData(); }
      catch (error) { showAlert('Error', error.message, 'error'); }
      finally { submitBtn.disabled = false; submitBtn.innerHTML = 'Create Event'; }
    });
  }

  if (editForm) {
    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const eventId = document.getElementById('editEventId').value;
      const submitBtn = editForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true; submitBtn.innerHTML = 'Updating...';
      const eventData = {
        title: document.getElementById('editEventTitle').value.trim(),
        date: document.getElementById('editEventDate').value,
        location: document.getElementById('editEventLocation').value.trim(),
        description: document.getElementById('editEventDescription').value.trim(),
        start_time: document.getElementById('editEventTime').value || '09:00',
        category: document.getElementById('editEventCategory').value || null,
        speaker: document.getElementById('editEventSpeaker')?.value.trim() || null,
        max_capacity: document.getElementById('editEventCapacity').value ? parseInt(document.getElementById('editEventCapacity').value, 10) : null
      };
      try { await EventsAPI.update(eventId, eventData); showAlert('Success', 'Event updated!', 'success'); closeModal('editEventModal'); loadAdminData(); }
      catch (error) { showAlert('Error', error.message, 'error'); }
      finally { submitBtn.disabled = false; submitBtn.innerHTML = 'Update Event'; }
    });
  }

  document.querySelectorAll('.close-modal').forEach(btn => { btn.addEventListener('click', () => { btn.closest('.modal').style.display = 'none'; }); });
  window.addEventListener('click', (e) => { if (e.target.classList.contains('modal')) e.target.style.display = 'none'; });
}

async function loadAdminData() {
  await Promise.all([loadAnalytics(), loadEvents(), loadRequests(), loadUsers(), loadEmailLogs(), populateUserDropdown()]);
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

    const ep = document.getElementById('eventParticipation');
    if (data.eventParticipation && data.eventParticipation.length > 0) {
      ep.innerHTML = `<div class="event-stats-header"><div>Event</div><div>Approved</div><div>Pending</div><div>Denied</div><div>Total</div></div>` +
        data.eventParticipation.map(e => `<div class="event-participation-item"><div><strong>${escapeHtml(e.title)}</strong><p style="font-size:.85rem;color:var(--text-secondary);">${formatDate(e.date)}</p></div><div style="font-weight:700;color:var(--success-color);">${e.approved_count}</div><div style="font-weight:700;color:var(--warning-color);">${e.pending_count}</div><div style="font-weight:700;color:var(--danger-color);">${e.denied_count}</div><div style="font-weight:700;">${e.total_registrations}</div></div>`).join('');
    } else { ep.innerHTML = '<p>No event data available.</p>'; }

    renderBarChart(data.eventParticipation || []);
    renderFeedbackByEvent(data.feedbackByEvent || []);
    renderExceededCapacity(data.exceededCapacity || []);
    renderNoFeedbackStudents(data.noFeedback || []);
  } catch (error) { console.error('Failed to load analytics:', error); }
}

function renderBarChart(events) {
  const c = document.getElementById('regBarChart'); if (!c) return;
  if (!events || events.length === 0) { c.innerHTML = '<p style="color:var(--text-secondary);">No registration data.</p>'; return; }
  const maxVal = Math.max(...events.map(e => e.approved_count || 0), 1);
  c.innerHTML = events.map(ev => {
    const count = ev.approved_count || 0;
    const h = Math.max(Math.round((count / maxVal) * 180), count > 0 ? 8 : 0);
    const t = ev.title.length > 20 ? ev.title.substring(0, 18) + '…' : ev.title;
    return `<div class="bar-chart-bar-wrap" title="${escapeHtml(ev.title)}: ${count}"><div class="bar-chart-bar-value">${count}</div><div class="bar-chart-bar" style="height:${h}px;"></div><div class="bar-chart-bar-label">${escapeHtml(t)}</div></div>`;
  }).join('');
}

function renderFeedbackByEvent(fb) {
  const c = document.getElementById('ratingByEvent'); if (!c) return;
  if (!fb || fb.length === 0) { c.innerHTML = '<p style="color:var(--text-secondary);">No feedback data yet.</p>'; return; }
  c.innerHTML = `<div class="event-stats-header"><div>Event</div><div>Avg Rating</div><div>Responses</div><div>Would Recommend</div></div>` +
    fb.map(f => {
      const stars = '★'.repeat(Math.round(f.avg_rating || 0)) + '☆'.repeat(5 - Math.round(f.avg_rating || 0));
      const tot = (f.recommend_yes || 0) + (f.recommend_no || 0);
      const pct = tot > 0 ? Math.round((f.recommend_yes / tot) * 100) : null;
      return `<div class="event-participation-item"><div><strong>${escapeHtml(f.title)}</strong></div><div><span style="color:#f59e0b;">${stars}</span><div style="font-weight:700;">${f.avg_rating || '—'}</div></div><div style="font-weight:700;">${f.feedback_count}</div><div>${pct !== null ? `<span style="font-weight:700;color:var(--success-color);">${pct}% yes</span>` : '<span style="color:var(--text-secondary);">N/A</span>'}</div></div>`;
    }).join('');
}

function renderExceededCapacity(events) {
  const c = document.getElementById('exceededCapacityList'); if (!c) return;
  if (!events || events.length === 0) { c.innerHTML = '<p style="color:var(--text-secondary);">No events at full capacity.</p>'; return; }
  c.innerHTML = `<div class="event-stats-header"><div>Event</div><div>Capacity</div><div>Approved</div><div>Status</div></div>` +
    events.map(e => `<div class="event-participation-item"><div><strong>${escapeHtml(e.title)}</strong></div><div style="font-weight:700;">${e.max_capacity}</div><div style="font-weight:700;color:var(--danger-color);">${e.approved_count}</div><div><span class="status-badge status-denied">Full</span></div></div>`).join('');
}

function renderNoFeedbackStudents(students) {
  const c = document.getElementById('noFeedbackList'); if (!c) return;
  if (!students || students.length === 0) { c.innerHTML = '<p style="color:var(--text-secondary);">All registered students have submitted feedback.</p>'; return; }
  c.innerHTML = `<div class="event-stats-header" style="grid-template-columns:2fr 2fr 1fr;"><div>Student</div><div>Event</div><div>Event Date</div></div>` +
    students.map(s => `<div class="event-participation-item" style="grid-template-columns:2fr 2fr 1fr;"><div><strong>${escapeHtml(s.name)}</strong><p style="font-size:.8rem;color:var(--text-secondary);">${escapeHtml(s.email)}${s.roll_number ? ' · ' + escapeHtml(s.roll_number) : ''}${s.department ? ' · ' + escapeHtml(s.department) : ''}</p></div><div><strong>${escapeHtml(s.event_title)}</strong></div><div>${formatDate(s.event_date)}</div></div>`).join('');
}

function animateNumber(id, target) {
  const el = document.getElementById(id); if (!el) return;
  const dur = 800, start = parseInt(el.textContent) || 0, st = performance.now();
  function upd(t) { const p = Math.min((t - st) / dur, 1); el.textContent = Math.round(start + (target - start) * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(upd); }
  requestAnimationFrame(upd);
}

async function loadEvents() {
  try {
    const events = await EventsAPI.getAll();
    allAdminEvents = events || [];
    const container = document.getElementById('adminEventsList');
    if (!allAdminEvents.length) { container.innerHTML = '<p class="no-events">No events created yet.</p>'; return; }

    const sorted = [...allAdminEvents].sort((a, b) => new Date(b.date) - new Date(a.date));
    const catLabels = { conference:'Conference', workshop:'Workshop', hackathon:'Hackathon', seminar:'Seminar', networking:'Networking', technical:'Technical', cultural:'Cultural', ai:'AI/ML', other:'Other' };

    container.innerHTML = sorted.map((event, i) => {
      const badge = event.category ? `<span class="event-category-badge category-${event.category}" style="font-size:.65rem;padding:2px 8px;margin-right:8px;">${catLabels[event.category] || event.category}</span>` : '';
      const cap = event.max_capacity;
      const appr = event.participants_count || 0;
      const isFull = cap && appr >= cap;
      const capLabel = cap ? `<span style="font-size:.8rem;color:${isFull ? 'var(--danger-color)' : 'var(--text-secondary)'};">${appr}/${cap}${isFull ? ' · Full' : ''}</span>` : '';
      const isPast = new Date(event.date) < new Date();
      const statusLabel = isPast ? '<span style="color:var(--text-secondary);font-size:.8rem;background:rgba(107,114,128,.15);padding:2px 8px;border-radius:4px;margin-left:8px;">Completed</span>' : '<span style="color:var(--success-color);font-size:.8rem;background:rgba(16,185,129,.15);padding:2px 8px;border-radius:4px;margin-left:8px;">Upcoming</span>';
      return `<div class="admin-event-item" style="animation-delay:${i * 0.05}s"><div class="admin-event-info"><div style="display:flex;align-items:center;flex-wrap:wrap;gap:4px;margin-bottom:4px;">${badge}<h4 style="margin:0;">${escapeHtml(event.title)}</h4></div><p style="margin:0;">${formatDate(event.date)}${event.start_time ? ' · ' + formatTime(event.start_time) : ''} · ${escapeHtml(event.location || 'TBD')} ${capLabel} ${statusLabel}</p></div><div class="admin-event-actions"><button class="btn btn-warning btn-sm" onclick="editEvent(${event.id})">Edit</button><button class="btn btn-danger btn-sm" onclick="deleteEvent(${event.id})">Delete</button></div></div>`;
    }).join('');

    populateEventFilter(allAdminEvents);
  } catch (error) { console.error('Failed to load events:', error); }
}

async function loadRequests() {
  try {
    const registrations = await RegistrationsAPI.getAll();
    const container = document.getElementById('requestsList');
    const sf = document.getElementById('statusFilter').value;
    const ef = document.getElementById('eventFilter').value;
    let filtered = registrations;
    if (sf !== 'all') filtered = filtered.filter(r => r.status === sf);
    if (ef !== 'all') filtered = filtered.filter(r => String(r.event_id) === ef);
    if (!filtered.length) { container.innerHTML = '<p class="no-events">No registration requests found.</p>'; return; }
    container.innerHTML = filtered.map((reg, i) => `<div class="request-item" style="animation-delay:${i * 0.05}s;border-left-color:${getStatusColor(reg.status)}"><div class="request-header"><div class="request-info"><h4>${escapeHtml(reg.user_name)}</h4><p>${escapeHtml(reg.user_email)}</p></div><span class="status-badge status-${reg.status}">${reg.status}</span></div><div style="display:flex;justify-content:space-between;align-items:center;"><div class="request-info"><strong>${escapeHtml(reg.event_title)}</strong><p>${formatDate(reg.event_date)}</p></div>${reg.status === 'pending' ? `<div class="request-actions"><button class="btn btn-success btn-sm" onclick="updateRequestStatus(${reg.id},'approved',this)">Approve</button><button class="btn btn-danger btn-sm" onclick="updateRequestStatus(${reg.id},'denied',this)">Deny</button></div>` : ''}</div></div>`).join('');
  } catch (error) { console.error('Failed to load requests:', error); }
}

async function loadUsers() {
  try {
    const users = await AdminAPI.getUsers();
    _allUsers = users || [];
    populateDeptFilter(_allUsers);
    displayFilteredUsers();
  } catch (error) { console.error('Failed to load users:', error); }
}

function populateDeptFilter(users) {
  const df = document.getElementById('userDeptFilter'); if (!df) return;
  const current = df.value;
  const depts = [...new Set(users.map(u => u.department).filter(Boolean))].sort();
  df.innerHTML = '<option value="all">All Departments</option>';
  depts.forEach(d => { const o = document.createElement('option'); o.value = d; o.textContent = d; df.appendChild(o); });
  if (current && df.querySelector(`option[value="${current}"]`)) df.value = current;
}

function displayFilteredUsers() {
  const container = document.getElementById('usersList');
  const search = (document.getElementById('userSearchInput')?.value || '').toLowerCase().trim();
  const roleFilter = document.getElementById('userRoleFilter')?.value || 'all';
  const deptFilter = document.getElementById('userDeptFilter')?.value || 'all';
  const sortBy = document.getElementById('userSortSelect')?.value || 'newest';

  let filtered = [..._allUsers];

  // Search filter
  if (search) {
    filtered = filtered.filter(u =>
      (u.name || '').toLowerCase().includes(search) ||
      (u.email || '').toLowerCase().includes(search) ||
      (u.roll_number || '').toLowerCase().includes(search) ||
      (u.department || '').toLowerCase().includes(search)
    );
  }

  // Role filter
  if (roleFilter !== 'all') {
    filtered = filtered.filter(u => u.role === roleFilter);
  }

  // Department filter
  if (deptFilter !== 'all') {
    filtered = filtered.filter(u => u.department === deptFilter);
  }

  // Sort
  switch (sortBy) {
    case 'oldest': filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)); break;
    case 'name-asc': filtered.sort((a, b) => (a.name || '').localeCompare(b.name || '')); break;
    case 'name-desc': filtered.sort((a, b) => (b.name || '').localeCompare(a.name || '')); break;
    case 'regs-desc': filtered.sort((a, b) => (b.registration_count || 0) - (a.registration_count || 0)); break;
    default: filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); break;
  }

  // Update counter
  const counter = document.getElementById('usersCount');
  if (counter) counter.textContent = `Showing ${filtered.length} of ${_allUsers.length} user${_allUsers.length !== 1 ? 's' : ''}`;

  if (!filtered.length) {
    container.innerHTML = '<p class="no-events">No users match your filters.</p>';
    return;
  }

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  container.innerHTML = filtered.map((u, i) => {
    const isSelf = u.id === currentUser.id;
    const roleBadge = u.role === 'admin'
      ? '<span style="background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;padding:3px 10px;border-radius:20px;font-size:0.7rem;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;">Admin</span>'
      : '<span style="background:rgba(16,185,129,0.15);color:var(--success-color);padding:3px 10px;border-radius:20px;font-size:0.7rem;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;">User</span>';

    const deptBadge = u.department
      ? `<span style="background:var(--card-bg);border:1px solid var(--border-color);padding:2px 8px;border-radius:99px;font-size:0.75rem;color:var(--text-secondary);">${escapeHtml(u.department)}</span>`
      : '';

    const joinDate = u.created_at ? new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

    const toggleRoleBtn = isSelf
      ? ''
      : `<button class="btn btn-sm" style="font-size:0.75rem;padding:5px 12px;background:var(--card-bg);border:1px solid var(--border-color);color:var(--text-primary);border-radius:6px;cursor:pointer;" onclick="toggleUserRole(${u.id}, '${u.role}')" title="${u.role === 'admin' ? 'Demote to User' : 'Promote to Admin'}">${u.role === 'admin' ? '⬇ Demote' : '⬆ Promote'}</button>`;

    const deleteBtn = isSelf
      ? ''
      : `<button class="btn btn-danger btn-sm" style="font-size:0.75rem;padding:5px 12px;" onclick="deleteUserAccount(${u.id}, '${escapeHtml(u.name).replace(/'/g, "\\'")}')" title="Delete this user's account">🗑 Delete</button>`;

    return `<div class="user-item" style="animation-delay:${i * 0.05}s">
      <div class="user-info" style="flex:1;min-width:0;">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px;">
          <h4 style="margin:0;">${escapeHtml(u.name)}${isSelf ? ' <span style="font-size:0.7rem;color:var(--primary-color);">(you)</span>' : ''}</h4>
          ${roleBadge}
          ${deptBadge}
        </div>
        <p style="margin:0;font-size:0.85rem;color:var(--text-secondary);">
          ${escapeHtml(u.email)}${u.roll_number ? ' · ' + escapeHtml(u.roll_number) : ''}${joinDate ? ' · Joined ' + joinDate : ''}
        </p>
      </div>
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
        <div style="text-align:right;min-width:80px;">
          <p style="margin:0;font-size:0.85rem;"><strong>${u.registration_count || 0}</strong> regs</p>
          <p style="margin:0;font-size:0.85rem;color:var(--success-color);"><strong>${u.approved_count || 0}</strong> approved</p>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          ${toggleRoleBtn}
          ${deleteBtn}
        </div>
      </div>
    </div>`;
  }).join('');
}

async function toggleUserRole(userId, currentRole) {
  const newRole = currentRole === 'admin' ? 'user' : 'admin';
  const action = newRole === 'admin' ? 'promote to Admin' : 'demote to User';
  if (!confirm(`Are you sure you want to ${action} this user?`)) return;
  try {
    const result = await AdminAPI.updateUserRole(userId, newRole);
    showAlert('Role Updated', result.message, 'success');
    loadUsers();
  } catch (error) {
    showAlert('Error', error.message, 'error');
  }
}

async function deleteUserAccount(userId, userName) {
  if (!confirm(`⚠️ Are you sure you want to permanently delete "${userName}"?\n\nThis will also remove all their registrations, feedback, and attendance records. This action cannot be undone.`)) return;
  try {
    const result = await AdminAPI.deleteUser(userId);
    showAlert('User Deleted', result.message, 'success');
    loadAdminData();
  } catch (error) {
    showAlert('Error', error.message, 'error');
  }
}

function getStatusColor(s) { return { pending: '#f59e0b', approved: '#10b981', denied: '#ef4444' }[s] || '#6366f1'; }

async function editEvent(eventId) {
  try {
    const e = await EventsAPI.getById(eventId);
    document.getElementById('editEventId').value = e.id;
    document.getElementById('editEventTitle').value = e.title;
    document.getElementById('editEventDate').value = e.date.split('T')[0];
    document.getElementById('editEventLocation').value = e.location || '';
    document.getElementById('editEventDescription').value = e.description || '';
    document.getElementById('editEventTime').value = e.start_time ? e.start_time.substring(0, 5) : '09:00';
    document.getElementById('editEventCategory').value = e.category || '';
    document.getElementById('editEventCapacity').value = e.max_capacity || '';
    const sp = document.getElementById('editEventSpeaker'); if (sp) sp.value = e.speaker || '';
    document.getElementById('editEventModal').style.display = 'flex';
  } catch (error) { showAlert('Error', error.message, 'error'); }
}

async function deleteEvent(eventId) {
  if (!confirm('Delete this event? This cannot be undone.')) return;
  try { await EventsAPI.delete(eventId); showAlert('Deleted', 'Event deleted!', 'success'); loadAdminData(); }
  catch (error) { showAlert('Error', error.message, 'error'); }
}

async function updateRequestStatus(regId, status, btn) {
  btn.disabled = true; btn.innerHTML = 'Updating...';
  try { await RegistrationsAPI.updateStatus(regId, status); showAlert('Updated', `Request ${status}!`, 'success'); loadAdminData(); }
  catch (error) { showAlert('Error', error.message, 'error'); btn.disabled = false; btn.innerHTML = status === 'approved' ? 'Approve' : 'Deny'; }
}

function populateEventFilter(events) {
  const ef = document.getElementById('eventFilter'); if (!ef) return;
  const cv = ef.value;
  ef.innerHTML = '<option value="all">All Events</option>';
  [...events].sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(e => {
    const o = document.createElement('option'); o.value = e.id; o.textContent = `${e.title} (${formatDate(e.date)})`; ef.appendChild(o);
  });
  if (cv && ef.querySelector(`option[value="${cv}"]`)) ef.value = cv;
}

function setupLogout() { document.getElementById('logoutBtn').addEventListener('click', (e) => { e.preventDefault(); logout(); }); }
function logout() { localStorage.removeItem('token'); localStorage.removeItem('user'); showToast('Logged out!', 'success'); setTimeout(() => { window.location.href = 'index.html'; }, 500); }

function showAlert(title, message, type) {
  const modal = document.getElementById('alertModal');
  const content = document.getElementById('alertContent');
  const icons = { success: '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>', error: '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>', warning: '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>' };
  const colors = { success: '#10b981', error: '#ef4444', warning: '#f59e0b' };
  content.innerHTML = `<div style="text-align:center;">${icons[type]}<h2 style="color:${colors[type]};margin:20px 0 10px;">${title}</h2><p style="color:var(--text-secondary);margin-bottom:20px;">${message}</p><button class="btn btn-primary" onclick="closeAlertModal()" style="min-width:120px;">Got it</button></div>`;
  modal.style.display = 'flex';
}

function closeAlertModal() { document.getElementById('alertModal').style.display = 'none'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

function showToast(message, type) {
  const t = document.createElement('div'); t.className = `toast toast-${type}`;
  t.innerHTML = `<span>${message}</span><button onclick="this.parentElement.remove()">×</button>`;
  t.style.borderLeftColor = { success: '#10b981', error: '#ef4444', warning: '#f59e0b' }[type];
  document.body.appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3000);
}

function formatTime(t) { if (!t) return ''; const [h, m] = t.split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`; }
function formatDate(d) { return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }); }
function escapeHtml(text) { const d = document.createElement('div'); d.textContent = text; return d.innerHTML; }

document.getElementById('statusFilter')?.addEventListener('change', loadRequests);
document.getElementById('eventFilter')?.addEventListener('change', loadRequests);

// ─── User Management Filters ───
document.getElementById('userSearchInput')?.addEventListener('input', displayFilteredUsers);
document.getElementById('userRoleFilter')?.addEventListener('change', displayFilteredUsers);
document.getElementById('userDeptFilter')?.addEventListener('change', displayFilteredUsers);
document.getElementById('userSortSelect')?.addEventListener('change', displayFilteredUsers);

// ─── Email Management ───
async function loadEmailLogs() {
  const c = document.getElementById('emailLogsList'); if (!c) return;
  try {
    const logs = await AdminAPI.getEmailLogs();
    const tf = document.getElementById('emailTypeFilter')?.value || 'all';
    const sf = document.getElementById('emailStatusFilter')?.value || 'all';
    let filtered = logs;
    if (tf !== 'all') filtered = filtered.filter(l => l.email_type === tf);
    if (sf !== 'all') filtered = filtered.filter(l => l.status === sf);
    if (!filtered?.length) { c.innerHTML = '<p class="no-events">No email records found.</p>'; return; }
    const tl = { welcome: '👋 Welcome', qr_code: '🎟️ QR Pass', reminder: '⏰ Reminder', thank_you: '🎊 Thank You', custom: '📬 Custom' };
    c.innerHTML = `<div style="display:grid;grid-template-columns:2fr 2fr 1fr 1fr 1.5fr;gap:8px;padding:10px 16px;font-size:12px;text-transform:uppercase;letter-spacing:1px;color:var(--text-secondary);font-weight:600;border-bottom:1px solid var(--border-color);"><div>Recipient</div><div>Subject</div><div>Type</div><div>Status</div><div>Sent At</div></div>` +
      filtered.map(l => `<div style="display:grid;grid-template-columns:2fr 2fr 1fr 1fr 1.5fr;gap:8px;padding:12px 16px;border-bottom:1px solid var(--border-color);font-size:14px;"><div><div style="font-weight:600;">${escapeHtml(l.recipient_name || '—')}</div><div style="font-size:12px;color:var(--text-secondary);">${escapeHtml(l.recipient_email)}</div></div><div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(l.subject || '—')}</div><div><span style="background:var(--card-bg);border:1px solid var(--border-color);padding:2px 8px;border-radius:99px;font-size:12px;">${tl[l.email_type] || l.email_type}</span></div><div><span style="color:${l.status === 'sent' ? 'var(--success-color)' : 'var(--danger-color)'};font-weight:700;">${l.status === 'sent' ? '✓ Sent' : '✗ Failed'}</span></div><div style="color:var(--text-secondary);font-size:12px;">${new Date(l.sent_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div></div>`).join('');
  } catch (error) { console.error('Failed to load email logs:', error); if (c) c.innerHTML = '<p class="no-events">Failed to load email logs.</p>'; }
}

async function populateUserDropdown() {
  try {
    if (!_allUsers.length) _allUsers = await AdminAPI.getUsers();
    const s = document.getElementById('emailRecipients'); if (!s) return;
    s.innerHTML = '<option value="all">All Users</option>';
    _allUsers.forEach(u => { const o = document.createElement('option'); o.value = u.id; o.textContent = `${u.name} (${u.email})`; s.appendChild(o); });
  } catch (err) { console.error('Failed to populate user dropdown:', err); }
}

function openComposeModal() { populateUserDropdown(); document.getElementById('composeEmailForm')?.reset(); document.getElementById('composeEmailModal').style.display = 'flex'; }

function setupEmailForm() {
  const form = document.getElementById('composeEmailForm'); if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('sendEmailBtn'); btn.disabled = true; btn.innerHTML = 'Sending…';
    const rv = document.getElementById('emailRecipients').value;
    const payload = { recipients: rv === 'all' ? 'all' : [parseInt(rv, 10)], subject: document.getElementById('emailSubject').value.trim(), message: document.getElementById('emailMessage').value.trim() };
    try { const result = await AdminAPI.sendEmail(payload); closeModal('composeEmailModal'); showAlert('Email Sent', result.message, 'success'); loadEmailLogs(); }
    catch (error) { showAlert('Error', error.message, 'error'); }
    finally { btn.disabled = false; btn.innerHTML = 'Send Email'; }
  });
}

document.getElementById('emailTypeFilter')?.addEventListener('change', loadEmailLogs);
document.getElementById('emailStatusFilter')?.addEventListener('change', loadEmailLogs);
