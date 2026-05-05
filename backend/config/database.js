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
const initDatabase = async () => {
  const dbHost = process.env.DB_HOST || process.env.MYSQLHOST;
  const dbUser = process.env.DB_USER || process.env.MYSQLUSER;
  const dbPassword = process.env.DB_PASSWORD || process.env.MYSQLPASSWORD;
  const dbName = process.env.DB_NAME || process.env.MYSQLDATABASE || 'event_management';

  if (!dbHost || !dbUser || dbPassword === undefined) {
    throw new Error('Missing required database environment variables (DB_HOST/MYSQLHOST, DB_USER/MYSQLUSER, DB_PASSWORD/MYSQLPASSWORD)');
  }

  const connection = await mysql.createConnection({
    host: dbHost,
    user: dbUser,
    password: dbPassword
  });

  try {
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbName}`);
    await connection.query(`USE ${dbName}`);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255),
        role ENUM('user', 'admin') DEFAULT 'user',
        google_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS events (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        date DATE NOT NULL,
        location VARCHAR(255),
        image_url VARCHAR(512),
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

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

    const [adminUsers] = await connection.query("SELECT * FROM users WHERE role = 'admin'");
    if (adminUsers.length === 0) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await connection.query(
        "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'admin')",
        ['Admin', 'admin@eventmanager.com', hashedPassword]
      );
    }

    // Add start_time column to events if it doesn't exist yet
    try {
      await connection.query(`ALTER TABLE events ADD COLUMN start_time TIME DEFAULT '09:00:00'`);
    } catch (err) {
      // MySQL error 1060 = "Duplicate column name" – safe to ignore
      if (err.errno !== 1060) {
        console.error('Unexpected error adding start_time column:', err.message);
      }
    }

    // Add category column to events if it doesn't exist yet
    try {
      await connection.query(`ALTER TABLE events ADD COLUMN category VARCHAR(50) DEFAULT NULL`);
    } catch (err) {
      if (err.errno !== 1060) {
        console.error('Unexpected error adding category column:', err.message);
      }
    }

    // Add max_capacity column to events if it doesn't exist yet
    try {
      await connection.query(`ALTER TABLE events ADD COLUMN max_capacity INT DEFAULT NULL`);
    } catch (err) {
      if (err.errno !== 1060) {
        console.error('Unexpected error adding max_capacity column:', err.message);
      }
    }

    // Add github_id column to users if it doesn't exist yet
    try {
      await connection.query(`ALTER TABLE users ADD COLUMN github_id VARCHAR(255)`);
    } catch (err) {
      if (err.errno !== 1060) {
        console.error('Unexpected error adding github_id column:', err.message);
      }
    }

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

    const [events] = await connection.query("SELECT * FROM events");
    if (events.length === 0) {
      const sampleEvents = [
      ['Tech Innovators Summit 2026', 'Conference on AI, robotics, and IoT.', '2026-06-15', 'Delhi Convention Center', 'https://images.unsplash.com/photo-1518779578993-ec3579fee39f'],
      ['AI & Data Science Workshop', 'Hands-on ML workshop.', '2026-06-20', 'IIT Delhi', 'https://images.unsplash.com/photo-1517697471339-43c9d7c9a45c'],
      ['Startup Pitch Fest', 'Startup pitching to investors.', '2026-07-05', 'Gurugram Hub', 'https://images.unsplash.com/photo-1526378722484-6f9f1f0f7f1f'],
      ['Hackathon 48 Hours', 'Coding competition.', '2026-07-10', 'Noida Tech Park', 'https://images.unsplash.com/photo-1515879216487-1a1323ba1a45'],
      ['Cybersecurity Seminar', 'Ethical hacking & security awareness.', '2026-07-18', 'Online', 'https://images.unsplash.com/photo-1519389950473-47ba0277781c']
    ];
    for (const event of sampleEvents) {
        await connection.query(
          "INSERT INTO events (title, description, date, location, image_url) VALUES (?, ?, ?, ?, ?)",
          event
        );
      }
    }

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

    await connection.query(`
      CREATE TABLE IF NOT EXISTS feedback (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NULL,
        user_name VARCHAR(255) NOT NULL DEFAULT 'Anonymous',
        topic VARCHAR(255) NOT NULL,
        rating INT NOT NULL DEFAULT 5,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

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
      ['Tech Conference 2025', 'A premier technology conference covering the latest trends in software, hardware, and innovation.', '2025-11-15', 'Mumbai Convention Center', 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&h=200&fit=crop'],
      ['Data Science Summit 2025', 'Deep dives into machine learning, big data, and analytics with industry experts.', '2025-12-10', 'Bengaluru Tech Hub', 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=200&fit=crop'],
      ['UI/UX Design Workshop', 'Hands-on workshop on modern design principles, Figma, and user research.', '2026-01-20', 'Pune Design Studio', 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&h=200&fit=crop'],
      ['Blockchain & Web3 Expo', 'Exploring decentralised applications, NFTs, and the future of the internet.', '2026-02-28', 'Hyderabad HICC', 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=400&h=200&fit=crop'],
      ['Annual Hackathon 2025', '48-hour coding marathon with exciting challenges and prizes.', '2025-10-05', 'Chennai Coding Campus', 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=400&h=200&fit=crop']
    ];

    for (const ev of pastEvents) {
      if (!existingTitles.includes(ev[0])) {
        await connection.query(
          "INSERT INTO events (title, description, date, location, image_url) VALUES (?, ?, ?, ?, ?)",
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
  } finally {
    await connection.end();
  }
};

module.exports = { pool, initDatabase };
