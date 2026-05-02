const express = require('express');
const path = require('path');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
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

app.use(session({
  secret: process.env.SESSION_SECRET || 'session_secret',
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const { pool } = require('./config/database');
    let [users] = await pool.query('SELECT * FROM users WHERE google_id = ?', [profile.id]);
    
    if (users.length === 0) {
      const [result] = await pool.query(
        'INSERT INTO users (name, email, google_id, role) VALUES (?, ?, ?, ?)',
        [profile.displayName, profile.emails[0].value, profile.id, 'user']
      );
      return done(null, { id: result.insertId, role: 'user' });
    }
    
    return done(null, users[0]);
  } catch (error) {
    return done(error);
  }
}));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

app.get('/api/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/api/auth/google/callback', passport.authenticate('google', { failureRedirect: '/?error=auth_failed' }), (req, res) => {
  res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}?google_auth=success`);
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