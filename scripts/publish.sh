#!/usr/bin/env bash
# One-command publish to GitHub (macOS, Linux, or Git Bash on Windows).
# Needs: git, node, and the GitHub CLI (https://cli.github.com).
# Usage: bash scripts/publish.sh [github-username]
set -euo pipefail
cd "$(dirname "$0")/.."

REPO="context-handoff"
DESC="Chrome extension that exports a long Claude chat as a compact resume prompt or Markdown file, so you can continue in a fresh chat. 100% local, open source."
TOPICS="chrome-extension,browser-extension,manifest-v3,claude,claude-ai,llm,ai-tools,prompt-engineering,context-window,markdown,export,productivity,privacy-first,javascript"

command -v gh >/dev/null || { echo "Install the GitHub CLI first: https://cli.github.com"; exit 1; }
gh auth status >/dev/null 2>&1 || gh auth login

OWNER="${1:-$(gh api user -q .login)}"
OWNER_LC="$(printf %s "$OWNER" | tr "[:upper:]" "[:lower:]")"  # Pages hostnames are lowercase
echo "This will create a PUBLIC repository: https://github.com/$OWNER/$REPO"
read -r -p "Continue? [y/N] " ok
[[ "$ok" =~ ^[Yy]$ ]] || { echo "Cancelled."; exit 1; }

node scripts/set-owner.mjs "$OWNER"
git add -A
git commit -qm "chore: set repository owner to $OWNER" || true
git branch -M main

gh repo create "$OWNER/$REPO" --public --source=. --remote=origin --push \
  --description "$DESC" --homepage "https://$OWNER_LC.github.io/$REPO/"

gh repo edit "$OWNER/$REPO" --add-topic "$TOPICS" --enable-wiki=false

# GitHub Pages from /docs on main
gh api -X POST "repos/$OWNER/$REPO/pages" -f "source[branch]=main" -f "source[path]=/docs" >/dev/null \
  && echo "GitHub Pages enabled." \
  || echo "Could not enable Pages automatically: Settings -> Pages -> Deploy from branch: main /docs"

# First release with an installable zip
ZIP="context-handoff-v0.1.0.zip"
git archive --format=zip -o "$ZIP" HEAD manifest.json src icons
gh release create v0.1.0 "$ZIP" --title "v0.1.0: first release" \
  --notes "First public release. Download the zip, unzip it, then use Load unpacked on chrome://extensions. See CHANGELOG.md for details."
rm -f "$ZIP"

echo
echo "Done:"
echo "  Repo:    https://github.com/$OWNER/$REPO"
echo "  Website: https://$OWNER_LC.github.io/$REPO/  (live in 1-2 minutes)"
echo
echo "One manual step: Settings -> General -> Social preview -> upload docs/og-image.png"
