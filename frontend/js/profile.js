let userAvatar = null;

document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  loadProfile();
  setupForms();
  setupLogout();
  setupThemeToggle();
  setupEditProfile();
  setupAvatarUpload();
});

function checkAuth() {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  document.getElementById('userName').textContent = user.name || 'User';
  
  if (user.name) {
    document.getElementById('userFullName').textContent = user.name.split(' ')[0];
    document.getElementById('avatarInitial').textContent = user.name.charAt(0).toUpperCase();
  }
}

async function loadProfile() {
  try {
    const userResponse = await AuthAPI.getCurrentUser();
    const user = userResponse;
    
    document.getElementById('name').value = user.name || '';
    document.getElementById('email').value = user.email || '';
    document.getElementById('viewName').textContent = user.name || '-';
    document.getElementById('viewEmail').textContent = user.email || '-';
    document.getElementById('userId').textContent = `#${user.id || 'N/A'}`;
    document.getElementById('accountType').textContent = user.role === 'admin' ? 'Administrator' : 'User';
    document.getElementById('userFullName').textContent = user.name ? user.name.split(' ')[0] : 'User';
    document.getElementById('userName').textContent = user.name || 'User';

    if (user.name) {
      document.getElementById('avatarInitial').textContent = user.name.charAt(0).toUpperCase();
    }

    if (user.created_at) {
      const date = new Date(user.created_at);
      document.getElementById('memberSince').textContent = date.toLocaleDateString('en-US', { 
        month: 'short', 
        year: 'numeric' 
      });
    }

    const registrations = await RegistrationsAPI.getMyRegistrations();
    document.getElementById('totalRegistrations').textContent = registrations.length || 0;
    
    const approved = registrations.filter(r => r.status === 'approved').length;
    document.getElementById('approvedEvents').textContent = approved;

    const storedAvatar = localStorage.getItem('userAvatar');
    if (storedAvatar) {
      userAvatar = storedAvatar;
      displayAvatar(storedAvatar);
    }

    setupDeleteConfirmation();
  } catch (error) {
    console.error('Failed to load profile:', error);
    if (error.message.includes('Invalid token')) {
      logout();
    }
  }
}

function displayAvatar(avatarData) {
  const container = document.getElementById('avatarContainer');
  if (avatarData) {
    container.innerHTML = `<img src="${avatarData}" alt="Profile photo">`;
  } else {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const initial = user.name ? user.name.charAt(0).toUpperCase() : 'U';
    container.innerHTML = `<span id="avatarInitial">${initial}</span>`;
  }
}

function setupAvatarUpload() {
  const avatarInput = document.getElementById('avatarInput');
  
  avatarInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        userAvatar = event.target.result;
        localStorage.setItem('userAvatar', userAvatar);
        displayAvatar(userAvatar);
        showSuccessMessage('Profile photo updated!');
      };
      reader.readAsDataURL(file);
    }
  });
}

function setupEditProfile() {
  const editBtn = document.getElementById('editProfileBtn');
  const cancelBtn = document.getElementById('cancelEditBtn');
  const viewForm = document.getElementById('viewForm');
  const editForm = document.getElementById('editForm');

  editBtn.addEventListener('click', () => {
    viewForm.classList.add('hidden');
    editForm.classList.add('active');
    editBtn.style.display = 'none';
  });

  cancelBtn.addEventListener('click', () => {
    viewForm.classList.remove('hidden');
    editForm.classList.remove('active');
    editBtn.style.display = 'flex';
    
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    document.getElementById('name').value = user.name || '';
    document.getElementById('email').value = user.email || '';
  });
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

function setupForms() {
  const profileForm = document.getElementById('profileForm');
  const passwordForm = document.getElementById('passwordForm');

  profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('updateProfileBtn');
    btn.disabled = true;
    btn.innerHTML = '<span>Saving...</span>';

    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();

    if (!name || !email) {
      showAlert('Error', 'Please fill in all required fields', 'error');
      btn.disabled = false;
      btn.innerHTML = '<span>Save Changes</span>';
      return;
    }

    try {
      const result = await AuthAPI.updateProfile({ name, email });
      
      const user = JSON.parse(localStorage.getItem('user'));
      user.name = name;
      user.email = email;
      localStorage.setItem('user', JSON.stringify(user));

      document.getElementById('viewName').textContent = name;
      document.getElementById('viewEmail').textContent = email;
      document.getElementById('userName').textContent = name;
      document.getElementById('userFullName').textContent = name.split(' ')[0];
      
      const initial = name.charAt(0).toUpperCase();
      if (!userAvatar) {
        displayAvatar(null);
        document.getElementById('avatarInitial').textContent = initial;
      }

      document.getElementById('viewForm').classList.remove('hidden');
      document.getElementById('editForm').classList.remove('active');
      document.getElementById('editProfileBtn').style.display = 'flex';

      showSuccessMessage('Profile updated successfully!');
    } catch (error) {
      showAlert('Error', error.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<span>Save Changes</span>';
    }
  });

  passwordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('changePasswordBtn');
    btn.disabled = true;
    btn.innerHTML = '<span>Changing...</span>';

    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmNewPassword = document.getElementById('confirmNewPassword').value;

    if (!currentPassword || !newPassword) {
      showAlert('Error', 'Please fill in all password fields', 'error');
      btn.disabled = false;
      btn.innerHTML = '<span>Change Password</span>';
      return;
    }

    if (newPassword.length < 6) {
      showAlert('Error', 'New password must be at least 6 characters', 'error');
      btn.disabled = false;
      btn.innerHTML = '<span>Change Password</span>';
      return;
    }

    if (newPassword !== confirmNewPassword) {
      showAlert('Error', 'New passwords do not match', 'error');
      btn.disabled = false;
      btn.innerHTML = '<span>Change Password</span>';
      return;
    }

    try {
      await AuthAPI.changePassword({ currentPassword, newPassword });
      
      document.getElementById('currentPassword').value = '';
      document.getElementById('newPassword').value = '';
      document.getElementById('confirmNewPassword').value = '';
      
      showSuccessMessage('Password changed successfully!');
    } catch (error) {
      showAlert('Error', error.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<span>Change Password</span>';
    }
  });

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

function setupDeleteConfirmation() {
  const deleteConfirm = document.getElementById('deleteConfirm');
  const confirmBtn = document.getElementById('confirmDeleteBtn');

  deleteConfirm.addEventListener('input', () => {
    confirmBtn.disabled = deleteConfirm.value !== 'DELETE';
  });
}

function showDeleteConfirmation() {
  document.getElementById('deleteConfirm').value = '';
  document.getElementById('confirmDeleteBtn').disabled = true;
  document.getElementById('deleteModal').style.display = 'flex';
}

async function deleteAccount() {
  if (!confirm('Are you absolutely sure? This action cannot be undone!')) {
    return;
  }

  try {
    await AuthAPI.deleteAccount();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userAvatar');
    showToast('Account deleted. Goodbye!', 'success');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1500);
  } catch (error) {
    showAlert('Error', error.message, 'error');
  }
}

function showSuccessMessage(message) {
  const card = document.getElementById('successCard');
  const text = document.getElementById('successText');
  text.textContent = message;
  card.style.display = 'block';
  
  setTimeout(() => {
    card.style.display = 'none';
  }, 4000);
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
  localStorage.removeItem('userAvatar');
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
      <button class="btn btn-primary" onclick="closeModal('alertModal')" style="min-width: 120px;">Got it</button>
    </div>
  `;

  modal.style.display = 'flex';
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