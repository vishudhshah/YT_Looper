# YouTube Range Looper

A lightweight Chrome extension for repeating a specific part of a YouTube video. Set a start and stop time, then let it loop.

## Features

- On-page controls with a two-handle range slider and editable timestamps.
- **Use current** buttons to capture the playback position.
- Subtle start/stop markers on YouTube’s timeline.
- A toolbar popup with automatic YouTube theme detection and a light/dark toggle.
- A saved preference to show or hide on-page controls by default.
- Time validation and a minimum half-second range.

No accounts, analytics, runtime dependencies, or build step.

## Install locally

1. Download or clone this repository. Extract the ZIP if downloading.
2. Open `chrome://extensions` and enable **Developer mode**.
3. Click **Load unpacked** and select the folder containing `manifest.json`.
4. Open or refresh a YouTube video.

Keep the folder on your computer while the extension is installed. After updating the files, reload the extension in `chrome://extensions` and refresh YouTube.

## Use

Enter times as seconds (`90`), minutes (`1:30`), or hours (`1:02:30`). Fractional seconds are supported. You can also drag the slider handles or click **Use current**.

Click **Start loop** to begin. Playback continues from its current position when already inside the range; otherwise it jumps to the start. Dragging a handle updates an active loop when released. After typing a new time, click **Update loop**. **Stop loop** returns to normal playback.

Closing the popup or hiding the panel leaves the loop running. Restore the panel with **Show controls below video** in the popup. **Show controls by default** saves your preference across videos. The popup follows YouTube’s theme when opened; its sun/moon button overrides the theme until it closes.

Ranges last for the current page session. Reloading clears them, and switching videos stops the loop. Ads are left alone. Live streams and embedded players are unsupported. Browser throttling and media seeking can affect boundary precision.

## Development

Load the extension directly from this folder. For development checks, use Node.js 20+:

```sh
npm test         # Unit tests with simulated media and extension APIs
npm run check    # JavaScript syntax checks
npm run format   # Prettier; first run may require network access
```

- `src/content.js` — playback controller and timeline markers.
- `src/panel.js` — on-page controls and range slider.
- `src/popup.*` — toolbar popup.
- `src/core.js` — shared time parsing and validation.
- `assets/` — icons and editable SVG source.
- `tests/` — Node test suite.

## Permissions and privacy

YouTube-only content scripts display the panel automatically. `activeTab` and `scripting` connect the popup to the current video; `storage` saves the default-controls preference locally. The extension makes no network requests and sends no data to external services.
