# Repository Guidelines

## Project Structure & Module Organization

This is a dependency-free Chrome Manifest V3 extension. `manifest.json` declares YouTube-only content scripts, permissions, icons, and the popup.

- `src/core.js`: shared time parsing, formatting, and validation.
- `src/content.js`: playback controller, navigation handling, and timeline markers.
- `src/panel.js`: on-page controls, range slider, and visibility preferences.
- `src/popup.html`, `src/popup.css`, `src/popup.js`: toolbar interface and tab messaging.
- `assets/`: PNG icons and their editable SVG source.
- `tests/*.test.cjs`: Node tests with simulated media and extension APIs.

Read `README.md` for installation, `PRODUCT.md` for scope, and `DESIGN.md` for interface decisions.

## Build, Test, and Development Commands

No dependency installation or build step is needed. Load this folder through `chrome://extensions` using **Developer mode → Load unpacked**. After changes, reload the extension and refresh YouTube.

Development checks require Node.js 20+:

- `npm test`: run Node’s built-in test runner.
- `npm run check`: check all application JavaScript for syntax errors; this is not a linter.
- `npm run format`: run pinned Prettier; the first invocation may require network access.

## Coding Style & Naming Conventions

Use two-space indentation, single quotes, trailing commas, and descriptive camelCase JavaScript names. Follow `.prettierrc.json`. Keep shared validation in `core.js`. Preserve idempotent content-script injection and isolate on-page styling in Shadow DOM.

## Testing Guidelines

Name tests `*.test.cjs` and describe observable behavior. Add regression tests for parsing, loop boundaries, navigation, or messaging changes. No coverage threshold is configured. Distinguish mocked tests from live playback verification. The user handles browser testing unless they request otherwise; provide reload instructions and relevant checks instead of opening automated browser sessions.

## Commit & Pull Request Guidelines

No Git history is currently available to establish conventions. Use focused, imperative subjects such as `Fix loop boundary handling`. Pull requests should explain the behavior change, link relevant issues, and report verification. Include screenshots for interface changes when available.

## Security & Interface Constraints

Keep permissions limited to the functionality required. Do not add analytics, remote code, or external requests. Preserve the compact controls, automatic YouTube theme detection, explicit validation, and stable slider placement. Never commit secrets, packaged extensions, or local tool output.
