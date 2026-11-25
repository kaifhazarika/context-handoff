// Detects usage-limit notices and parses a reset time out of them.
(() => {
  'use strict';
  const NS = (globalThis.CHX = globalThis.CHX || {});

  NS.LIMIT_PATTERNS = [
    /usage limit/i,
    /message limit/i,
    /out of (free )?messages/i,
    /reached your .{0,40}limit/i,
    /(limit|messages?) (will )?resets?/i,
  ];

  NS.looksLikeLimitNotice = function looksLikeLimitNotice(text) {
    if (!text || text.length > 2000) return false;
    return NS.LIMIT_PATTERNS.some((re) => re.test(text));
  };

  /**
   * Parse a reset time from notice text such as
   * "...until 3:00 PM", "resets at 15:30", "try again in 2 hours".
   * Returns a Date in the future, or null.
   */
  NS.parseResetTime = function parseResetTime(text, now = new Date()) {
    if (!text) return null;

    let m = text.match(/\bin\s+(\d+)\s*(hours?|hrs?|h|minutes?|mins?|m)\b/i);
    if (m) {
      const n = Number(m[1]);
      const ms = /^h/i.test(m[2]) ? n * 3600e3 : n * 60e3;
      return ms > 0 ? new Date(now.getTime() + ms) : null;
    }

    m =
      text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i) ||
      text.match(/\b(?:until|at)\s+(\d{1,2}):(\d{2})\b/i);
    if (!m) return null;

    let hour = Number(m[1]);
    const minute = m[2] ? Number(m[2]) : 0;
    const ampm = m[3] ? m[3].toLowerCase() : null;
    if (ampm) {
      if (hour < 1 || hour > 12) return null;
      if (hour === 12) hour = 0;
      if (ampm === 'pm') hour += 12;
    }
    if (hour > 23 || minute > 59) return null;

    const d = new Date(now.getTime());
    d.setHours(hour, minute, 0, 0);
    if (d <= now) d.setDate(d.getDate() + 1);
    return d;
  };
})();
