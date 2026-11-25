// Injects the floating Handoff button + panel into claude.ai (inside a shadow root
// so page styles can't leak in), and watches for usage-limit notices.
(() => {
  'use strict';
  const NS = globalThis.CHX;
  if (!NS || globalThis.__chxUiLoaded) return;
  globalThis.__chxUiLoaded = true;

  const DEFAULTS = { defaultMode: 'compact', recentCount: 6, detectLimit: true };
  const HISTORY_MAX = 20;

  let settings = { ...DEFAULTS };
  let messages = [];
  let current = null;
  let limitAlerted = false;
  let resetAt = null;
  let panelInitialised = false;

  // ---------- storage helpers (tolerate "extension context invalidated") ----------
  const alive = () => {
    try {
      return Boolean(chrome.runtime && chrome.runtime.id);
    } catch {
      return false;
    }
  };

  async function loadSettings() {
    if (!alive()) return;
    try {
      const r = await chrome.storage.local.get('settings');
      settings = { ...DEFAULTS, ...(r.settings || {}) };
    } catch {}
  }

  async function saveHistory(entry) {
    if (!alive()) return;
    try {
      const r = await chrome.storage.local.get('history');
      const history = [entry, ...(r.history || [])].slice(0, HISTORY_MAX);
      await chrome.storage.local.set({ history });
    } catch {}
  }

  // ---------- markup ----------
  const CSS = `
    :host { all: initial; }
    .wrap {
      --bg: #fbfaf7; --fg: #2b2a27; --muted: #6f6b62; --border: #e2ddd2;
      --accent: #c96442; --accent-fg: #ffffff; --field: #ffffff; --shadow: 0 8px 28px rgba(0,0,0,.14);
      font: 13px/1.45 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      color: var(--fg);
    }
    .wrap[data-theme="dark"] {
      --bg: #2f2e2b; --fg: #eeece6; --muted: #aaa59a; --border: #4a4843;
      --accent: #d97757; --accent-fg: #1f1e1b; --field: #262522; --shadow: 0 8px 28px rgba(0,0,0,.5);
    }
    button { font: inherit; cursor: pointer; border-radius: 8px; border: 1px solid var(--border);
      background: var(--bg); color: var(--fg); padding: 6px 10px; }
    button:hover { border-color: var(--accent); }
    button.primary { background: var(--accent); color: var(--accent-fg); border-color: var(--accent); }
    button.ghost { border: none; background: transparent; padding: 2px 6px; color: var(--muted); }
    .fab { position: fixed; right: 20px; bottom: 112px; z-index: 2147483000;
      box-shadow: var(--shadow); padding: 8px 12px; font-weight: 600; }
    .fab.alert { background: var(--accent); color: var(--accent-fg); border-color: var(--accent);
      animation: pulse 1.6s ease-in-out infinite; }
    @keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.06); } }
    @media (prefers-reduced-motion: reduce) { .fab.alert { animation: none; } }
    .panel, .toast { position: fixed; right: 20px; z-index: 2147483001; background: var(--bg);
      border: 1px solid var(--border); border-radius: 12px; box-shadow: var(--shadow); }
    .panel { bottom: 160px; width: 340px; max-width: calc(100vw - 40px); padding: 12px 14px; }
    .toast { bottom: 160px; width: 320px; padding: 10px 12px; }
    [hidden] { display: none !important; }
    header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .seg { display: flex; gap: 12px; margin-bottom: 8px; }
    label { display: flex; align-items: center; gap: 6px; }
    label.col { flex-direction: column; align-items: stretch; margin-top: 8px; }
    input[type=number] { width: 56px; }
    input, textarea { font: inherit; color: var(--fg); background: var(--field);
      border: 1px solid var(--border); border-radius: 6px; padding: 4px 6px; }
    textarea { resize: vertical; }
    .stats { margin-top: 8px; color: var(--muted); font-size: 12px; }
    .actions, .toast-actions { display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
    .status { min-height: 1.2em; margin-top: 6px; font-size: 12px; color: var(--muted); }
  `;

  const TEMPLATE = `
    <div class="wrap">
      <button class="fab" title="Create a context handoff (Alt+Shift+H)">&#8644; Handoff</button>

      <div class="toast" hidden role="status">
        <div class="toast-msg"></div>
        <div class="toast-actions">
          <button class="primary" data-act="open">Create handoff</button>
          <button data-act="remind" hidden></button>
          <button class="ghost" data-act="dismiss" aria-label="Dismiss">&times;</button>
        </div>
      </div>

      <div class="panel" hidden role="dialog" aria-label="Context handoff">
        <header>
          <strong>Context handoff</strong>
          <button class="ghost" data-act="close" aria-label="Close">&times;</button>
        </header>
        <div class="seg">
          <label><input type="radio" name="mode" value="compact"> Compact</label>
          <label><input type="radio" name="mode" value="full"> Full transcript</label>
        </div>
        <label class="recent">Recent messages to keep
          <input type="number" name="recent" min="2" max="40" step="1">
        </label>
        <label class="col">Next step (optional)
          <textarea name="next" rows="3" placeholder="e.g. Fix the overlapping x-axis labels, then add storm-time shading"></textarea>
        </label>
        <div class="stats"></div>
        <div class="actions">
          <button class="primary" data-act="copy">Copy resume prompt</button>
          <button data-act="download">Download .md</button>
        </div>
        <div class="status" aria-live="polite"></div>
      </div>
    </div>`;

  const host = document.createElement('div');
  host.id = 'context-handoff-root';
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `<style>${CSS}</style>${TEMPLATE}`;

  const $ = (s) => shadow.querySelector(s);
  const wrap = $('.wrap');
  const fab = $('.fab');
  const panel = $('.panel');
  const toast = $('.toast');
  const toastMsg = $('.toast-msg');
  const remindBtn = $('[data-act="remind"]');
  const recentRow = $('.recent');
  const recentInput = $('input[name="recent"]');
  const nextInput = $('textarea[name="next"]');
  const statsEl = $('.stats');
  const statusEl = $('.status');

  // ---------- theme ----------
  function isDark() {
    const el = document.documentElement;
    const flags = [el.className, el.dataset.theme, el.dataset.mode, document.body && document.body.className]
      .join(' ')
      .toLowerCase();
    if (/\bdark\b/.test(flags)) return true;
    if (/\blight\b/.test(flags)) return false;
    if (document.body) {
      const nums = (getComputedStyle(document.body).backgroundColor.match(/[\d.]+/g) || []).map(Number);
      const transparent = nums.length === 4 && nums[3] === 0;
      if (nums.length >= 3 && !transparent) {
        const [r, g, b] = nums;
        return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 < 0.5;
      }
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  const applyTheme = () => (wrap.dataset.theme = isDark() ? 'dark' : 'light');

  // ---------- clipboard / download ----------
  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;opacity:0;left:-9999px';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    }
  }

  function downloadText(text, filename) {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  function handoffFilename(title) {
    const slug =
      title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'chat';
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return `handoff-${slug}-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.md`;
  }

  // ---------- panel ----------
  const mode = () => (shadow.querySelector('input[name="mode"]:checked') || {}).value || 'compact';

  function rebuild() {
    const title = NS.conversationTitle();
    current = NS.buildHandoff(messages, {
      mode: mode(),
      recentCount: Number(recentInput.value) || settings.recentCount,
      nextStep: nextInput.value,
      title,
      url: location.href,
    });
    current.title = title;
    recentRow.hidden = mode() === 'full';

    const s = current.stats;
    if (!s.total) {
      statsEl.textContent =
        'No messages found on this page. Open a chat, or update src/content/selectors.js if claude.ai changed its layout.';
      return;
    }
    let text = `${s.included} of ${s.total} messages`;
    if (s.files) text += ` · ${s.files} earlier file(s) kept`;
    if (s.droppedBlocks) text += ` · ${s.droppedBlocks} unnamed snippet(s) dropped`;
    text += ` · ~${s.tokens.toLocaleString()} tokens`;
    statsEl.textContent = text;
  }

  function openPanel() {
    toast.hidden = true;
    applyTheme();
    if (!panelInitialised) {
      const radio = shadow.querySelector(`input[name="mode"][value="${settings.defaultMode}"]`);
      (radio || shadow.querySelector('input[name="mode"]')).checked = true;
      recentInput.value = settings.recentCount;
      panelInitialised = true;
    }
    messages = NS.extractMessages(document);
    statusEl.textContent = '';
    rebuild();
    panel.hidden = false;
  }

  const closePanel = () => (panel.hidden = true);
  const togglePanel = () => (panel.hidden ? openPanel() : closePanel());

  async function onCopy() {
    if (!current || !current.stats.total) return;
    const ok = await copyText(current.xml);
    statusEl.textContent = ok
      ? 'Copied. Paste it into a new chat.'
      : 'Copy failed. Try Download .md instead.';
    if (ok) record();
  }

  function onDownload() {
    if (!current || !current.stats.total) return;
    downloadText(current.markdown, handoffFilename(current.title));
    statusEl.textContent = 'Downloaded. Attach the file to a new chat.';
    record();
  }

  function record() {
    saveHistory({
      id: Date.now().toString(36),
      title: current.title,
      createdAt: Date.now(),
      mode: mode(),
      tokens: current.stats.tokens,
      xml: current.xml,
      markdown: current.markdown,
    });
  }

  // ---------- limit detection ----------
  function showLimitToast(text) {
    limitAlerted = true;
    fab.classList.add('alert');
    resetAt = NS.parseResetTime(text);
    toastMsg.textContent =
      'Looks like the usage limit was reached. Save a handoff now, while this chat is still open.';
    if (resetAt) {
      remindBtn.textContent = `Remind me at ${resetAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
      remindBtn.hidden = false;
    } else {
      remindBtn.hidden = true;
    }
    applyTheme();
    if (panel.hidden) toast.hidden = false;
  }

  async function onRemind() {
    if (!resetAt || !alive()) return;
    try {
      const r = await chrome.runtime.sendMessage({
        type: 'setReminder',
        when: resetAt.getTime() + 60e3, // one minute of slack after the stated time
        label: NS.conversationTitle(),
      });
      toastMsg.textContent = r && r.ok ? 'Reminder set.' : `Could not set reminder: ${(r && r.error) || 'unknown error'}`;
    } catch (e) {
      toastMsg.textContent = 'Could not set reminder (reload the page after updating the extension).';
    }
    remindBtn.hidden = true;
  }

  const skipSelector = () =>
    [...NS.SELECTORS.user, ...NS.SELECTORS.assistant, ...NS.SELECTORS.noLimitScan].join(',');

  function scanMutations(mutations) {
    if (!host.isConnected && document.body) document.body.appendChild(host);
    if (!settings.detectLimit || limitAlerted) return;
    const skip = skipSelector();
    for (const m of mutations) {
      for (const n of m.addedNodes) {
        const el = n.nodeType === 1 ? n : n.parentElement;
        if (!el || el.closest(skip)) continue;
        const text = n.textContent || '';
        if (NS.looksLikeLimitNotice(text)) {
          showLimitToast(text);
          return;
        }
      }
    }
  }

  // ---------- wiring ----------
  fab.addEventListener('click', togglePanel);
  shadow.addEventListener('click', (e) => {
    const act = e.target.closest && e.target.closest('[data-act]');
    if (!act) return;
    switch (act.dataset.act) {
      case 'close': return closePanel();
      case 'copy': return onCopy();
      case 'download': return onDownload();
      case 'open': return openPanel();
      case 'remind': return onRemind();
      case 'dismiss':
        toast.hidden = true;
        fab.classList.remove('alert');
        return;
    }
  });
  shadow.addEventListener('change', (e) => {
    if (e.target.name === 'mode' || e.target.name === 'recent') rebuild();
  });
  let t;
  nextInput.addEventListener('input', () => {
    clearTimeout(t);
    t = setTimeout(rebuild, 200);
  });
  // Keep keystrokes in our textarea from reaching claude.ai's shortcuts.
  shadow.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePanel();
    e.stopPropagation();
  });

  if (alive()) {
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg && msg.type === 'togglePanel') togglePanel();
    });
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.settings) {
        settings = { ...DEFAULTS, ...(changes.settings.newValue || {}) };
      }
    });
  }

  loadSettings().then(() => {
    document.body.appendChild(host);
    applyTheme();
    new MutationObserver(scanMutations).observe(document.body, { childList: true, subtree: true });
    new MutationObserver(applyTheme).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme', 'data-mode', 'style'],
    });
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
  });
})();
