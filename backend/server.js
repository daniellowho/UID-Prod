const express = require('express');
const path = require('path');
const cors = require('cors');
const https = require('https');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { initDatabase } = require('./config/database');
const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events');
const registrationRoutes = require('./routes/registrations');
const adminRoutes = require('./routes/admin');
const attendanceRoutes = require('./routes/attendance');
const { startReminderScheduler } = require('./ai/eventReminders');

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve the frontend (and the attendance sub-folder that lives inside it)
app.use(express.static(path.join(__dirname, '../frontend')));

// Helper: perform an HTTPS request and parse the JSON response
function githubRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const reqOptions = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: { 'User-Agent': 'EventHub-App', ...options.headers }
    };
    const req = https.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { resolve(data); }
      });
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

// GitHub OAuth – redirect to GitHub
app.get('/api/auth/github', (req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    scope: 'user:email',
    redirect_uri: process.env.GITHUB_CALLBACK_URL
  });
  res.redirect(`https://github.com/login/oauth/authorize?${params}`);
});

// GitHub OAuth – callback
app.get('/api/auth/github/callback', async (req, res) => {
  const { code } = req.query;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  if (!code) {
    return res.redirect(`${frontendUrl}/login.html?error=github_auth_failed`);
  }

  try {
    // Exchange code for access token
    const tokenData = await githubRequest('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code
      })
    });

    if (!tokenData.access_token) {
      return res.redirect(`${frontendUrl}/login.html?error=github_auth_failed`);
    }

    const authHeader = { 'Authorization': `Bearer ${tokenData.access_token}` };

    // Fetch profile and emails in parallel
    const [profile, emails] = await Promise.all([
      githubRequest('https://api.github.com/user', { headers: authHeader }),
      githubRequest('https://api.github.com/user/emails', { headers: authHeader })
    ]);

    const primaryEmail = (Array.isArray(emails) ? emails.find(e => e.primary && e.verified) : null)?.email || profile.email;

    if (!primaryEmail) {
      return res.redirect(`${frontendUrl}/login.html?error=github_no_email`);
    }

    const { pool } = require('./config/database');
    const jwt = require('jsonwebtoken');
    const githubId = String(profile.id);
    const name = profile.name || profile.login;

    let [users] = await pool.query('SELECT * FROM users WHERE github_id = ? OR email = ?', [githubId, primaryEmail]);

    let user;
    if (users.length === 0) {
      const [result] = await pool.query(
        'INSERT INTO users (name, email, github_id, role) VALUES (?, ?, ?, ?)',
        [name, primaryEmail, githubId, 'user']
      );
      user = { id: result.insertId, name, email: primaryEmail, role: 'user' };
    } else {
      user = users[0];
      if (!user.github_id) {
        await pool.query('UPDATE users SET github_id = ? WHERE id = ?', [githubId, user.id]);
      }
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const userParam = Buffer.from(JSON.stringify({
      id: user.id, name: user.name, email: user.email, role: user.role
    })).toString('base64');

    res.redirect(`${frontendUrl}/login.html?token=${token}&user=${userParam}`);
  } catch (error) {
    console.error('GitHub OAuth error:', error);
    res.redirect(`${frontendUrl}/login.html?error=github_auth_failed`);
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/attendance', attendanceRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Event Management API is running' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await initDatabase();
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log('Default admin credentials: admin@eventmanager.com / admin123');
      startReminderScheduler();
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();