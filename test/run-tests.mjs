// Run with: npm test   (needs the jsdom dev dependency: npm install)
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

const dom = new JSDOM('<!doctype html><html><head><title>TEC plotting script - Claude</title></head><body></body></html>', {
  runScripts: 'outside-only',
});
const { window } = dom;
window.eval(read('test/fixtures/conversation.js'));
window.document.body.innerHTML = window.FIXTURE_HTML;
for (const f of ['selectors', 'limit', 'html-to-md', 'extractor', 'formatter']) {
  window.eval(read(`src/content/${f}.js`));
}
const NS = window.CHX;

let passed = 0;
const test = (name, fn) => {
  try {
    fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (e) {
    console.error(`  FAIL ${name}\n${e.stack}`);
    process.exitCode = 1;
  }
};

const messages = NS.extractMessages(window.document);

test('manifest references files that exist', () => {
  const m = JSON.parse(read('manifest.json'));
  const files = [
    m.background.service_worker,
    m.action.default_popup,
    ...m.content_scripts.flatMap((c) => c.js),
    ...Object.values(m.icons),
  ];
  for (const f of files) assert.ok(existsSync(join(ROOT, f)), `missing ${f}`);
});

test('extracts messages in order with roles', () => {
  assert.equal(messages.length, 10);
  assert.deepEqual(
    [...messages.map((m) => m.role)],
    ['user', 'assistant', 'user', 'assistant', 'user', 'assistant', 'user', 'assistant', 'user', 'assistant']
  );
});

test('keeps line breaks in user messages', () => {
  assert.match(messages[0].markdown, /against time\.\nColumns: time, tec/);
});

test('code blocks are fenced with language and keep blank lines', () => {
  assert.ok(messages[1].markdown.includes('```python\nimport pandas as pd\n\ndf = pd.read_csv'));
});

test('copy buttons and hidden labels are dropped', () => {
  for (const m of messages) assert.ok(!/\bCopy\b/.test(m.markdown), m.markdown);
  assert.ok(!messages[3].markdown.includes('x̄'));
});

test('KaTeX becomes $...$ and $$...$$', () => {
  assert.ok(messages[3].markdown.includes('$\\bar{x}$'));
  assert.ok(messages[7].markdown.includes('$$\n\\mathrm{TEC} = \\int n_e \\, ds\n$$'));
});

test('tables, lists, emphasis and blockquotes convert', () => {
  assert.ok(messages[5].markdown.includes('| Column | Unit |\n| --- | --- |\n| tec | TECU |'));
  assert.ok(messages[7].markdown.includes('1. Rotate the labels with `fig.autofmt_xdate()`\n   - works for most plots'));
  assert.ok(messages[7].markdown.includes('2. Use a *concise* date formatter'));
  assert.ok(messages[9].markdown.includes('> Pass `storm=(start, end)` as datetimes.'));
});

test('filename detection from preceding text and header comments', () => {
  assert.equal(messages[1].codeBlocks[0].filename, 'analysis.py');
  assert.equal(messages[3].codeBlocks[0].filename, 'analysis.py');
  assert.equal(messages[3].codeBlocks[1].filename, null);
  assert.equal(messages[5].codeBlocks[0].filename, 'plot_tec.py');
  assert.equal(messages[9].codeBlocks[0].filename, 'plot_tec.py');
});

test('compact mode keeps goal, latest earlier files and recent turns', () => {
  const h = NS.buildHandoff(messages, { mode: 'compact', recentCount: 4, title: 'TEC plotting script' });
  assert.equal(h.stats.included, 5);
  assert.equal(h.stats.omitted, 5);
  assert.equal(h.stats.files, 1); // analysis.py (plot_tec.py is already in recent turns)
  assert.equal(h.stats.droppedBlocks, 1); // the unnamed pip snippet
  assert.ok(h.xml.includes('<task_goal>\nWrite a Python script'));
  assert.ok(h.xml.includes('<file name="analysis.py" language="python">'));
  assert.ok(h.xml.includes('rolling("30min"'), 'latest analysis.py version');
  assert.ok(!h.xml.includes('print(df.head())'), 'old analysis.py version dropped');
  assert.ok(h.xml.includes('ax.axvspan'));
  assert.ok(h.markdown.startsWith('# Context handoff: TEC plotting script'));
  assert.ok(h.markdown.includes('## Current files\n\n### `analysis.py`'));
});

test('full mode includes every message', () => {
  const h = NS.buildHandoff(messages, { mode: 'full', title: 't' });
  assert.equal(h.stats.included, 10);
  assert.equal((h.xml.match(/<turn role=/g) || []).length, 10);
  assert.ok(h.xml.includes('print(df.head())'));
});

test('next step is included and attributes are escaped', () => {
  const h = NS.buildHandoff(messages, { nextStep: 'Add a colorbar', title: 'a "quoted" <title>' });
  assert.ok(h.xml.includes('<next_step>\nAdd a colorbar\n</next_step>'));
  assert.ok(h.xml.includes('source="a &quot;quoted&quot; &lt;title>"'));
});

test('conversation title strips the site suffix', () => {
  assert.equal(NS.conversationTitle(window.document), 'TEC plotting script');
});

test('limit notice detection', () => {
  assert.ok(NS.looksLikeLimitNotice("You've reached your usage limit."));
  assert.ok(NS.looksLikeLimitNotice('You are out of free messages until 3 PM'));
  assert.ok(!NS.looksLikeLimitNotice('Here is your plot.'));
});

test('reset time parsing', () => {
  const now = new window.Date(2026, 10, 25, 10, 0, 0);
  const at3 = NS.parseResetTime('Your limit will reset at 3:00 PM.', now);
  assert.equal(at3.getHours(), 15);
  assert.equal(at3.getDate(), 25);
  const morning = NS.parseResetTime('until 9 am', now);
  assert.equal(morning.getDate(), 26, 'past time rolls to tomorrow');
  const h24 = NS.parseResetTime('resets at 17:45', now);
  assert.equal(h24.getHours(), 17);
  assert.equal(h24.getMinutes(), 45);
  const rel = NS.parseResetTime('try again in 2 hours', now);
  assert.equal(rel.getTime() - now.getTime(), 2 * 3600e3);
  assert.equal(NS.parseResetTime('no time here', now), null);
});

console.log(`\n${passed} passed${process.exitCode ? ', some failed' : ''}`);
