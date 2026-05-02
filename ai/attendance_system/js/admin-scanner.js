document.addEventListener('DOMContentLoaded', async () => {
  setupThemeToggle();

  // Admin guard
  const user = requireAdmin();
  if (!user) return;

  document.getElementById('userName').textContent = user.name || 'Admin';
  document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '../../frontend/login.html';
  });

  // ─── Attendee List ──────────────────────────────────────────────
  const eventFilter = document.getElementById('eventFilter');
  const attendeeList = document.getElementById('attendeeList');
  const statsRow = document.getElementById('statsRow');

  let allAttendance = [];

  async function loadAllAttendance() {
    try {
      allAttendance = await AttendanceAPI.getAllAttendance();
      populateEventFilter();
      renderList();
    } catch (e) {
      attendeeList.innerHTML = `<li style="color:var(--danger-color);padding:1rem;">${e.message}</li>`;
    }
  }

  function populateEventFilter() {
    const seen = new Set();
    const options = ['<option value="">All events</option>'];
    allAttendance.forEach(r => {
      if (!seen.has(r.event_id)) {
        seen.add(r.event_id);
        options.push(`<option value="${r.event_id}">${r.event_title}</option>`);
      }
    });
    eventFilter.innerHTML = options.join('');
  }

  function renderList() {
    const selectedEventId = eventFilter.value ? parseInt(eventFilter.value) : null;
    const records = selectedEventId
      ? allAttendance.filter(r => r.event_id === selectedEventId)
      : allAttendance;

    const checkedIn = records.filter(r => r.checked_in);
    statsRow.innerHTML = `
      <span class="stat-chip"><span>${records.length}</span>Total</span>
      <span class="stat-chip"><span>${checkedIn.length}</span>Checked In</span>
      <span class="stat-chip"><span>${records.length - checkedIn.length}</span>Pending</span>
    `;

    if (records.length === 0) {
      attendeeList.innerHTML = '<li class="empty-state"><p>No records found</p></li>';
      return;
    }

    attendeeList.innerHTML = records.map(r => `
      <li class="attendee-item">
        <div class="attendee-info">
          <span class="attendee-name">${escHtml(r.user_name)}</span>
          <span class="attendee-email">${escHtml(r.user_email)}</span>
          ${!selectedEventId ? `<span style="font-size:0.75rem;color:var(--text-secondary);">${escHtml(r.event_title)}</span>` : ''}
        </div>
        ${r.checked_in
          ? `<span class="badge badge-success">✅ Checked In${r.checked_in_at ? '<br><span style="font-weight:400;">' + new Date(r.checked_in_at).toLocaleTimeString() + '</span>' : ''}</span>`
          : `<span class="badge badge-muted">⏳ Pending</span>`
        }
      </li>
    `).join('');
  }

  eventFilter.addEventListener('change', renderList);
  await loadAllAttendance();

  // ─── QR Scanner ─────────────────────────────────────────────────
  const video = document.getElementById('scanVideo');
  const canvas = document.getElementById('scanCanvas');
  const ctx = canvas.getContext('2d');
  const resultEl = document.getElementById('scanResult');
  const startBtn = document.getElementById('startScanBtn');
  const stopBtn = document.getElementById('stopScanBtn');

  let stream = null;
  let animFrame = null;
  let scanCooldown = false;

  startBtn.addEventListener('click', startCamera);
  stopBtn.addEventListener('click', stopCamera);

  async function startCamera() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      video.srcObject = stream;
      await video.play();
      startBtn.disabled = true;
      stopBtn.disabled = false;
      showResult(resultEl, '', '');
      scanFrame();
    } catch (err) {
      showResult(resultEl, 'error', `Camera error: ${err.message}`);
    }
  }

  function stopCamera() {
    cancelAnimationFrame(animFrame);
    if (stream) stream.getTracks().forEach(t => t.stop());
    stream = null;
    video.srcObject = null;
    startBtn.disabled = false;
    stopBtn.disabled = true;
  }

  function scanFrame() {
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });
      if (code && !scanCooldown) {
        handleScannedToken(code.data, resultEl);
      }
    }
    animFrame = requestAnimationFrame(scanFrame);
  }

  async function handleScannedToken(token, resultContainer) {
    scanCooldown = true;
    setTimeout(() => { scanCooldown = false; }, 3000); // 3s cooldown per scan

    try {
      const data = await AttendanceAPI.checkIn(token);
      if (data.already_checked_in) {
        showResult(resultContainer, 'warning',
          `⚠️ Already checked in: <strong>${escHtml(data.user_name)}</strong> (${escHtml(data.user_email)}) — ${new Date(data.checked_in_at).toLocaleString()}`
        );
      } else {
        showResult(resultContainer, 'success',
          `✅ Checked in: <strong>${escHtml(data.user_name)}</strong> (${escHtml(data.user_email)}) — ${data.event_title}`
        );
        await loadAllAttendance(); // refresh list
      }
    } catch (err) {
      showResult(resultContainer, 'error', `❌ ${err.message}`);
    }
  }

  // ─── Manual check-in ────────────────────────────────────────────
  const manualInput = document.getElementById('manualToken');
  const manualResult = document.getElementById('manualResult');
  document.getElementById('manualCheckInBtn').addEventListener('click', async () => {
    const token = manualInput.value.trim();
    if (!token) { showResult(manualResult, 'error', 'Please enter a token'); return; }
    await handleScannedToken(token, manualResult);
    manualInput.value = '';
  });

  // ─── Helpers ────────────────────────────────────────────────────
  function showResult(el, type, html) {
    el.className = `scan-result${type ? ' ' + type : ''}`;
    el.innerHTML = html;
    el.style.display = html ? 'block' : 'none';
  }

  function escHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
});
