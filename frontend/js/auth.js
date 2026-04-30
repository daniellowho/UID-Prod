document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  setupForms();
  updateNavigation();
  setupThemeToggle();
});

function checkAuth() {
  const token = localStorage.getItem('token');
  if (token) {
    window.location.href = 'user-dashboard.html';
  }

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('google_auth') === 'success') {
    showToast('Google authentication successful!', 'success');
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

function updateNavigation() {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  const dashboardLink = document.getElementById('dashboardLink');
  const profileLink = document.getElementById('profileLink');
  const userInfo = document.getElementById('userInfo');
  
  if (token && user) {
    if (dashboardLink) dashboardLink.style.display = 'block';
    if (profileLink) profileLink.style.display = 'block';
    if (userInfo) {
      userInfo.style.display = 'flex';
      const userNameEl = document.getElementById('userName');
      if (userNameEl) userNameEl.textContent = user.name || 'User';
    }
    
    document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.reload();
    });
  }
}

function setupForms() {
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');

  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
    addInputAnimations(loginForm);
  }

  if (signupForm) {
    signupForm.addEventListener('submit', handleSignup);
    addInputAnimations(signupForm);
  }
}

function addInputAnimations(form) {
  const inputs = form.querySelectorAll('input, textarea');
  
  inputs.forEach(input => {
    input.addEventListener('focus', () => {
      input.parentElement.classList.add('focused');
    });
    
    input.addEventListener('blur', () => {
      input.parentElement.classList.remove('focused');
    });
  });
}

async function handleLogin(e) {
  e.preventDefault();
  const errorLabel = document.getElementById('loginError');
  const passwordErrorLabel = document.getElementById('passwordError');
  const submitBtn = e.target.querySelector('button[type="submit"]');
  errorLabel.style.display = 'none';
  passwordErrorLabel.style.display = 'none';

  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span>Signing in...</span>';

  try {
    const result = await AuthAPI.login({ email, password });
    localStorage.setItem('token', result.token);
    localStorage.setItem('user', JSON.stringify(result.user));
    showToast('Login successful! Redirecting...', 'success');
    
    setTimeout(() => {
      window.location.href = result.user.role === 'admin' ? 'admin.html' : 'user-dashboard.html';
    }, 500);
  } catch (error) {
    if (error.message.includes('Invalid credentials')) {
      passwordErrorLabel.textContent = 'Invalid email or password';
      passwordErrorLabel.style.display = 'block';
      document.getElementById('password').value = '';
    } else {
      errorLabel.textContent = error.message;
      errorLabel.style.display = 'block';
    }
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<span>Sign In</span>';
  }
}

async function handleSignup(e) {
  e.preventDefault();
  const errorLabel = document.getElementById('signupError');
  const submitBtn = e.target.querySelector('button[type="submit"]');
  errorLabel.style.display = 'none';

  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  if (password !== confirmPassword) {
    errorLabel.textContent = 'Passwords do not match';
    errorLabel.style.display = 'block';
    return;
  }

  if (password.length < 6) {
    errorLabel.textContent = 'Password must be at least 6 characters';
    errorLabel.style.display = 'block';
    return;
  }

  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span>Creating account...</span>';

  try {
    const result = await AuthAPI.signup({ name, email, password });
    localStorage.setItem('token', result.token);
    localStorage.setItem('user', JSON.stringify(result.user));
    showToast('Account created! Redirecting...', 'success');
    
    setTimeout(() => {
      window.location.href = 'user-dashboard.html';
    }, 500);
  } catch (error) {
    errorLabel.textContent = error.message;
    errorLabel.style.display = 'block';
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<span>Create Account</span>';
  }
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
  
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}