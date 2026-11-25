# Contributing to Context Handoff

Thanks for helping. A few ground rules keep the project easy to work on:

1. **No runtime dependencies and no build step.** The extension must run from **Load unpacked** straight after cloning.
2. **Nothing leaves the browser.** PRs that add network requests, analytics or remote code will not be merged.
3. **Test extraction changes.** If you change how messages are read or converted, update `test/fixtures/conversation.js` and add a test in `test/run-tests.mjs`.

## Setup

```bash
git clone https://github.com/kaifhazarika/context-handoff.git
cd context-handoff
npm install
npm test
```

Load the folder at `chrome://extensions` → **Developer mode** → **Load unpacked**.

## Fixing selectors after a claude.ai layout change

1. On claude.ai, right-click a message → **Inspect**.
2. Find a stable attribute on the user and assistant message containers (prefer `data-testid` over class names).
3. Add it to the matching list in `src/content/selectors.js`. Keep the old selectors as fallbacks.
4. Copy a trimmed version of the new markup into `test/fixtures/conversation.js` and run `npm test`.

## Pull requests

- Keep PRs focused on one change.
- Describe what you tested, in which browser and version.
- Use clear commit messages (`fix: ...`, `feat: ...`, `docs: ...`).
