// Turns extracted messages into a handoff: an XML-structured resume prompt
// (for pasting) and a Markdown document (for downloading / attaching).
(() => {
  'use strict';
  const NS = (globalThis.CHX = globalThis.CHX || {});

  const INSTRUCTIONS =
    'You are continuing a task that started in an earlier conversation. ' +
    'Everything you need is in this handoff. First, restate the goal and where the work ' +
    'stands in 2-3 sentences. Then continue from the next step. Treat the files below as ' +
    'the current versions, and do not redo work that is already finished.';

  const approxTokens = (s) => Math.ceil(s.length / 4);
  const attr = (s) =>
    String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const roleLabel = (r) => (r === 'user' ? 'User' : 'Assistant');

  /** Compact selection: goal + latest named files from the middle + last N messages. */
  function selectCompact(messages, recentCount) {
    const empty = { goal: null, files: [], recent: [], omitted: 0, droppedBlocks: 0 };
    if (!messages.length) return empty;

    const goalIdx = messages.findIndex((m) => m.role === 'user');
    if (goalIdx < 0) return { ...empty, recent: messages.slice(-recentCount) };

    const recentStart = Math.max(messages.length - recentCount, goalIdx + 1);
    const recent = messages.slice(recentStart);
    const middle = messages.slice(goalIdx + 1, recentStart);

    const namesInRecent = new Set(
      recent.flatMap((m) => m.codeBlocks.map((b) => b.filename).filter(Boolean))
    );
    const latest = new Map();
    let droppedBlocks = 0;
    for (const m of middle) {
      for (const b of m.codeBlocks) {
        if (!b.filename) {
          droppedBlocks++;
        } else if (!namesInRecent.has(b.filename)) {
          latest.delete(b.filename); // re-insert so order follows the latest version
          latest.set(b.filename, b);
        }
      }
    }

    return {
      goal: messages[goalIdx],
      files: Array.from(latest.values()),
      recent,
      omitted: middle.length,
      droppedBlocks,
    };
  }

  function omittedNote(sel) {
    if (!sel.omitted) return '';
    let s = `${sel.omitted} earlier message(s) were left out to save space.`;
    if (sel.files.length) s += ' The latest version of each file from them is kept above.';
    if (sel.droppedBlocks) s += ` ${sel.droppedBlocks} unnamed code snippet(s) were dropped.`;
    return s;
  }

  function toXml(sel, o, now) {
    const out = [];
    out.push(`<handoff created="${now.toISOString()}" mode="${o.mode}" source="${attr(o.title)}">`);
    out.push(`<instructions>\n${INSTRUCTIONS}\n</instructions>`);

    if (o.mode === 'full') {
      out.push('<conversation>');
      for (const m of sel.recent) out.push(`<turn role="${m.role}">\n${m.markdown}\n</turn>`);
      out.push('</conversation>');
    } else {
      if (sel.goal) out.push(`<task_goal>\n${sel.goal.markdown}\n</task_goal>`);
      if (sel.files.length) {
        out.push('<current_files>');
        for (const f of sel.files) {
          out.push(
            `<file name="${attr(f.filename)}" language="${attr(f.lang)}">\n${NS.fence(f.lang, f.code)}\n</file>`
          );
        }
        out.push('</current_files>');
      }
      const note = omittedNote(sel);
      if (note) out.push(`<note>${note}</note>`);
      out.push('<recent_conversation>');
      for (const m of sel.recent) out.push(`<turn role="${m.role}">\n${m.markdown}\n</turn>`);
      out.push('</recent_conversation>');
    }

    out.push(
      `<next_step>\n${o.nextStep.trim() || 'Continue from where the recent conversation stops.'}\n</next_step>`
    );
    out.push('</handoff>');
    return out.join('\n\n');
  }

  function toMarkdown(sel, o, now) {
    const out = [];
    out.push(`# Context handoff: ${o.title}`);
    const meta = [`Created: ${now.toISOString()}`, `Mode: ${o.mode}`];
    if (o.url) meta.push(`Source chat: ${o.url}`);
    out.push(meta.map((l) => `- ${l}`).join('\n'));
    out.push(`> ${INSTRUCTIONS}`);

    const turns = (list) =>
      list.map((m) => `### ${roleLabel(m.role)}\n\n${m.markdown}`).join('\n\n');

    if (o.mode === 'full') {
      out.push('## Conversation');
      out.push(turns(sel.recent));
    } else {
      if (sel.goal) out.push(`## Task goal\n\n${sel.goal.markdown}`);
      if (sel.files.length) {
        out.push('## Current files');
        for (const f of sel.files) out.push(`### \`${f.filename}\`\n\n${NS.fence(f.lang, f.code)}`);
      }
      const note = omittedNote(sel);
      if (note) out.push(`_${note}_`);
      out.push('## Recent conversation');
      out.push(turns(sel.recent));
    }

    out.push(`## Next step\n\n${o.nextStep.trim() || 'Continue from where the recent conversation stops.'}`);
    return out.join('\n\n') + '\n';
  }

  /**
   * @param {Array} messages  output of CHX.extractMessages
   * @param {Object} opts     { mode: 'compact'|'full', recentCount, nextStep, title, url, now }
   */
  function buildHandoff(messages, opts = {}) {
    const o = {
      mode: 'compact',
      recentCount: 6,
      nextStep: '',
      title: 'Untitled chat',
      url: '',
      ...opts,
    };
    o.recentCount = Math.max(1, Math.floor(Number(o.recentCount) || 6));
    const now = o.now instanceof Date ? o.now : new Date();

    const sel =
      o.mode === 'full'
        ? { goal: null, files: [], recent: messages, omitted: 0, droppedBlocks: 0 }
        : selectCompact(messages, o.recentCount);

    const xml = toXml(sel, o, now);
    const markdown = toMarkdown(sel, o, now);
    return {
      xml,
      markdown,
      stats: {
        total: messages.length,
        included: (sel.goal ? 1 : 0) + sel.recent.length,
        files: sel.files.length,
        omitted: sel.omitted,
        droppedBlocks: sel.droppedBlocks,
        tokens: approxTokens(xml),
      },
    };
  }

  NS.INSTRUCTIONS = INSTRUCTIONS;
  NS.selectCompact = selectCompact;
  NS.buildHandoff = buildHandoff;
})();
