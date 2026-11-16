/* global chrome, YTLoopCore */
'use strict';

const { parseTime, formatTime, validateTimeInputs, videoId } = YTLoopCore;
const $ = (id) => document.getElementById(id);
const startInput = $('start');
const endInput = $('end');
let tabId;
let state;
let initialId;
let busy = false;
let notice = '';
let polling = false;
let manualTheme = null;
let currentTheme = 'light';

function applyTheme(darkMode) {
  currentTheme = manualTheme || (darkMode ? 'dark' : 'light');
  document.documentElement?.setAttribute('data-theme', currentTheme);
  const dark = currentTheme === 'dark';
  $('theme-sun').toggleAttribute('hidden', !dark);
  $('theme-moon').toggleAttribute('hidden', dark);
  const label = dark ? 'Switch to light mode' : 'Switch to dark mode';
  $('theme-toggle').setAttribute('aria-label', label);
  $('theme-toggle').title = label;
}

$('theme-toggle').addEventListener('click', () => {
  manualTheme = currentTheme === 'dark' ? 'light' : 'dark';
  applyTheme(false);
});

function dirty() {
  return !state?.range || parseTime(startInput.value) !== state.range.start || parseTime(endInput.value) !== state.range.end;
}

function rangeProblem() {
  const errors = validateTimeInputs(startInput.value, endInput.value, state?.duration);
  return errors.start || errors.end;
}

function showEmpty(title, description, retry = true) {
  $('loop-form').hidden = true;
  $('video-section').hidden = true;
  $('empty-state').hidden = false;
  $('empty-title').textContent = title;
  $('empty-description').textContent = description;
  $('retry').hidden = !retry;
  $('status').textContent = 'Not ready';
  $('status').classList.remove('active');
}

async function send(type, extra = {}) {
  const response = await chrome.tabs.sendMessage(tabId, { type, ...extra });
  if (!response?.ok) throw new Error(response?.error || 'Could not connect. Reload the YouTube tab and try again.');
  return response.state;
}

function preciseTime(seconds) {
  const milliseconds = Math.round(seconds * 1000);
  const whole = Math.floor(milliseconds / 1000);
  const decimal = (milliseconds % 1000) ? '.' + String(milliseconds % 1000).padStart(3, '0').replace(/0+$/, '') : '';
  return formatTime(whole) + decimal;
}

function render() {
  if (!state) return;
  applyTheme(state.darkMode);
  if (!state.videoId || (initialId && state.videoId !== initialId)) {
    showEmpty('The video changed', 'Reopen this popup to choose a range for the new video.');
    return;
  }
  if (!state.ready) {
    showEmpty(state.ad ? 'Your video is in an ad' : 'Waiting for your video', state.ad
      ? 'Your range is kept. Controls will return when the ad finishes.'
      : 'Play a regular YouTube video and wait for it to load. Live streams cannot be looped.');
    return;
  }
  $('empty-state').hidden = true;
  $('video-section').hidden = false;
  $('loop-form').hidden = false;
  $('video-title').textContent = state.title || 'YouTube video';
  $('video-title').title = state.title || '';
  $('time-hint').textContent = `m:ss, h:mm:ss, or seconds · Max ${formatTime(state.duration)}`;
  const problem = rangeProblem();
  const changed = dirty();
  const active = state.enabled;
  const stopping = active && !changed;
  $('status').textContent = active ? (state.paused ? 'Loop paused' : 'Looping') : 'Ready';
  $('status').classList.toggle('active', active);
  $('toggle-label').textContent = busy ? 'Updating…' : stopping ? 'Stop loop' : active ? 'Update loop' : 'Start loop';
  $('toggle').classList.toggle('is-looping', stopping);
  $('toggle').disabled = busy || Boolean(problem && !stopping);
  $('stop').hidden = !(active && changed);
  $('stop').disabled = busy;
  document.querySelectorAll('.use-current').forEach((button) => { button.disabled = busy; });
  const errors = validateTimeInputs(startInput.value, endInput.value, state.duration);
  for (const [name, input] of [['start', startInput], ['end', endInput]]) {
    const message = errors[name];
    input.setAttribute('aria-invalid', String(Boolean(message)));
    input.setCustomValidity(message);
    const errorElement = $(`${name}-error`);
    if (errorElement.textContent !== message) errorElement.textContent = message;
    errorElement.hidden = !message;
  }
  const feedback = notice || state.error || (active && state.paused ? 'Press play on YouTube to resume.' : '');
  if ($('feedback').textContent !== feedback) $('feedback').textContent = feedback;
  $('feedback').hidden = !feedback;

}

async function connect() {
  try {
    if (!globalThis.chrome?.tabs || !chrome.scripting) {
      showEmpty('Load this extension in Chrome', 'Open chrome://extensions, enable Developer mode, and load this project folder as an unpacked extension.', false);
      return;
    }
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    // Read YouTube's actual theme, including when its appearance differs from
    // the operating system. This also works on YouTube pages without a video.
    if (tab?.id && /^https:\/\/(www\.|m\.)?youtube\.com\//.test(tab.url || '')) {
      try {
        const result = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => document.documentElement.hasAttribute('dark'),
        });
        if (typeof result?.[0]?.result === 'boolean') {
          applyTheme(result[0].result);
        }
      } catch {
        // Connecting below will provide the normal recovery message if needed.
      }
    }
    if (!tab?.id || !videoId(tab.url)) {
      showEmpty('Open a YouTube video', 'Play a video on youtube.com, then open this extension to choose the part you want to repeat.');
      return;
    }
    tabId = tab.id;
    await chrome.scripting.executeScript({ target: { tabId }, files: ['src/core.js', 'src/content.js'] });
    state = await send('YT_LOOP_GET');
    initialId = state.videoId;
    setDefaults();
    render();
  } catch {
    showEmpty('Could not connect', 'Reload the YouTube tab, then open this extension again.');
  }
}

function setDefaults() {
  if (state.range) {
    startInput.value = preciseTime(state.range.start);
    endInput.value = preciseTime(state.range.end);
  } else if (state.ready) {
    const start = Math.max(0, Math.min(Math.floor(state.currentTime), Math.floor(state.duration - 1)));
    startInput.value = formatTime(start);
    endInput.value = preciseTime(Math.min(start + 10, state.duration));
  }
}

async function changeLoop(stop = false) {
  if (busy) return;
  busy = true;
  notice = '';
  render();
  try {
    state = stop
      ? await send('YT_LOOP_STOP')
      : await send('YT_LOOP_START', { videoId: initialId, start: parseTime(startInput.value), end: parseTime(endInput.value) });
  } catch (problem) {
    notice = problem.message;
  } finally {
    busy = false;
    render();
  }
}

$('loop-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const stop = state?.enabled && !dirty();
  if (!stop && rangeProblem()) {
    render();
    document.querySelector('input[aria-invalid="true"]')?.focus();
    return;
  }
  changeLoop(stop);
});
$('stop').addEventListener('click', () => changeLoop(true));
[startInput, endInput].forEach((input) => input.addEventListener('input', () => { notice = ''; render(); }));
document.querySelectorAll('.use-current').forEach((button) => button.addEventListener('click', async () => {
  try {
    state = await send('YT_LOOP_GET');
    if (!state.ready || state.videoId !== initialId) { render(); return; }
    $(button.dataset.time).value = preciseTime(Math.floor(state.currentTime * 10) / 10);
    notice = '';
    render();
  } catch {
    notice = 'Could not read the position. Reopen the extension and try again.';
    render();
  }
}));
$('retry').addEventListener('click', connect);
setInterval(async () => {
  if (!state || busy || polling) return;
  polling = true;
  try {
    const wasReady = state.ready;
    state = await send('YT_LOOP_GET');
    if (!wasReady && state.ready && !startInput.value) setDefaults();
    render();
  } catch {
    showEmpty('Connection lost', 'Reload the YouTube tab, then reopen this extension.');
  } finally {
    polling = false;
  }
}, 500);
connect();

$('show-on-page').addEventListener('click', async () => {
  try {
    await chrome.scripting.executeScript({ target: { tabId }, files: ['src/panel.js'] });
    await chrome.scripting.executeScript({ target: { tabId }, func: () => globalThis.__ytRangeLooperPanel?.show() });
    window.close();
  } catch {
    notice = 'Could not show controls. Reload YouTube and try again.';
    render();
  }
});

const defaultControls = $('default-controls');
async function loadPreference() {
  if (!chrome.storage?.local) return;
  try {
    const settings = await chrome.storage.local.get({ showControlsByDefault: true });
    defaultControls.checked = settings.showControlsByDefault;
    defaultControls.disabled = false;
  } catch {
    $('preference-error').textContent = 'Could not load your preference. Reopen the popup.';
    $('preference-error').hidden = false;
  }
}
defaultControls.addEventListener('change', async () => {
  defaultControls.disabled = true;
  try {
    await chrome.storage.local.set({ showControlsByDefault: defaultControls.checked });
    $('preference-error').hidden = true;
  } catch {
    defaultControls.checked = !defaultControls.checked;
    $('preference-error').textContent = 'Could not save your preference. Try again.';
    $('preference-error').hidden = false;
  } finally {
    defaultControls.disabled = false;
  }
});
loadPreference();
