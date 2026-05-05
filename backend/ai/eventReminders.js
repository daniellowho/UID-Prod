const cron = require('node-cron');
const { pool } = require('../config/database');
const { sendEventReminder } = require('./emailService');

// Reminder buckets: 30 mins to go, 15 mins to go, 5 mins to go (join now!)
const REMINDER_BUCKETS = [
  { label: '30min', minutesBefore: 30, windowMinutes: 1 },
  { label: '15min', minutesBefore: 15, windowMinutes: 1 },
  { label: '5min',  minutesBefore: 5,  windowMinutes: 1 }
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
      // We look for events whose start_datetime is approximately that far away.
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

        if (registrations.length === 0) continue;

        // Bulk-fetch already-sent reminders for this event/bucket to avoid
        // unnecessary DB writes in the per-user loop below.
        const [alreadySentRows] = await pool.query(
          `SELECT user_id FROM reminder_sent_log WHERE event_id = ? AND bucket_label = ?`,
          [event.id, bucket.label]
        );
        const alreadySent = new Set(alreadySentRows.map(r => r.user_id));

        for (const reg of registrations) {
          if (alreadySent.has(reg.user_id)) continue;

          // Use DB-backed deduplication so reminders aren't re-sent after restarts.
          // INSERT IGNORE returns affectedRows=0 if the row already existed.
          try {
            const [insertResult] = await pool.query(
              `INSERT IGNORE INTO reminder_sent_log (user_id, event_id, bucket_label) VALUES (?, ?, ?)`,
              [reg.user_id, event.id, bucket.label]
            );
            if (insertResult.affectedRows === 0) continue; // another process beat us to it
          } catch (dbErr) {
            console.error('[Reminders] DB deduplication error:', dbErr.message);
            continue;
          }

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
            // Roll back the deduplication record so it can be retried next minute
            try {
              await pool.query(
                `DELETE FROM reminder_sent_log WHERE user_id = ? AND event_id = ? AND bucket_label = ?`,
                [reg.user_id, event.id, bucket.label]
              );
            } catch (delErr) {
              console.error('[Reminders] Failed to roll back reminder_sent_log:', delErr.message);
            }
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
  // Run the reminder check every minute
  cron.schedule('* * * * *', checkAndSendReminders);

  console.log('[Reminders] Event reminder scheduler started – buckets: 30 min, 15 min, 5 min');
};

module.exports = { startReminderScheduler };
