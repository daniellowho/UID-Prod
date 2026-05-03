/* ── EventHub AI Chatbot Widget ──────────────────────────────────────────── */
(function () {
  'use strict';

  // ── Inject HTML ──────────────────────────────────────────────────────────
  function buildWidget() {
    document.head.insertAdjacentHTML('beforeend',
      '<link rel="stylesheet" href="/css/chatbot.css">'
    );

    document.body.insertAdjacentHTML('beforeend', `
      <!-- Chatbot toggle button -->
      <button class="chatbot-toggle" id="chatbotToggle" aria-label="Open chat assistant" title="Ask EventHub Assistant">
        <svg class="icon-chat" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <svg class="icon-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="display:none">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>

      <!-- Chatbot window -->
      <div class="chatbot-window" id="chatbotWindow" role="dialog" aria-label="EventHub Assistant">
        <div class="chatbot-header">
          <div class="chatbot-avatar">🤖</div>
          <div class="chatbot-header-info">
            <strong>EventHub Assistant</strong>
            <span>Ask me anything about events</span>
          </div>
          <button class="chatbot-header-close" id="chatbotClose" aria-label="Close chat">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div class="chatbot-messages" id="chatbotMessages"></div>

        <div class="cb-suggestions" id="chatbotSuggestions"></div>

        <div class="chatbot-input-row">
          <input class="chatbot-input" id="chatbotInput" type="text"
                 placeholder="Type a message…" autocomplete="off" maxlength="300">
          <button class="chatbot-send" id="chatbotSend" aria-label="Send message">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>
    `);
  }

  // ── DOM refs (populated after buildWidget) ───────────────────────────────
  let toggleBtn, windowEl, closeBtn, messagesEl, suggestionsEl, inputEl, sendBtn;

  // ── Open / close ─────────────────────────────────────────────────────────
  function openChat() {
    windowEl.classList.add('visible');
    toggleBtn.classList.add('open');
    toggleBtn.setAttribute('aria-label', 'Close chat assistant');
    inputEl.focus();
  }

  function closeChat() {
    windowEl.classList.remove('visible');
    toggleBtn.classList.remove('open');
    toggleBtn.setAttribute('aria-label', 'Open chat assistant');
  }

  // ── Escape HTML ──────────────────────────────────────────────────────────
  function esc(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
  }

  // ── Minimal markdown → HTML (bold + newlines only) ───────────────────────
  function mdToHtml(text) {
    return esc(text)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
  }

  // ── Scroll messages to bottom ────────────────────────────────────────────
  function scrollBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  // ── Append a chat bubble ─────────────────────────────────────────────────
  function appendMessage(html, role) {
    const wrap = document.createElement('div');
    wrap.className = `cb-msg ${role}`;
    const bubble = document.createElement('div');
    bubble.className = 'cb-bubble';
    bubble.innerHTML = html;
    wrap.appendChild(bubble);
    messagesEl.appendChild(wrap);
    scrollBottom();
    return bubble;
  }

  // ── Show / hide typing dots ──────────────────────────────────────────────
  let typingEl = null;
  function showTyping() {
    typingEl = document.createElement('div');
    typingEl.className = 'cb-typing';
    typingEl.innerHTML = `
      <div class="cb-typing-dots">
        <span></span><span></span><span></span>
      </div>`;
    messagesEl.appendChild(typingEl);
    scrollBottom();
  }
  function hideTyping() {
    if (typingEl) { typingEl.remove(); typingEl = null; }
  }

  // ── Render suggestion chips ──────────────────────────────────────────────
  function renderSuggestions(chips) {
    suggestionsEl.innerHTML = '';
    if (!chips || chips.length === 0) return;
    chips.forEach(label => {
      const btn = document.createElement('button');
      btn.className = 'cb-suggestion-chip';
      btn.textContent = label;
      btn.addEventListener('click', () => sendMessage(label));
      suggestionsEl.appendChild(btn);
    });
  }

  // ── Render a bot response ────────────────────────────────────────────────
  function renderBotResponse(data) {
    hideTyping();

    if (data.type === 'events') {
      // Main reply text
      appendMessage(mdToHtml(data.reply), 'bot');

      // Event cards
      if (data.events && data.events.length > 0) {
        const wrap = document.createElement('div');
        wrap.className = 'cb-msg bot';
        const bubble = document.createElement('div');
        bubble.className = 'cb-bubble';
        bubble.style.maxWidth = '100%';

        const list = document.createElement('div');
        list.className = 'cb-event-list';

        data.events.forEach(ev => {
          const card = document.createElement('div');
          card.className = 'cb-event-card';
          card.innerHTML = `
            <div class="cb-event-info">
              <strong>${esc(ev.title)}</strong>
              <span>📅 ${esc(ev.date)}${ev.time ? ' · ⏰ ' + esc(ev.time) : ''}</span>
              <span>📍 ${esc(ev.location)}</span>
            </div>
            <a href="event-detail.html?id=${encodeURIComponent(ev.id)}" class="btn btn-primary">View &amp; Register</a>
          `;
          list.appendChild(card);
        });

        bubble.appendChild(list);

        if (data.action) {
          const link = document.createElement('a');
          link.className = 'cb-action-link';
          link.href = data.action.url;
          link.textContent = data.action.label;
          bubble.appendChild(link);
        }

        wrap.appendChild(bubble);
        messagesEl.appendChild(wrap);
        scrollBottom();
      }
    } else if (data.type === 'link') {
      const html = mdToHtml(data.reply) +
        (data.action
          ? `<br><a class="cb-action-link" href="${esc(data.action.url)}">${esc(data.action.label)}</a>`
          : '');
      appendMessage(html, 'bot');
    } else {
      // text / markdown / fallback
      appendMessage(mdToHtml(data.reply), 'bot');
      if (data.action) {
        appendMessage(`<a class="cb-action-link" href="${esc(data.action.url)}">${esc(data.action.label)}</a>`, 'bot');
      }
    }

    renderSuggestions(data.suggestions);
  }

  // ── Send a message ───────────────────────────────────────────────────────
  async function sendMessage(text) {
    const msg = (text || inputEl.value).trim();
    if (!msg) return;

    inputEl.value = '';
    sendBtn.disabled = true;
    suggestionsEl.innerHTML = '';

    appendMessage(esc(msg), 'user');
    showTyping();

    try {
      const res = await fetch('/api/chatbot/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg })
      });

      if (!res.ok) throw new Error('Server error');
      const data = await res.json();
      renderBotResponse(data);
    } catch {
      hideTyping();
      appendMessage("⚠️ Sorry, I couldn't reach the server. Please try again.", 'bot');
    } finally {
      sendBtn.disabled = false;
      inputEl.focus();
    }
  }

  // ── Welcome message ──────────────────────────────────────────────────────
  function showWelcome() {
    appendMessage("👋 Hi! I'm the <strong>EventHub Assistant</strong>. How can I help you today?", 'bot');
    renderSuggestions([
      'What events are happening?',
      'Book a ticket',
      'Event timing & dates',
      'My bookings',
      'Contact organizer'
    ]);
  }

  // ── Init ─────────────────────────────────────────────────────────────────
  function init() {
    buildWidget();

    toggleBtn    = document.getElementById('chatbotToggle');
    windowEl     = document.getElementById('chatbotWindow');
    closeBtn     = document.getElementById('chatbotClose');
    messagesEl   = document.getElementById('chatbotMessages');
    suggestionsEl = document.getElementById('chatbotSuggestions');
    inputEl      = document.getElementById('chatbotInput');
    sendBtn      = document.getElementById('chatbotSend');

    toggleBtn.addEventListener('click', () =>
      windowEl.classList.contains('visible') ? closeChat() : openChat()
    );
    closeBtn.addEventListener('click', closeChat);

    sendBtn.addEventListener('click', () => sendMessage());
    inputEl.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });

    showWelcome();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
