# Context Handoff

A Chrome / Chromium (Manifest V3) extension that turns a long claude.ai conversation into a **compact, structured handoff**. Paste it into a fresh chat, or into a different assistant, and continue the task without re-explaining everything.

It runs entirely on your machine. It reads only the chat you have open, makes no network requests, and never touches cookies, sessions or credentials.

> Not affiliated with or endorsed by Anthropic. "Claude" is used only to describe the site the extension works on.

## Why

Long chats get expensive. Every new message re-sends the whole thread, so late in a task most of your usage goes to dead-end debugging from an hour ago. A good handoff keeps only what matters: the goal, the current version of each file, the last few turns, and the next step. Starting a fresh chat from that handoff is usually cheaper and gives better answers.

## Features

- **Floating Handoff button** on claude.ai that follows the site's light/dark theme (rendered in a shadow root, so page styles can't break it).
- **Usage-limit detection.** A lightweight `MutationObserver` watches for the limit notice, highlights the button, and offers to save a handoff while the chat is still open.
- **Smart extraction.** Separates user and assistant turns, converts them to clean Markdown (code blocks, tables, lists, links, KaTeX math as `$...$`), and drops UI noise like copy buttons.
- **Two modes:**
  - **Compact (default):** the original task goal, the *latest* version of every named file from earlier in the chat, and the last N messages (6 by default).
  - **Full transcript:** every message verbatim, for research or writing threads.
- **Two exports:**
  - **Copy resume prompt:** an XML-structured prompt on your clipboard.
  - **Download `.md`:** a clean Markdown file you can attach to a new chat.
- **Saved handoffs:** the last 20 handoffs are kept in the popup so you can copy or download them again.
- **Reset reminder:** a desktop notification (`chrome.alarms`) when your limit should reset. It's set from the limit notice, which parses times like "3:00 PM" or "in 2 hours", or manually from the popup.
- **Keyboard shortcut:** `Alt+Shift+H` toggles the panel. You can change it at `chrome://extensions/shortcuts`.

## Install (no build step)

1. Clone or download this repo.
2. Open `chrome://extensions` (or `brave://extensions`, `edge://extensions`).
3. Turn on **Developer mode** and click **Load unpacked**.
4. Select the repo folder (the one containing `manifest.json`).
5. Open a chat on claude.ai. The **⇄ Handoff** button appears at the bottom right.

## Usage

1. In a long chat, click **⇄ Handoff**.
2. Pick **Compact** or **Full transcript**, and optionally type the next step.
3. Click **Copy resume prompt** and paste it into a new chat, or click **Download .md** and attach the file.
4. The new chat restates the goal and the current state, then continues.

### What a compact handoff looks like

```xml
<handoff created="2026-11-25T17:16:27Z" mode="compact" source="TEC plotting script">
<instructions>You are continuing a task that started in an earlier conversation...</instructions>
<task_goal>Write a Python script that loads TEC data from a CSV...</task_goal>
<current_files>
<file name="analysis.py" language="python"> ```python ... ``` </file>
</current_files>
<note>5 earlier message(s) were left out to save space...</note>
<recent_conversation>
<turn role="user">...</turn>
<turn role="assistant">...</turn>
</recent_conversation>
<next_step>Add a colorbar</next_step>
</handoff>
```

## Permissions and privacy

| Permission | Why |
| --- | --- |
| `https://claude.ai/*` (content script) | Read the open conversation and show the button |
| `storage` | Settings and the last 20 saved handoffs (`chrome.storage.local`, this profile only) |
| `alarms`, `notifications` | The reset reminder |

There's no remote code, no analytics and no `fetch`. Saved handoffs never leave the browser profile they were created in. To move a handoff somewhere else, use the clipboard or the `.md` file.

## Project layout

```
manifest.json
src/
  content/
    selectors.js     # claude.ai DOM selectors: edit this when the site changes
    limit.js         # limit-notice detection + reset-time parsing
    html-to-md.js    # dependency-free HTML -> Markdown
    extractor.js     # DOM -> [{ role, markdown, codeBlocks }]
    formatter.js     # messages -> { xml, markdown, stats }
    ui.js            # button, panel, toast, clipboard/download, observers
  background/service-worker.js   # reminder alarm, notification, shortcut
  popup/                          # reminder, saved handoffs, settings
icons/
dev/harness.html     # try the extractor/formatter offline, no extension needed
test/                # Node tests (jsdom) against a fixture conversation
```

## Development

```bash
npm install        # dev-only: installs jsdom for the tests
npm test           # runs test/run-tests.mjs
npm run zip        # packages manifest.json, src/ and icons/ for the Chrome Web Store
```

- **Offline testing:** open `dev/harness.html` directly in Chrome to see the XML/Markdown output for the fixture conversation. Neither the extension nor claude.ai is needed.
- **After editing the extension:** click the reload icon on `chrome://extensions`, then refresh the claude.ai tab.
- **When claude.ai changes its markup:** if the panel says "No messages found", inspect a message in DevTools and update `src/content/selectors.js`. Then update `test/fixtures/conversation.js` to match and run `npm test`.

## Known limitations

- **Artifacts** shown in the side panel aren't part of the message DOM, so they aren't captured. Ask Claude to restate the file in the chat, or copy it in yourself.
- **File detection** is heuristic. It looks for a `# file: name.py` first line, or a filename just before the code block. Unnamed snippets from the middle of a chat are dropped in compact mode, and the handoff says how many.
- **Token counts** are rough estimates (characters ÷ 4).
- **Firefox** needs `background.scripts` instead of `service_worker`. A port is welcome.

## Contributing

Issues and PRs are welcome. Keep the zero-build, zero-dependency runtime, and add a fixture plus a test for any extraction change.

## License

MIT. See [LICENSE](LICENSE).
