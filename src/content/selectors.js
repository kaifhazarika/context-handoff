// DOM selectors for claude.ai. The site's markup changes from time to time;
// when extraction breaks, this is the only file that should need editing.
// Each list is tried together; the first matching selectors win.
(() => {
  'use strict';
  const NS = (globalThis.CHX = globalThis.CHX || {});

  NS.SELECTORS = {
    // A single human turn.
    user: ['[data-testid="user-message"]'],

    // A single assistant turn (several fallbacks for older/newer markup).
    assistant: [
      '.font-claude-response',
      '.font-claude-message',
      '[data-testid="assistant-message"]',
    ],

    // Elements whose text should never end up in a handoff
    // (copy buttons, icons, screen-reader-only labels, form controls).
    ignore: [
      'button',
      'svg',
      'style',
      'script',
      'textarea',
      'input',
      'select',
      '.sr-only',
      '[aria-hidden="true"]',
    ],

    // Places where limit-notice text should NOT be detected
    // (chat content itself and the message composer).
    noLimitScan: ['[contenteditable="true"]', '#context-handoff-root'],
  };
})();
