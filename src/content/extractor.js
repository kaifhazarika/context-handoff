// Reads the open conversation from the page DOM into plain data:
//   [{ role: 'user'|'assistant', markdown, codeBlocks: [{ lang, code, filename }] }]
(() => {
  'use strict';
  const NS = (globalThis.CHX = globalThis.CHX || {});

  const KNOWN_EXT = [
    'py', 'ipynb', 'js', 'mjs', 'cjs', 'ts', 'tsx', 'jsx', 'json', 'md', 'html', 'htm',
    'css', 'scss', 'sh', 'bash', 'zsh', 'ps1', 'bat', 'yml', 'yaml', 'toml', 'ini', 'cfg',
    'conf', 'txt', 'csv', 'tsv', 'xml', 'sql', 'c', 'h', 'cpp', 'hpp', 'cc', 'cs', 'java',
    'kt', 'go', 'rs', 'rb', 'php', 'r', 'm', 'jl', 'f', 'f90', 'f95', 'pro', 'ncl', 'tex',
    'bib', 'lua', 'swift', 'dart', 'vue', 'svelte', 'env', 'gradle', 'mk', 'nc',
  ].join('|');
  const FILE_RE = new RegExp(`([\\w./-]*[\\w-]\\.(?:${KNOWN_EXT}))(?![\\w])`, 'gi');
  const COMMENT_START = /^\s*(#|\/\/|--|\/\*|<!--|%|;|!)/;

  const messageSelector = () => [...NS.SELECTORS.user, ...NS.SELECTORS.assistant].join(',');

  function lastFileMatch(text) {
    const all = Array.from(text.matchAll(FILE_RE));
    return all.length ? all[all.length - 1][1] : null;
  }

  /** Best-effort filename for a code block: a "# file: x.py" first line, or a name just before it. */
  function detectFilename(pre, code, messageEl) {
    const first = code.split('\n', 1)[0] || '';
    if (COMMENT_START.test(first)) {
      const f = lastFileMatch(first);
      if (f) return f;
    }

    // Walk up to the nearest ancestor (inside the message) that has a previous sibling.
    let node = pre;
    while (node && node !== messageEl && !node.previousElementSibling) node = node.parentElement;
    if (!node || node === messageEl) return null;
    const prevText = (node.previousElementSibling.textContent || '').slice(-200);
    return lastFileMatch(prevText);
  }

  function findMessageElements(root) {
    const all = Array.from(root.querySelectorAll(messageSelector()));
    // Keep only outermost matches (some fallbacks can nest).
    return all.filter((el) => !all.some((other) => other !== el && other.contains(el)));
  }

  function extractMessages(root = document) {
    const userSel = NS.SELECTORS.user.join(',');
    return findMessageElements(root)
      .map((el) => {
        const role = el.matches(userSel) ? 'user' : 'assistant';
        const markdown = NS.htmlToMarkdown(el);
        const codeBlocks = Array.from(el.querySelectorAll('pre')).map((pre) => {
          const code = NS.codeText(pre);
          return { lang: NS.codeLang(pre), code, filename: detectFilename(pre, code, el) };
        });
        return { role, markdown, codeBlocks };
      })
      .filter((m) => m.markdown.trim());
  }

  function conversationTitle(doc = document) {
    const t = (doc.title || '').replace(/\s*[-–|]\s*Claude\s*$/i, '').trim();
    return t && !/^claude$/i.test(t) ? t : 'Untitled chat';
  }

  NS.detectFilename = detectFilename;
  NS.findMessageElements = findMessageElements;
  NS.extractMessages = extractMessages;
  NS.conversationTitle = conversationTitle;
})();
