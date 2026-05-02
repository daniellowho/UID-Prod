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
  let approvedRegistrations = [];
  try {
    const regs = await AttendanceAPI.getMyRegistrations();
    approvedRegistrations = regs.filter(r => r.status === 'approved');
  } catch (e) {
    console.error('Failed to load registrations', e);
  }

  if (approvedRegistrations.length === 0) {
    eventSelect.innerHTML = '<option value="">No approved registrations</option>';
    noRegCard.style.display = 'block';
    return;
  }

  eventSelect.innerHTML = '<option value="">— Select an event —</option>' +
    approvedRegistrations.map(r =>
      `<option value="${r.event_id}">${r.title} (${new Date(r.date).toLocaleDateString()})</option>`
    ).join('');

  eventSelect.addEventListener('change', () => loadQR(eventSelect.value));
  document.getElementById('refreshBtn').addEventListener('click', () => loadQR(eventSelect.value));

  let loadedEventId = null; // track last loaded event for refresh

  async function loadQR(eventId) {
    if (!eventId) {
      qrCard.style.display = 'none';
      noRegCard.style.display = 'none';
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
        banner.className = 'status-banner checked-in';
        const checkedAt = data.checked_in_at
          ? new Date(data.checked_in_at).toLocaleString()
          : '';
        banner.querySelector('.status-icon').textContent = '✅';
        statusText.textContent = `You have checked in!${checkedAt ? '  (' + checkedAt + ')' : ''}`;
      } else {
        banner.className = 'status-banner pending';
        banner.querySelector('.status-icon').textContent = '⏳';
        statusText.textContent = 'Not checked in yet — show this QR to the staff';
      }

    } catch (err) {
      qrContainer.innerHTML = `<p style="color:var(--danger-color);text-align:center;">${err.message}</p>`;
    }
  }
});
