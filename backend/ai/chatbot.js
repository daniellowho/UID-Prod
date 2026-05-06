const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// ── Intent classifier ──────────────────────────────────────────────────────
const INTENTS = [
  {
    name: 'greeting',
    patterns: [/\b(hi|hello|hey|howdy|good\s*(morning|afternoon|evening)|what(?:'s| is) up|sup)\b/i]
  },
  {
    name: 'events_list',
    patterns: [/\b(event|events|happening|show|list|available|upcoming|what(?:'s|s) on|all events)\b/i]
  },
  {
    name: 'book_ticket',
    patterns: [/\b(book|register|ticket|sign\s*up|enroll|join|attend)\b/i]
  },
  {
    name: 'timing',
    patterns: [/\b(time|timing|when|date|schedule|start|duration)\b/i]
  },
  {
    name: 'location',
    patterns: [/\b(location|where|venue|place|address|held|area|city)\b/i]
  },
  {
    name: 'my_bookings',
    patterns: [/\b(my (booking|registration|event|ticket)|my\s*event|dashboard)\b/i]
  },
  {
    name: 'contact',
    patterns: [/\b(contact|organiz|help|support|email|reach|talk to|speak)\b/i]
  }
];

function detectIntent(message) {
  const lower = message.toLowerCase().trim();
  for (const intent of INTENTS) {
    if (intent.patterns.some(p => p.test(lower))) {
      return intent.name;
    }
  }
  return 'fallback';
}

// ── DB helpers ─────────────────────────────────────────────────────────────
async function getUpcomingEvents(limit = 5) {
  try {
    const [rows] = await pool.query(
      `SELECT id, title, date, start_time, location
       FROM events
       WHERE date >= CURDATE()
       ORDER BY date ASC
       LIMIT ?`,
      [limit]
    );
    return rows;
  } catch (error) {
    console.error('Chatbot DB query failed:', error.message);
    return [];
  }
}

// ── Format helpers ─────────────────────────────────────────────────────────
function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-US', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
  });
}

function fmtTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

// ── Main handler ───────────────────────────────────────────────────────────
router.post('/message', async (req, res) => {
  const { message } = req.body;

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'message is required' });
  }

  const intent = detectIntent(message);

  try {
    switch (intent) {
      case 'greeting': {
        return res.json({
          type: 'text',
          reply: "👋 Hey there! I'm the EventHub assistant. Here's what I can help with:",
          suggestions: [
            'What events are happening?',
            'Book a ticket',
            'Event timing & dates',
            'My bookings',
            'Contact organizer'
          ]
        });
      }

      case 'events_list': {
        const events = await getUpcomingEvents(5);
        if (events.length === 0) {
          return res.json({
            type: 'text',
            reply: "📭 There are no upcoming events right now. Check back soon!",
            suggestions: ['My bookings', 'Contact organizer']
          });
        }
        return res.json({
          type: 'events',
          reply: `🎉 Here are the next ${events.length} upcoming event${events.length > 1 ? 's' : ''}:`,
          events: events.map(e => ({
            id: e.id,
            title: e.title,
            date: fmtDate(e.date),
            time: fmtTime(e.start_time),
            location: e.location || 'TBD'
          })),
          suggestions: ['Book a ticket', 'Event timing & dates', 'Event locations']
        });
      }

      case 'book_ticket': {
        const events = await getUpcomingEvents(5);
        if (events.length === 0) {
          return res.json({
            type: 'text',
            reply: "📭 No upcoming events available to book right now.",
            suggestions: ['What events are happening?', 'Contact organizer']
          });
        }
        return res.json({
          type: 'events',
          reply: "🎟️ Choose an event to register for — click **View & Register** on any card:",
          events: events.map(e => ({
            id: e.id,
            title: e.title,
            date: fmtDate(e.date),
            time: fmtTime(e.start_time),
            location: e.location || 'TBD'
          })),
          action: { label: 'Browse all events →', url: 'events.html' },
          suggestions: ['My bookings', 'What events are happening?']
        });
      }

      case 'timing': {
        const events = await getUpcomingEvents(5);
        if (events.length === 0) {
          return res.json({ type: 'text', reply: "📭 No upcoming events found.", suggestions: [] });
        }
        const lines = events.map(e =>
          `• **${e.title}** — ${fmtDate(e.date)}${e.start_time ? ' at ' + fmtTime(e.start_time) : ''}`
        );
        return res.json({
          type: 'markdown',
          reply: `🕐 **Upcoming event schedule:**\n\n${lines.join('\n')}`,
          suggestions: ['Event locations', 'Book a ticket', 'My bookings']
        });
      }

      case 'location': {
        const events = await getUpcomingEvents(5);
        if (events.length === 0) {
          return res.json({ type: 'text', reply: "📭 No upcoming events found.", suggestions: [] });
        }
        const lines = events.map(e =>
          `• **${e.title}** — 📍 ${e.location || 'TBD'}`
        );
        return res.json({
          type: 'markdown',
          reply: `📍 **Event venues:**\n\n${lines.join('\n')}`,
          suggestions: ['Event timing & dates', 'Book a ticket']
        });
      }

      case 'my_bookings': {
        return res.json({
          type: 'link',
          reply: "📋 You can view all your registrations and booking statuses on your dashboard.",
          action: { label: 'Go to My Dashboard →', url: 'user-dashboard.html' },
          suggestions: ['What events are happening?', 'Book a ticket']
        });
      }

      case 'contact': {
        return res.json({
          type: 'text',
          reply: "📬 **Need to reach an organizer?**\n\nYou can contact the EventHub team at:\n• ✉️ support@eventhub.com\n• For event-specific queries, open the event detail page and use the contact form.",
          suggestions: ['What events are happening?', 'My bookings']
        });
      }

      default: {
        return res.json({
          type: 'text',
          reply: "🤔 I'm not sure about that. Here are things I can help with:",
          suggestions: [
            'What events are happening?',
            'Book a ticket',
            'Event timing & dates',
            'Event locations',
            'My bookings',
            'Contact organizer'
          ]
        });
      }
    }
  } catch (error) {
    console.error('Chatbot error:', error);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

module.exports = router;
