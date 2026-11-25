# Privacy Policy: Context Handoff

_Last updated: 25 November 2026_

Context Handoff is a browser extension that turns the conversation open on claude.ai into a handoff document. This policy explains what the extension does with data.

## Summary

**Context Handoff collects nothing and sends nothing.** All processing happens locally in your browser.

## What the extension reads

- The text of the conversation currently open on `https://claude.ai`, only when you open the Handoff panel.
- Short notices on that page (for example, a usage-limit message), so that it can highlight the Handoff button.

It does **not** read cookies, session tokens, passwords, browsing history, or any other website.

## What the extension stores

All of the following stays in `chrome.storage.local` in your own browser profile:

- your settings (default mode, number of recent messages, notice detection on/off),
- up to 20 recent handoffs you created, so you can copy or download them again,
- one reminder time, if you set one.

You can delete saved handoffs at any time from the popup (**Clear all**), or remove everything by uninstalling the extension.

## What the extension sends

Nothing. The extension contains no network code, no analytics, no telemetry and no remote scripts. Handoffs leave your browser only when **you** copy one to the clipboard or download it as a file.

## Sharing and sale of data

No data is collected, so none is sold, shared or transferred to third parties.

## Permissions

| Permission | Purpose |
| --- | --- |
| `https://claude.ai/*` | Read the open conversation and show the Handoff button |
| `storage` | Keep settings and recent handoffs on your device |
| `alarms`, `notifications` | Show the optional reset reminder |

## Changes

Any change to this policy will be published in this file and noted in [CHANGELOG.md](CHANGELOG.md) before it takes effect.

## Contact

Open an issue at https://github.com/__OWNER__/context-handoff/issues.
