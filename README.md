<div align="center">

<img src="icons/icon128.png" width="96" height="96" alt="Context Handoff extension icon">

# Context Handoff: export a Claude chat to a compact resume prompt or Markdown

**A free, open-source Chrome extension that turns a long claude.ai conversation into a compact, structured handoff, so you can continue the task in a fresh chat or another AI assistant without re-explaining everything.**

[![Tests](https://github.com/__OWNER__/context-handoff/actions/workflows/test.yml/badge.svg)](https://github.com/__OWNER__/context-handoff/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
![Manifest V3](https://img.shields.io/badge/Chrome-Manifest%20V3-4285F4)
![No build step](https://img.shields.io/badge/build-none-lightgrey)
![100% local](https://img.shields.io/badge/data-100%25%20local-brightgreen)

[Website](https://__OWNER__.github.io/context-handoff/) · [Install](#install) · [How it works](#how-it-works) · [FAQ](#faq) · [Privacy](PRIVACY.md)

</div>

---

## What is Context Handoff?

Context Handoff is a **Chrome, Edge and Brave extension (Manifest V3)** that reads the conversation open on claude.ai and exports it as either:

- a **resume prompt**: an XML-structured prompt you paste into a new chat, or
- a **Markdown file** (`.md`) you attach to a new chat or keep as notes.

In its default **Compact** mode, the handoff keeps only what the next chat needs: the original task goal, the **latest version of every file**, the last few messages, and your next step. Earlier dead ends are left out. Everything runs locally in your browser. Nothing is uploaded, and the extension never reads cookies, sessions or credentials.

## Why use a context handoff?

Every message in a long AI chat re-sends the whole conversation, so late in a task most of the context goes to old debugging steps. A clean handoff:

- **Saves tokens and usage.** A fresh chat that starts from a compact summary costs far less per message than a 100-turn thread.
- **Improves answers.** Models answer better from a short, focused context than from a long, cluttered one.
- **Makes work portable.** Continue in a new chat, on another device or browser profile, or in a different AI assistant.
- **Keeps a record.** The Markdown export is a readable log of the decisions and code from the chat.

## Features

| Feature | What it does |
| --- | --- |
| Floating **Handoff** button | Appears on claude.ai and follows the site's light/dark theme. `Alt+Shift+H` toggles it. |
| **Compact mode** (default) | Keeps the task goal, the latest version of each named file, and the last N messages (6 by default). |
| **Full transcript mode** | Exports every message verbatim, for research, writing and review threads. |
| Clean **Markdown conversion** | Code blocks with language tags, tables, lists, links, blockquotes and **LaTeX/KaTeX math** (`$...$`, `$$...$$`). |
| **Copy resume prompt** | XML-structured prompt with `<task_goal>`, `<current_files>`, `<recent_conversation>` and `<next_step>`. |
| **Download `.md`** | A Markdown file you can attach to a new chat, which is usually tidier than a wall of pasted text. |
| **Usage-limit notice** | When the limit message appears, the button lights up so you can save a handoff while the chat is still open. |
| **Reset reminder** | A desktop notification when your usage limit should reset. |
| **Saved handoffs** | The last 20 handoffs, kept in the popup. |
| **Private by design** | No network requests, no analytics, no remote code. |

## Install

### From source (works today, no build step)

1. Download this repository (**Code → Download ZIP**) and unzip it, or run:
   ```bash
   git clone https://github.com/__OWNER__/context-handoff.git
   ```
2. Open `chrome://extensions` (or `edge://extensions` / `brave://extensions`).
3. Turn on **Developer mode** and click **Load unpacked**.
4. Select the folder that contains `manifest.json`.
5. Open a chat on [claude.ai](https://claude.ai). The **⇄ Handoff** button appears at the bottom right.

### From the Chrome Web Store

Coming soon.

## How to continue a long Claude chat in a new chat

1. In the long chat, click **⇄ Handoff** (or press `Alt+Shift+H`).
2. Choose **Compact** (for coding and most tasks) or **Full transcript** (for research and writing).
3. Optionally type the **next step**, e.g. *"Fix the overlapping axis labels, then add a colorbar."*
4. Click **Copy resume prompt** and paste it into a new chat, or click **Download .md** and attach the file.
5. The new chat restates the goal and the current state, then continues from the next step.

## How it works

```
claude.ai page ──► extractor.js ──► [{ role, markdown, codeBlocks }]
                                         │
                       formatter.js ◄────┘  compact or full selection
                           │
             ┌─────────────┴─────────────┐
       XML resume prompt           Markdown file
        (clipboard)                  (download)
```

Compact mode works like this:

1. The **first user message** becomes `<task_goal>`.
2. The **last N messages** are kept verbatim in `<recent_conversation>`.
3. From the messages in between, only the **latest version of each named file** is kept in `<current_files>`. A code block is "named" by a `# file: name.py` first line, or by a filename just before it.
4. A `<note>` records what was left out, so the next model knows the context was trimmed.

Example output:

```xml
<handoff created="2026-11-25T17:16:27Z" mode="compact" source="TEC plotting script">
<instructions>You are continuing a task that started in an earlier conversation...</instructions>
<task_goal>Write a Python script that loads TEC data from a CSV and plots it against time.</task_goal>
<current_files>
<file name="analysis.py" language="python">```python ... ```</file>
</current_files>
<note>5 earlier message(s) were left out to save space...</note>
<recent_conversation>
<turn role="user">Also add storm-time shading.</turn>
<turn role="assistant">Updated plot_tec.py: ...</turn>
</recent_conversation>
<next_step>Add a colorbar</next_step>
</handoff>
```

## FAQ

### How do I export a Claude conversation to Markdown?
Install Context Handoff, open the chat on claude.ai, click **⇄ Handoff**, choose **Full transcript**, and click **Download .md**. You get a Markdown file with every message, code blocks with language tags, tables and math.

### How do I continue a Claude chat in a new conversation without losing context?
Use **Compact** mode and **Copy resume prompt**, then paste it into a new chat. The prompt carries the original goal, the current version of each file, the most recent messages and your next step, and it tells the new chat to pick up where the old one stopped.

### Does it save tokens?
Usually, yes. A compact handoff of a long coding thread is often a small fraction of the full conversation's size. The panel shows an estimated token count before you copy.

### Is my data sent anywhere?
No. The extension has no network code. It reads the page you have open, builds the handoff in your browser, and stores at most 20 recent handoffs in `chrome.storage.local` on your device. See [PRIVACY.md](PRIVACY.md).

### Does it read my cookies, session or login?
No. It only reads the visible conversation text on claude.ai. It has no `cookies` permission and never touches credentials.

### Can I use the handoff with ChatGPT, Gemini or another assistant?
Yes. The resume prompt is plain text with simple XML tags, which any capable chat model understands. The Markdown export works anywhere you can attach or paste a file.

### Does it work in Edge, Brave, Opera or Arc?
Yes. It works in any Chromium-based browser that supports Manifest V3 extensions. A Firefox port is planned.

### Does it capture Claude artifacts?
Artifacts in the side panel aren't part of the chat text, so they aren't captured yet. Ask Claude to restate the file in the chat, or paste it into the handoff yourself.

### Does it help get around usage limits?
No, and it isn't designed to. It doesn't manage accounts or change how a service counts usage. It makes your context smaller and portable, so that the usage you have goes further.

### The panel says "No messages found". What now?
claude.ai has probably changed its page layout. Update the selectors in [`src/content/selectors.js`](src/content/selectors.js), or [open an issue](https://github.com/__OWNER__/context-handoff/issues/new?template=bug_report.yml) and include one message's HTML from DevTools.

## Permissions

| Permission | Why it's needed |
| --- | --- |
| `https://claude.ai/*` | Read the open conversation and show the button |
| `storage` | Settings and the last 20 saved handoffs (this browser profile only) |
| `alarms`, `notifications` | The optional reset reminder |

## Development

```bash
npm install   # dev-only: jsdom for tests
npm test      # 14 tests against a fixture conversation
npm run zip   # package for the Chrome Web Store
```

- **Offline testing:** open [`dev/harness.html`](dev/harness.html) in Chrome to preview the XML/Markdown output without loading the extension.
- **After editing:** reload the extension on `chrome://extensions`, then refresh the claude.ai tab.

```
src/content/selectors.js    claude.ai DOM selectors (edit when the site changes)
src/content/html-to-md.js   dependency-free HTML -> Markdown (incl. KaTeX)
src/content/extractor.js    DOM -> messages + code blocks + filenames
src/content/formatter.js    messages -> XML prompt / Markdown / stats
src/content/ui.js           button, panel, limit-notice watcher
src/background/             reminder alarm, notification, shortcut
src/popup/                  saved handoffs, reminder, settings
docs/                       project website (GitHub Pages)
```

## Roadmap

- [ ] Chrome Web Store release
- [ ] Firefox port
- [ ] Capture open artifacts
- [ ] Custom handoff templates
- [ ] Optional per-project handoff history

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md). Selector fixes after claude.ai layout changes are especially useful.

## License

[MIT](LICENSE). Free for personal and commercial use.

---

<sub>Context Handoff is an independent open-source project. It is not affiliated with, endorsed by, or sponsored by Anthropic. "Claude" is a trademark of Anthropic, PBC, and is used here only to describe compatibility.</sub>

<!-- Keywords: export Claude chat, Claude conversation to Markdown, save Claude chat, continue Claude conversation in new chat, Claude context handoff, AI chat summary prompt, resume prompt, reduce tokens, long chat context, Chrome extension, Manifest V3 -->
