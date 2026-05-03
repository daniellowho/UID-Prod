const mysql = require('mysql2/promise');
require('dotenv').config();


const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  port: process.env.MYSQLPORT,
  waitForConnections: true,
  connectionLimit: 10
});
const initDatabase = async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Socialboy@123'
  });

  try {
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'event_management'}`);
    await connection.query(`USE ${process.env.DB_NAME || 'event_management'}`);

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

    console.log('Database initialized successfully');
  } finally {
    await connection.end();
  }
};

module.exports = { pool, initDatabase };
