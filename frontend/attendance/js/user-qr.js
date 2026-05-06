document.addEventListener('DOMContentLoaded', async () => {
  setupThemeToggle();

  // Auth guard
  const user = requireAuth();
  if (!user) return;

  document.getElementById('userName').textContent = user.name || 'User';
  document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '../login.html';
  });

  const eventSelect = document.getElementById('eventSelect');
  const qrCard = document.getElementById('qrCard');
  const noRegCard = document.getElementById('noRegCard');

  // Load user's approved registrations
  let allRegistrations = [];
  let approvedRegistrations = [];
  try {
    allRegistrations = await AttendanceAPI.getMyRegistrations() || [];
    approvedRegistrations = allRegistrations.filter(r => r.status === 'approved');
  } catch (e) {
    console.error('Failed to load registrations', e);
  }

  if (approvedRegistrations.length === 0) {
    const msgElement = document.querySelector('#noRegCard .empty-state p');
    if (allRegistrations.length > 0) {
      eventSelect.innerHTML = '<option value="">Awaiting Approval</option>';
      if (msgElement) msgElement.innerHTML = 'Your event registrations are currently <strong>pending admin approval</strong>.<br>Please check back later for your QR pass once approved.';
    } else {
      eventSelect.innerHTML = '<option value="">No registrations found</option>';
      if (msgElement) msgElement.innerHTML = 'You have not registered for any events yet.';
    }
    noRegCard.style.display = 'block';
    return;
  }

  // Populate dropdown without the blank "Select an event" option
  eventSelect.innerHTML = approvedRegistrations.map(r =>
    `<option value="${r.event_id}">${r.title} (${new Date(r.date).toLocaleDateString()})</option>`
  ).join('');

  eventSelect.addEventListener('change', () => loadQR(eventSelect.value));
  document.getElementById('refreshBtn').addEventListener('click', () => loadQR(eventSelect.value));

  // Auto-load the first event's QR code immediately
  if (approvedRegistrations.length > 0) {
    eventSelect.value = approvedRegistrations[0].event_id;
    loadQR(approvedRegistrations[0].event_id);
  }

  let loadedEventId = null; // track last loaded event for refresh
  let statusPoller = null;  // setInterval id for polling

  function startPolling(eventId) {
    stopPolling();
    statusPoller = setInterval(async () => {
      try {
        const data = await AttendanceAPI.getToken(eventId);
        if (data.checked_in) {
          stopPolling();
          // Redirect to thank-you page (parseInt ensures eventId is numeric)
          window.location.href = `thank-you.html?eventId=${parseInt(eventId, 10)}`;
        }
      } catch (pollErr) {
        console.error('[QR Poll] Status check failed:', pollErr.message);
      }
    }, 5000); // poll every 5 seconds
  }

  function stopPolling() {
    if (statusPoller !== null) {
      clearInterval(statusPoller);
      statusPoller = null;
    }
  }

  async function loadQR(eventId) {
    if (!eventId) {
      qrCard.style.display = 'none';
      noRegCard.style.display = 'none';
      stopPolling();
      return;
    }

    qrCard.style.display = 'block';
    noRegCard.style.display = 'none';

    const qrContainer = document.getElementById('qrcode');
    qrContainer.innerHTML = '<div class="loading-text">Generating your QR pass…</div>';

    try {
      const data = await AttendanceAPI.getToken(eventId);

      // Render QR code from server-generated data URL
      qrContainer.innerHTML = '';
      const img = document.createElement('img');
      img.src = data.qr_data_url;
      img.alt = 'Your QR Pass';
      img.style.cssText = 'border:8px solid #fff;border-radius:12px;box-shadow:var(--shadow-md);display:block;';
      qrContainer.appendChild(img);

      // Participant info
      document.getElementById('participantName').textContent = user.name || 'Participant';
      document.getElementById('participantId').textContent = `Participant ID: ${data.user_id} • Token: ${data.token.slice(0, 8)}…`;

      // Status banner
      const banner = document.getElementById('statusBanner');
      const statusText = document.getElementById('statusText');

      if (data.checked_in) {
        // Already checked in – redirect straight to the thank-you page
        stopPolling();
        window.location.href = `thank-you.html?eventId=${parseInt(eventId, 10)}`;
        return;
      } else {
        banner.className = 'status-banner pending';
        banner.querySelector('.status-icon').textContent = '⏳';
        statusText.textContent = 'Not checked in yet — show this QR to the staff';
        // Start polling so the page auto-redirects when the admin marks attendance
        startPolling(eventId);
      }

    } catch (err) {
      qrContainer.innerHTML = `<p style="color:var(--danger-color);text-align:center;">${err.message}</p>`;
    }
  }
});
