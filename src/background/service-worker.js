// Background service worker: reset reminder (chrome.alarms + notifications)
// and the keyboard shortcut. No network access, no cookies, no credentials.
'use strict';

const ALARM = 'reset-reminder';
const NOTIF = 'chx-reset';

async function setReminder(when, label) {
  if (!Number.isFinite(when) || when < Date.now() + 30e3) {
    throw new Error('Reminder time must be at least 30 seconds in the future.');
  }
  await chrome.alarms.clear(ALARM);
  await chrome.alarms.create(ALARM, { when });
  await chrome.storage.local.set({ reminder: { when, label: String(label || '').slice(0, 200) } });
}

async function clearReminder() {
  await chrome.alarms.clear(ALARM);
  await chrome.storage.local.remove('reminder');
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || typeof msg !== 'object') return;
  if (msg.type === 'setReminder') {
    setReminder(msg.when, msg.label)
      .then(() => sendResponse({ ok: true }))
      .catch((e) => sendResponse({ ok: false, error: e.message }));
    return true; // async response
  }
  if (msg.type === 'clearReminder') {
    clearReminder()
      .then(() => sendResponse({ ok: true }))
      .catch((e) => sendResponse({ ok: false, error: e.message }));
    return true;
  }
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== ALARM) return;
  const { reminder } = await chrome.storage.local.get('reminder');
  chrome.notifications.create(NOTIF, {
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icons/icon128.png'),
    title: 'Your usage limit should have reset',
    message: reminder && reminder.label
      ? `Ready to continue: ${reminder.label}`
      : 'You can pick up your task again.',
    priority: 1,
  });
  await chrome.storage.local.remove('reminder');
});

chrome.notifications.onClicked.addListener((id) => {
  if (id !== NOTIF) return;
  chrome.tabs.create({ url: 'https://claude.ai/new' });
  chrome.notifications.clear(id);
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'open-handoff') return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && tab.id && tab.url && tab.url.startsWith('https://claude.ai/')) {
    chrome.tabs.sendMessage(tab.id, { type: 'togglePanel' }).catch(() => {});
  }
});
