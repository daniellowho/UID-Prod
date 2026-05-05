const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || process.env.MYSQLHOST,
  user: process.env.DB_USER || process.env.MYSQLUSER,
  password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD,
  database: process.env.DB_NAME || process.env.MYSQLDATABASE || 'event_management',
  port: process.env.DB_PORT || process.env.MYSQLPORT,
  waitForConnections: true,
  connectionLimit: 10
});
const getDatabaseUrl = () => process.env.DATABASE_URL || process.env.MYSQL_URL || process.env.MYSQL_PUBLIC_URL;

const parseDatabaseUrl = (databaseUrl) => {
  if (!databaseUrl) {
    return {};
  }

  const url = new URL(databaseUrl);
  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : undefined,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.replace(/^\//, '')) || undefined,
    ssl: url.searchParams.get('ssl') === 'true' ? { rejectUnauthorized: false } : undefined
  };
};

const getDatabaseConfig = ({ includeDatabase = true } = {}) => {
  const urlConfig = parseDatabaseUrl(getDatabaseUrl());
  const database = process.env.DB_NAME || urlConfig.database || DEFAULT_DB_NAME;
  const config = {
    host: process.env.DB_HOST || urlConfig.host || DEFAULT_DB_HOST,
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : urlConfig.port,
    user: process.env.DB_USER || urlConfig.user || DEFAULT_DB_USER,
    password: process.env.DB_PASSWORD ?? urlConfig.password ?? DEFAULT_DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : urlConfig.ssl
  };

  if (includeDatabase) {
    config.database = database;
  }

  return config;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const connectWithRetry = async (config, { retries = 10, delayMs = 3000 } = {}) => {
  let lastError;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      return await mysql.createConnection(config);
    } catch (error) {
      lastError = error;
      const isLastAttempt = attempt === retries;
      if (isLastAttempt) {
        break;
      }
      console.warn(`Database connection failed (${error.code || error.message}). Retrying ${attempt}/${retries - 1} in ${delayMs}ms...`);
      await sleep(delayMs);
    }
  }

  throw lastError;
};

const pool = mysql.createPool({
  ...getDatabaseConfig(),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const initDatabase = async () => {
  const databaseName = process.env.DB_NAME || parseDatabaseUrl(getDatabaseUrl()).database || DEFAULT_DB_NAME;
  const connection = await connectWithRetry(getDatabaseConfig({ includeDatabase: false }));

  await connection.query(`CREATE DATABASE IF NOT EXISTS ${mysql.escapeId(databaseName)}`);
  await connection.query(`USE ${mysql.escapeId(databaseName)}`);

  // STUDENT table (mapped to users):
  // Functional dependencies: id -> name, email, password, role, roll_number, department
  // This is in 3NF/BCNF: every non-key attribute depends only on the primary key (id).
  // No partial or transitive dependencies exist.
  await connection.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255),
      role ENUM('user', 'admin') DEFAULT 'user',
      google_id VARCHAR(255),
      github_id VARCHAR(255),
      roll_number VARCHAR(50) DEFAULT NULL,
      department VARCHAR(100) DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  // EVENT table:
  // Functional dependencies: id -> title, description, date, start_time, location, speaker, category, max_capacity, image_url, created_by
  // In 3NF/BCNF: all attributes depend solely on the primary key. No event info is stored
  // redundantly in registrations or feedback (those tables only store event_id FK).
  await connection.query(`
    CREATE TABLE IF NOT EXISTS events (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      date DATE NOT NULL,
      start_time TIME DEFAULT '09:00:00',
      location VARCHAR(255),
      speaker VARCHAR(255) DEFAULT NULL,
      category VARCHAR(50) DEFAULT NULL,
      max_capacity INT DEFAULT NULL,
      image_url VARCHAR(512),
      created_by INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  // REGISTRATION table:
  // Functional dependencies: (user_id, event_id) -> status, created_at
  // Primary key is the composite (user_id, event_id) via UNIQUE KEY, no repeated event info.
  // Fully in BCNF: no non-trivial FDs outside the candidate key.
  await connection.query(`
    CREATE TABLE IF NOT EXISTS registrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      event_id INT NOT NULL,
      status ENUM('pending', 'approved', 'denied') DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
      UNIQUE KEY unique_registration (user_id, event_id)
    )
  `);

  // FEEDBACK table:
  // Functional dependencies: (event_id, user_id) -> rating, comments, would_recommend, created_at
  // event info is NOT repeated here (only event_id FK), so no redundancy.
  // This is in BCNF: the only determinant is the composite key (event_id, user_id).
  await connection.query(`
    CREATE TABLE IF NOT EXISTS feedback (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NULL,
      user_name VARCHAR(255) NOT NULL DEFAULT 'Anonymous',
      event_id INT NULL,
      topic VARCHAR(255) NOT NULL,
      rating INT NOT NULL DEFAULT 5,
      message TEXT NOT NULL,
      would_recommend TINYINT(1) DEFAULT NULL COMMENT '1=yes, 0=no',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL
    )
  `);

  // ── Migrations: safely add columns that may not exist in older databases ──
  const safeAlter = async (sql) => {
    try { await connection.query(sql); } catch (err) {
      if (err.errno !== 1060 && err.errno !== 1061 && err.errno !== 1826) {
        console.error('Migration warning:', err.message);
      }
    }
  };
  await safeAlter(`ALTER TABLE events ADD COLUMN start_time TIME DEFAULT '09:00:00'`);
  await safeAlter(`ALTER TABLE events ADD COLUMN category VARCHAR(50) DEFAULT NULL`);
  await safeAlter(`ALTER TABLE events ADD COLUMN max_capacity INT DEFAULT NULL`);
  await safeAlter(`ALTER TABLE events ADD COLUMN speaker VARCHAR(255) DEFAULT NULL`);
  await safeAlter(`ALTER TABLE events ADD COLUMN image_url VARCHAR(512) DEFAULT NULL`);
  await safeAlter(`ALTER TABLE users ADD COLUMN roll_number VARCHAR(50) DEFAULT NULL`);
  await safeAlter(`ALTER TABLE users ADD COLUMN department VARCHAR(100) DEFAULT NULL`);
  await safeAlter(`ALTER TABLE users ADD COLUMN github_id VARCHAR(255)`);
  await safeAlter(`ALTER TABLE feedback ADD COLUMN event_id INT NULL`);
  await safeAlter(`ALTER TABLE feedback ADD COLUMN would_recommend TINYINT(1) DEFAULT NULL`);
  try { await connection.query(`ALTER TABLE feedback ADD CONSTRAINT fk_feedback_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL`); } catch (e) {}

  await connection.query(`
    CREATE TABLE IF NOT EXISTS attendance_tokens (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      event_id INT NOT NULL,
      token VARCHAR(36) UNIQUE NOT NULL,
      checked_in BOOLEAN DEFAULT FALSE,
      checked_in_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
      UNIQUE KEY unique_user_event (user_id, event_id)
    )
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS email_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      recipient_email VARCHAR(255) NOT NULL,
      recipient_name VARCHAR(255),
      subject VARCHAR(500),
      email_type ENUM('welcome', 'qr_code', 'reminder', 'thank_you', 'custom') DEFAULT 'custom',
      status ENUM('sent', 'failed') DEFAULT 'sent',
      error_message TEXT,
      sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Deduplication table for automated event reminders (survives server restarts)
  await connection.query(`
    CREATE TABLE IF NOT EXISTS reminder_sent_log (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      event_id INT NOT NULL,
      bucket_label VARCHAR(10) NOT NULL,
      sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_reminder (user_id, event_id, bucket_label),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
    )
  `);

  // Seed default admin user
  const [adminUsers] = await connection.query("SELECT * FROM users WHERE role = 'admin'");
  if (adminUsers.length === 0) {
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await connection.query(
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'admin')",
      ['Admin', 'admin@eventmanager.com', hashedPassword]
    );
  }

  // Seed sample upcoming events
  const [events] = await connection.query("SELECT * FROM events");
  if (events.length === 0) {
    const sampleEvents = [
      ['Tech Innovators Summit 2026', 'Conference on AI, robotics, and IoT.', '2026-06-15', '09:00:00', 'Delhi Convention Center', 'Dr. Raj Patel', 'conference', 200, 'https://images.unsplash.com/photo-1518779578993-ec3579fee39f'],
      ['AI & Data Science Workshop', 'Hands-on ML workshop.', '2026-06-20', '10:00:00', 'IIT Delhi', 'Prof. Ananya Sharma', 'ai', 50, 'https://images.unsplash.com/photo-1517697471339-43c9d7c9a45c'],
      ['Startup Pitch Fest', 'Startup pitching to investors.', '2026-07-05', '14:00:00', 'Gurugram Hub', 'Vikram Mehra', 'networking', 100, 'https://images.unsplash.com/photo-1526378722484-6f9f1f0f7f1f'],
      ['Hackathon 48 Hours', 'Coding competition.', '2026-07-10', '09:00:00', 'Noida Tech Park', null, 'hackathon', 150, 'https://images.unsplash.com/photo-1515879216487-1a1323ba1a45'],
      ['Cybersecurity Seminar', 'Ethical hacking & security awareness.', '2026-07-18', '11:00:00', 'Online', 'Karthik Nair', 'seminar', null, 'https://images.unsplash.com/photo-1519389950473-47ba0277781c'],
      ['Cultural Night 2026', 'Annual cultural festival with music, dance, and drama performances.', '2026-08-01', '18:00:00', 'University Auditorium', null, 'cultural', 500, 'https://images.unsplash.com/photo-1540575467063-178a50c2df87']
    ];
    for (const event of sampleEvents) {
      await connection.query(
        "INSERT INTO events (title, description, date, start_time, location, speaker, category, max_capacity, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        event
      );
    }
  }

  // Seed past events (already finished) so they appear in feedback topic dropdown
  const pastEventTitles = [
    'Tech Conference 2025',
    'Data Science Summit 2025',
    'UI/UX Design Workshop',
    'Blockchain & Web3 Expo',
    'Annual Hackathon 2025'
  ];
  const [existingEvents] = await connection.query("SELECT title FROM events WHERE title IN (?, ?, ?, ?, ?)", pastEventTitles);
  const existingTitles = existingEvents.map(e => e.title);

  const pastEvents = [
    ['Tech Conference 2025', 'A premier technology conference covering the latest trends in software, hardware, and innovation.', '2025-11-15', '09:00:00', 'Mumbai Convention Center', 'Dr. Siddharth Roy', 'conference', 300, 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&h=200&fit=crop'],
    ['Data Science Summit 2025', 'Deep dives into machine learning, big data, and analytics with industry experts.', '2025-12-10', '10:00:00', 'Bengaluru Tech Hub', 'Prof. Meera Joshi', 'ai', 150, 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=200&fit=crop'],
    ['UI/UX Design Workshop', 'Hands-on workshop on modern design principles, Figma, and user research.', '2026-01-20', '14:00:00', 'Pune Design Studio', 'Divya Patel', 'workshop', 40, 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&h=200&fit=crop'],
    ['Blockchain & Web3 Expo', 'Exploring decentralised applications, NFTs, and the future of the internet.', '2026-02-28', '09:00:00', 'Hyderabad HICC', 'Arun Kumar', 'technical', 250, 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=400&h=200&fit=crop'],
    ['Annual Hackathon 2025', '48-hour coding marathon with exciting challenges and prizes.', '2025-10-05', '09:00:00', 'Chennai Coding Campus', null, 'hackathon', 200, 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=400&h=200&fit=crop']
  ];

  for (const ev of pastEvents) {
    if (!existingTitles.includes(ev[0])) {
      await connection.query(
        "INSERT INTO events (title, description, date, start_time, location, speaker, category, max_capacity, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        ev
      );
    }
  }

  // Seed sample public feedback / reviews
  const [existingFeedback] = await connection.query("SELECT COUNT(*) as cnt FROM feedback");
  if (existingFeedback[0].cnt === 0) {
    const sampleFeedback = [
      ['Anonymous', 'Tech Conference 2025', 5, 'Absolutely loved the keynote sessions! The speakers were world-class and the networking opportunities were fantastic.'],
      ['Priya Sharma', 'Tech Conference 2025', 4, 'Great event overall. The venue was well-organised and the workshops were very informative. Would love more breakout sessions next time.'],
      ['Rahul Verma', 'Data Science Summit 2025', 5, 'The ML workshops were hands-on and incredibly useful. I learnt more here in two days than months of self-study.'],
      ['Ananya Singh', 'Data Science Summit 2025', 4, 'Really enjoyed the panel discussions. Some sessions were a bit advanced but overall a great learning experience.'],
      ['Karthik Nair', 'UI/UX Design Workshop', 5, 'The Figma deep-dive was phenomenal. The instructor was patient and the materials were top-notch.'],
      ['Meera Joshi', 'Blockchain & Web3 Expo', 3, 'Interesting topics but some talks felt too promotional. The demo booths were the highlight for me.'],
      ['Siddharth Roy', 'Annual Hackathon 2025', 5, 'Best hackathon I have attended! The problem statements were challenging and the mentors were super helpful. Won 2nd place!'],
      ['Divya Patel', 'Annual Hackathon 2025', 4, 'Loved the energy and the team collaboration. Food and facilities could be improved but the experience was worth it.'],
      ['Arun Kumar', 'General', 4, 'EventHub makes it so easy to discover and register for events. The interface is clean and intuitive.'],
      ['Sneha Gupta', 'Website Experience', 5, 'The platform is smooth and I never had any issues finding events or managing my registrations. Keep up the great work!'],
      ['Vikram Reddy', 'Event Organization', 4, 'Events are well-organised with clear communication. The email reminders were a nice touch.'],
      ['Pooja Menon', 'UI/UX Design Workshop', 5, 'Brilliant workshop! The real-world case studies made all the difference. Already applying what I learnt at work.']
    ];

    for (const fb of sampleFeedback) {
      await connection.query(
        "INSERT INTO feedback (user_name, topic, rating, message) VALUES (?, ?, ?, ?)",
        fb
      );
    }
  }

  console.log('Database initialized successfully');
  await connection.end();
};

module.exports = { pool, initDatabase };
