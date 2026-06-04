# Agent Instructions

## Project Overview

This repository provides two ways to copy browser storage between pages: a Chrome Manifest V3 extension in [chrome-extension/](chrome-extension/) and standalone console/fetch scripts in [fetch-copy/](fetch-copy/). For user-facing setup and usage examples, link to [README.md](README.md) instead of duplicating those snippets.

## Architecture

- [chrome-extension/manifest.json](chrome-extension/manifest.json) defines a pure static MV3 extension with `storage` and `tabs` permissions and a popup at [chrome-extension/index.html](chrome-extension/index.html).
- [chrome-extension/scripts/index.js](chrome-extension/scripts/index.js) is the popup controller. It queries the active tab, sends `getStorage`/`setStorage` messages, stores copied data in `chrome.storage.local`, and updates the popup DOM.
- [chrome-extension/scripts/background.js](chrome-extension/scripts/background.js) is a content script that runs on `<all_urls>` and reads/writes page `localStorage` and `sessionStorage` in response to runtime messages.
- [fetch-copy/read.js](fetch-copy/read.js) serializes the current page storage and copies an executable write snippet to the clipboard.
- [fetch-copy/write.js](fetch-copy/write.js) accepts the serialized storage object and writes it into the current page.

## Commands And Validation

- There is no package manager, build step, TypeScript, linter, or automated test suite in this repo.
- For extension changes, load [chrome-extension/](chrome-extension/) as an unpacked Chrome extension and manually verify popup copy/write/delete flows across two tabs.
- For [fetch-copy/](fetch-copy/) changes, host the folder with any static file server when CORS blocks remote `fetch`, then test the README console flow on source and target pages.
- Inspect browser console output when validating; existing scripts use colored Chinese logs to report start/success/failure states.

## Development Conventions

- Keep the code dependency-free and compatible with direct browser execution. Do not introduce bundlers or npm tooling unless explicitly requested.
- Use plain JavaScript, DOM APIs, Chrome extension APIs, and the existing camelCase helper naming style such as `readFn`, `writeFn`, and `clearAll`.
- Preserve Chinese UI text, comments, and console messages unless the task is specifically about localization.
- Keep popup assets and paths relative to [chrome-extension/](chrome-extension/); image references are used directly by HTML/CSS/JS.
- Treat `eval()` in [fetch-copy/read.js](fetch-copy/read.js) as an existing design constraint for the console workflow. Avoid expanding its use, and be careful not to interpolate untrusted user-controlled strings into generated executable snippets.

## Common Pitfalls

- `chrome.tabs.sendMessage()` requires a tab where the content script is allowed to run; restricted pages may fail and should surface the existing failed UI state.
- `chrome.storage.local` entries are keyed by tab id, so repeated captures from the same tab overwrite that tab's prior saved storage.
- `localStorage` and `sessionStorage` values are strings. Preserve that behavior when copying or writing storage.
- The standalone fetch-copy flow may hit CORS or clipboard permission limits depending on the page context; the README documents the local-server workaround.
