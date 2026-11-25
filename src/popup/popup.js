'use strict';

const DEFAULTS = { defaultMode: 'compact', recentCount: 6, detectLimit: true };
const $ = (id) => document.getElementById(id);

const fmtTime = (ts) =>
  new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

function fmtIn(ms) {
  const mins = Math.max(0, Math.round(ms / 60e3));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

// ---------- reminder ----------
async function renderReminder() {
  const { reminder } = await chrome.storage.local.get('reminder');
  const status = $('reminder-status');
  if (reminder && reminder.when > Date.now()) {
    const label = reminder.label ? ` for “${reminder.label}”` : '';
    status.textContent = `Reminder set${label}: ${fmtTime(reminder.when)} (in ${fmtIn(reminder.when - Date.now())}).`;
    $('reminder-clear').hidden = false;
  } else {
    status.textContent = 'No reminder set. You get a desktop notification when it fires.';
    $('reminder-clear').hidden = true;
  }
}

$('reminder-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const h = Math.max(0, Number($('r-hours').value) || 0);
  const m = Math.max(0, Number($('r-mins').value) || 0);
  const when = Date.now() + (h * 60 + m) * 60e3;
  const r = await chrome.runtime.sendMessage({ type: 'setReminder', when, label: $('r-label').value.trim() });
  if (!r || !r.ok) $('reminder-status').textContent = (r && r.error) || 'Could not set reminder.';
  else renderReminder();
});

$('reminder-clear').addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ type: 'clearReminder' });
  renderReminder();
});

// ---------- history ----------
function download(text, filename) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function filenameFor(item) {
  const slug = item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'chat';
  return `handoff-${slug}-${new Date(item.createdAt).toISOString().slice(0, 16).replace(/[-:T]/g, '')}.md`;
}

function button(label, onClick) {
  const b = document.createElement('button');
  b.textContent = label;
  b.addEventListener('click', onClick);
  return b;
}

async function renderHistory() {
  const { history = [] } = await chrome.storage.local.get('history');
  const list = $('history-list');
  list.replaceChildren();
  $('history-empty').hidden = history.length > 0;
  $('history-clear').hidden = history.length === 0;

  for (const item of history) {
    const li = document.createElement('li');

    const title = document.createElement('div');
    title.className = 'item-title';
    title.textContent = item.title;
    title.title = item.title;

    const meta = document.createElement('div');
    meta.className = 'item-meta';
    meta.textContent = `${fmtTime(item.createdAt)} · ${item.mode} · ~${(item.tokens || 0).toLocaleString()} tokens`;

    const actions = document.createElement('div');
    actions.className = 'item-actions';
    const copyBtn = button('Copy prompt', async () => {
      await navigator.clipboard.writeText(item.xml);
      copyBtn.textContent = 'Copied';
      setTimeout(() => (copyBtn.textContent = 'Copy prompt'), 1500);
    });
    actions.append(
      copyBtn,
      button('Download .md', () => download(item.markdown, filenameFor(item))),
      button('Delete', async () => {
        const { history: h = [] } = await chrome.storage.local.get('history');
        await chrome.storage.local.set({ history: h.filter((x) => x.id !== item.id) });
        renderHistory();
      })
    );

    li.append(title, meta, actions);
    list.appendChild(li);
  }
}

$('history-clear').addEventListener('click', async () => {
  await chrome.storage.local.set({ history: [] });
  renderHistory();
});

// ---------- settings ----------
async function renderSettings() {
  const { settings } = await chrome.storage.local.get('settings');
  const s = { ...DEFAULTS, ...(settings || {}) };
  $('s-mode').value = s.defaultMode;
  $('s-recent').value = s.recentCount;
  $('s-detect').checked = s.detectLimit;
}

async function saveSettings() {
  const recent = Math.min(40, Math.max(2, Math.round(Number($('s-recent').value) || DEFAULTS.recentCount)));
  $('s-recent').value = recent;
  await chrome.storage.local.set({
    settings: { defaultMode: $('s-mode').value, recentCount: recent, detectLimit: $('s-detect').checked },
  });
}
['s-mode', 's-recent', 's-detect'].forEach((id) => $(id).addEventListener('change', saveSettings));

renderReminder();
renderHistory();
renderSettings();
