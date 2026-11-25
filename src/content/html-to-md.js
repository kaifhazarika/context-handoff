// Minimal, dependency-free HTML -> Markdown converter tuned for chat messages.
// Handles paragraphs, headings, lists, code blocks, inline code, emphasis,
// links, blockquotes, tables and KaTeX math (emitted as $...$ / $$...$$).
(() => {
  'use strict';
  const NS = (globalThis.CHX = globalThis.CHX || {});

  const BLOCK_TAGS = new Set([
    'P', 'DIV', 'SECTION', 'ARTICLE', 'HEADER', 'FOOTER', 'MAIN', 'ASIDE',
    'UL', 'OL', 'LI', 'PRE', 'BLOCKQUOTE', 'TABLE', 'HR', 'FIGURE', 'DETAILS',
  ]);

  // Placeholders protect code blocks from whitespace normalisation.
  const PH = (i) => `\u0000CHX${i}\u0000`;
  const PH_RE = /\u0000CHX(\d+)\u0000/g;

  const ignoreSelector = () => NS.SELECTORS.ignore.join(',');

  function fence(lang, code) {
    const runs = code.match(/`{3,}/g) || [];
    const n = Math.max(3, ...runs.map((r) => r.length + 1));
    const f = '`'.repeat(n);
    return `${f}${lang || ''}\n${code}\n${f}`;
  }

  function codeLang(pre) {
    const code = pre.querySelector('code');
    const candidates = [code, pre].filter(Boolean);
    for (const el of candidates) {
      const cls = typeof el.className === 'string' ? el.className : '';
      const m = cls.match(/(?:language|lang)-([\w+#.-]+)/);
      if (m) return m[1];
      const data = el.getAttribute('data-language');
      if (data) return data;
    }
    return '';
  }

  function codeText(pre) {
    let src = pre.querySelector('code');
    if (!src) {
      src = pre.cloneNode(true);
      src.querySelectorAll(ignoreSelector()).forEach((n) => n.remove());
    }
    return src.textContent.replace(/\s+$/, '');
  }

  function htmlToMarkdown(root) {
    const IGNORE = ignoreSelector();
    const codes = [];
    const stash = (s) => {
      codes.push(s);
      return PH(codes.length - 1);
    };
    const block = (s) => (s ? `\n\n${s}\n\n` : '');
    const tidy = (s) => s.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n');
    const restore = (s) => s.replace(PH_RE, (_, i) => codes[Number(i)]);

    function kids(el, ctx) {
      let out = '';
      for (const c of el.childNodes) out += walk(c, ctx);
      return out;
    }

    function inline(marker, el, ctx) {
      const t = kids(el, ctx);
      const m = t.match(/^(\s*)([\s\S]*?)(\s*)$/);
      return m[2] ? `${m[1]}${marker}${m[2]}${marker}${m[3]}` : t;
    }

    function katex(el) {
      const ann = el.querySelector('annotation[encoding="application/x-tex"]');
      const tex = (ann ? ann.textContent : el.textContent).trim();
      if (!tex) return '';
      return el.closest('.katex-display') ? block(stash(`$$\n${tex}\n$$`)) : `$${tex}$`;
    }

    function list(el, ctx) {
      const ordered = el.tagName === 'OL';
      const start = parseInt(el.getAttribute('start') || '1', 10) || 1;
      const items = Array.from(el.children).filter((c) => c.tagName === 'LI');
      return items
        .map((li, i) => {
          const marker = ordered ? `${start + i}. ` : '- ';
          const pad = ' '.repeat(marker.length);
          const body = restore(tidy(kids(li, ctx)).trim().replace(/\n{2,}/g, '\n'));
          return marker + body.split('\n').map((l, j) => (j === 0 || !l ? l : pad + l)).join('\n');
        })
        .join('\n');
    }

    function table(el, ctx) {
      const rows = Array.from(el.querySelectorAll('tr')).map((tr) =>
        Array.from(tr.children).map((cell) =>
          restore(tidy(kids(cell, ctx))).replace(/\s*\n\s*/g, ' ').replace(/\|/g, '\\|').trim()
        )
      );
      if (!rows.length) return '';
      const width = Math.max(...rows.map((r) => r.length));
      rows.forEach((r) => {
        while (r.length < width) r.push('');
      });
      const line = (r) => `| ${r.join(' | ')} |`;
      return [line(rows[0]), line(rows[0].map(() => '---')), ...rows.slice(1).map(line)].join('\n');
    }

    function walk(node, ctx) {
      if (node.nodeType === 3) {
        const t = node.nodeValue;
        if (ctx.pre) return t;
        if (!t.trim()) return /\n/.test(t) ? '' : ' ';
        return t.replace(/\s+/g, ' ');
      }
      if (node.nodeType !== 1) return '';
      const el = node;

      if (el.classList && el.classList.contains('katex')) return katex(el);
      if (el.matches(IGNORE)) return '';

      const cls = typeof el.className === 'string' ? el.className : '';
      if (/\bwhitespace-pre/.test(cls) || /white-space:\s*pre/.test(el.getAttribute('style') || '')) {
        ctx = { ...ctx, pre: true };
      }

      const tag = el.tagName;
      if (/^H[1-6]$/.test(tag)) {
        return block(`${'#'.repeat(Number(tag[1]))} ${tidy(kids(el, ctx)).trim()}`);
      }

      switch (tag) {
        case 'BR':
          return '\n';
        case 'PRE':
          return block(stash(fence(codeLang(el), codeText(el))));
        case 'CODE': {
          const t = el.textContent;
          if (!t) return '';
          const tick = t.includes('`') ? '``' : '`';
          const pad = t.startsWith('`') || t.endsWith('`') ? ' ' : '';
          return `${tick}${pad}${t}${pad}${tick}`;
        }
        case 'STRONG':
        case 'B':
          return inline('**', el, ctx);
        case 'EM':
        case 'I':
          return inline('*', el, ctx);
        case 'DEL':
        case 'S':
          return inline('~~', el, ctx);
        case 'A': {
          const text = kids(el, ctx).trim();
          const href = el.getAttribute('href') || '';
          if (!href || /^javascript:/i.test(href) || href === text) return text || href;
          return `[${text || href}](${href})`;
        }
        case 'IMG':
          return el.getAttribute('alt') ? `[image: ${el.getAttribute('alt')}]` : '';
        case 'HR':
          return block('---');
        case 'UL':
        case 'OL':
          return block(list(el, ctx));
        case 'TABLE':
          return block(table(el, ctx));
        case 'BLOCKQUOTE': {
          const inner = restore(tidy(kids(el, ctx)).trim());
          return block(inner.split('\n').map((l) => (l ? `> ${l}` : '>')).join('\n'));
        }
        case 'P':
          return block(tidy(kids(el, ctx)).trim());
        default: {
          const inner = kids(el, ctx);
          return BLOCK_TAGS.has(tag) ? block(tidy(inner).trim()) : inner;
        }
      }
    }

    return restore(tidy(walk(root, { pre: false })).trim());
  }

  NS.fence = fence;
  NS.codeLang = codeLang;
  NS.codeText = codeText;
  NS.htmlToMarkdown = htmlToMarkdown;
})();
