const cron = require('node-cron');
const { pool } = require('../config/database');
const { sendEventReminder } = require('./emailService');

// Track which (user_id, event_id, bucket) combos have already been notified
// to avoid sending duplicate reminders in the same run window.
// In a multi-process environment this should be stored in the DB; for a
// single-process server an in-memory Set is sufficient.
const notified = new Set();

const REMINDER_BUCKETS = [
  { label: '30min', minutesBefore: 30, windowMinutes: 1 },
  { label: '10min', minutesBefore: 10, windowMinutes: 1 },
  { label: '2min',  minutesBefore: 2,  windowMinutes: 1 }
];

/**
 * Check all upcoming events and send reminder emails to approved participants
 * whose event starts within each reminder window.
 */
const checkAndSendReminders = async () => {
  try {
    const now = new Date();

    for (const bucket of REMINDER_BUCKETS) {
      // Target datetime: the moment minutesBefore minutes in the future.
      // We look for events whose start_datetime is approximately that far away,
      // i.e. events that will start in ~minutesBefore minutes from now.
      const targetTime = new Date(now.getTime() + bucket.minutesBefore * 60 * 1000);
      const windowMs = (bucket.windowMinutes / 2) * 60 * 1000;

      const lowerBound = new Date(targetTime.getTime() - windowMs);
      const upperBound = new Date(targetTime.getTime() + windowMs);

      // Fetch events whose start_datetime falls within this window
      const [events] = await pool.query(
        `SELECT e.*, CONCAT(DATE_FORMAT(e.date,'%Y-%m-%d'), ' ', 
            IFNULL(e.start_time,'09:00:00')) AS start_datetime
         FROM events e
         WHERE CONCAT(DATE_FORMAT(e.date,'%Y-%m-%d'), ' ',
               IFNULL(e.start_time,'09:00:00'))
               BETWEEN ? AND ?`,
        [
          formatDatetime(lowerBound),
          formatDatetime(upperBound)
        ]
      );

      for (const event of events) {
        // Get all approved registrants for this event
        const [registrations] = await pool.query(
          `SELECT r.user_id, u.name as user_name, u.email as user_email
           FROM registrations r
           JOIN users u ON r.user_id = u.id
           WHERE r.event_id = ? AND r.status = 'approved'`,
          [event.id]
        );

        for (const reg of registrations) {
          const key = `${reg.user_id}:${event.id}:${bucket.label}`;
          if (notified.has(key)) continue;
          notified.add(key);

          try {
            await sendEventReminder({
              to: reg.user_email,
              userName: reg.user_name,
              eventTitle: event.title,
              eventDate: event.start_datetime,
              eventLocation: event.location,
              minutesLeft: bucket.minutesBefore
            });
            console.log(`[Reminders] Sent ${bucket.label} reminder to ${reg.user_email} for event "${event.title}"`);
          } catch (emailErr) {
            console.error(`[Reminders] Failed to send reminder to ${reg.user_email}:`, emailErr.message);
          }
        }
      }
    }
  } catch (err) {
    console.error('[Reminders] Scheduler error:', err.message);
  }
};

/** Format a Date as 'YYYY-MM-DD HH:mm:ss' for MySQL comparison */
const formatDatetime = (date) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
         `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

/**
 * Start the cron job.  Runs every minute.
 */
const startReminderScheduler = () => {
  // Purge the in-memory notified set once a day to avoid unbounded growth
  cron.schedule('0 0 * * *', () => {
    notified.clear();
    console.log('[Reminders] Notification cache cleared');
  });

  // Run the reminder check every minute
  cron.schedule('* * * * *', checkAndSendReminders);

  console.log('[Reminders] Event reminder scheduler started (runs every minute)');
};

module.exports = { startReminderScheduler };
