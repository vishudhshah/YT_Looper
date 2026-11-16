/* global chrome, YTLoopCore */
(function () {
  'use strict';
  if (globalThis.__ytRangeLooperPanel) {
    return;
  }
  const controller = globalThis.__ytRangeLooper;
  if (!controller) return;
  const { parseTime, formatTime, validateTimeInputs } = YTLoopCore;
  const host = document.createElement('div');
  host.setAttribute('data-yt-range-looper', 'controls');
  const root = host.attachShadow({ mode: 'closed' });
  root.innerHTML = `
    <style>
      :host { display:block; position:relative; z-index:1; isolation:isolate; margin:0 0 16px; color-scheme:light; --bg:#fff; --fg:#202020; --muted:#606060; --line:#d6d6d6; --field:#fafafa; --accent:#a8391b; --on-accent:#fff; --error:#ac291c; --active:#286943; font:13px/1.4 Roboto,Arial,sans-serif; }
      :host([dark]) { color-scheme:dark; --bg:#181818; --fg:#f1f1f1; --muted:#aaa; --line:#454545; --field:#222; --accent:#efab8c; --on-accent:#28170f; --error:#ffb4a9; --active:#8bd4a5; }
      :host([hidden]) { display:none !important; }
      :host([floating]) { position:fixed; bottom:20px; right:20px; z-index:2200; width:min(640px,calc(100vw - 40px)); margin:0; padding-top:0; }
      :host { container-type:inline-size; }
      :host([floating]) .panel { width:100%; }
      * { box-sizing:border-box; }
      [hidden] { display:none !important; }
      .spacer { display:block; height:24px; min-height:24px; }
      :host([floating]) .spacer { display:none; }
      .panel { position:relative; width:100%; max-width:100%; border:1px solid var(--line); border-radius:12px; background:var(--bg); color:var(--fg); padding:10px 12px; }
      .row { display:flex; align-items:center; gap:14px; padding-right:32px; }
      .identity { min-width:50px; }
      h2 { font:600 14px/1.4 Roboto,Arial,sans-serif; margin:0; }
      #status { display:block; color:var(--muted); font-size:12px; margin-top:2px; white-space:nowrap; }
      #status.active { color:var(--active); }
      form { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)) 112px; align-items:start; gap:16px; flex:1; min-width:0; }
      .field { min-width:0; }
      .label-row { display:flex; justify-content:space-between; gap:6px; align-items:center; height:20px; margin-bottom:4px; }
      label { font-size:12px; font-weight:500; }
      button,input { font:inherit; }
      button { cursor:pointer; }
      input[type=text] { width:100%; min-width:0; height:34px; padding:6px 10px; border:1px solid var(--line); border-radius:6px; background:var(--field); color:var(--fg); font-size:14px; font-variant-numeric:tabular-nums; caret-color:var(--accent); }
      input[aria-invalid=true] { border-color:var(--error); }
      input::placeholder { color:var(--muted); }
      button:focus-visible,input:focus-visible { outline:2px solid var(--accent); outline-offset:3px; }
      ::selection { background:var(--accent); color:var(--on-accent); }
      .now { border:0; background:transparent; color:var(--muted); font-size:12px; padding:2px 0; }
      .now:hover { color:var(--fg); text-decoration:underline; text-underline-offset:3px; }
      .actions { display:flex; justify-content:flex-end; align-self:start; margin:24px 0 0; flex-shrink:0; width:112px; }
      #toggle { height:34px; width:112px; white-space:nowrap; border:0; padding:5px 12px; border-radius:18px; background:var(--accent); color:var(--on-accent); font-weight:600; }
      #toggle:hover { filter:brightness(.92); }
      #toggle.stopping { background:var(--fg); color:var(--bg); }
      #toggle:disabled { opacity:.45; cursor:not-allowed; }
      #close { position:absolute; top:6px; right:6px; display:flex; align-items:center; justify-content:center; width:28px; height:28px; padding:5px; border:0; border-radius:50%; background:transparent; color:var(--muted); flex-shrink:0; }
      #close:hover { background:var(--field); color:var(--fg); }
      #close svg { width:18px; height:18px; }
      .error { color:var(--error); font-size:12px; line-height:1.4; margin:5px 0 0; overflow-wrap:anywhere; }
      #message { color:var(--muted); font-size:12px; margin:10px 0 0; }
      #message.error { color:var(--error); }
      .range-slider { position:relative; height:28px; margin-top:10px; }
      .slider-track { position:absolute; left:7px; right:7px; top:12px; height:3px; border-radius:2px; background:var(--line); pointer-events:none; }
      #range-fill { position:absolute; height:100%; background:var(--accent); border-radius:inherit; }
      input[type=range] { position:absolute; inset:0; width:100%; height:28px; margin:0; padding:0; border:0; background:transparent; appearance:none; pointer-events:none; }
      input[type=range]::-webkit-slider-runnable-track { height:3px; background:transparent; }
      input[type=range]::-webkit-slider-thumb { appearance:none; width:14px; height:14px; margin-top:-5.5px; border:2px solid var(--bg); border-radius:50%; background:var(--accent); pointer-events:auto; cursor:ew-resize; }
      input[type=range]:focus-visible { outline:none; }
      input[type=range]:focus-visible::-webkit-slider-thumb { outline:2px solid var(--accent); outline-offset:3px; }
      input[type=range]:disabled::-webkit-slider-thumb { background:var(--muted); cursor:not-allowed; }
      .range-slider:has(input:disabled) { opacity:.45; }
      @container (max-width:460px) {
        .panel { width:100%; }
        .row { flex-wrap:wrap; gap:12px; }
        .identity { display:flex; align-items:center; gap:10px; flex:1; order:0; }
        #status { margin:0; }
        .row { padding-right:0; }
        .identity { padding-right:32px; }
        form { order:2; flex-basis:100%; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }
        .actions { grid-column:1 / -1; justify-self:end; margin-top:0; }
      }
    </style>
    <div class="spacer" aria-hidden="true"></div>
    <section class="panel" aria-label="Video range loop">
      <div class="row">
        <div class="identity"><h2>Loop</h2><span id="status">Ready</span></div>
        <form novalidate>
          <div class="field">
            <div class="label-row"><label for="start">Start</label><button class="now" type="button" data-time="start" aria-label="Use current position for start time">Use current</button></div>
            <input id="start" type="text" placeholder="0:00" spellcheck="false" autocomplete="off" aria-describedby="start-error" title="Seconds, m:ss, or h:mm:ss" required>
            <p id="start-error" class="error" aria-live="polite" hidden></p>
          </div>
          <div class="field">
            <div class="label-row"><label for="end">Stop</label><button class="now" type="button" data-time="end" aria-label="Use current position for stop time">Use current</button></div>
            <input id="end" type="text" placeholder="0:10" spellcheck="false" autocomplete="off" aria-describedby="end-error" title="Seconds, m:ss, or h:mm:ss" required>
            <p id="end-error" class="error" aria-live="polite" hidden></p>
          </div>
          <div class="actions"><button id="toggle" type="submit">Start loop</button></div>
        </form>
        <button id="close" type="button" aria-label="Hide loop controls; an active loop keeps playing" title="Hide controls (loop keeps playing)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg></button>
      </div>
      <div class="range-slider" role="group" aria-label="Loop time range">
        <div class="slider-track" aria-hidden="true"><div id="range-fill"></div></div>
        <input id="range-start" type="range" min="0" max="100" step="0.001" value="0" aria-label="Loop start time">
        <input id="range-end" type="range" min="0" max="100" step="0.001" value="10" aria-label="Loop stop time">
      </div>
      <p id="message" role="status" aria-live="polite" hidden></p>
    </section>`;
  const $ = (id) => root.getElementById(id);
  const startInput = $('start');
  const endInput = $('end');
  let currentId;
  let state;
  let notice = '';
  let lastRange = '';
  let initialized = false;
  let showByDefault = true;
  let settingsLoaded = false;
  let visibilityOverride = null;

  function preciseTime(seconds) {
    const milliseconds = Math.round(seconds * 1000);
    const fraction = milliseconds % 1000;
    return formatTime(Math.floor(milliseconds / 1000)) + (fraction ? '.' + String(fraction).padStart(3, '0').replace(/0+$/, '') : '');
  }

  function setDefaults() {
    if (state.range) {
      startInput.value = preciseTime(state.range.start);
      endInput.value = preciseTime(state.range.end);
    } else if (state.ready) {
      const start = Math.max(0, Math.min(Math.floor(state.currentTime), Math.floor(state.duration - 1)));
      startInput.value = formatTime(start);
      endInput.value = preciseTime(Math.min(start + 10, state.duration));
    } else {
      startInput.value = '';
      endInput.value = '';
    }
  }

  function dirty() {
    return !state.range || parseTime(startInput.value) !== state.range.start || parseTime(endInput.value) !== state.range.end;
  }

  function place() {
    host.toggleAttribute('dark', document.documentElement.hasAttribute('dark'));
    const below = document.querySelector('ytd-watch-flexy #primary-inner > #below');
    if (below) {
      host.removeAttribute('floating');
      // Stay inside YouTube's metadata layer so the player's ambient canvas
      // cannot paint over the controls in the regular watch layout.
      if (host.parentElement !== below || below.firstElementChild !== host) below.prepend(host);
    } else if (!host.isConnected) {
      host.setAttribute('floating', '');
      document.body.appendChild(host);
    }
  }

  function render() {
    state = controller.command({ type: 'YT_LOOP_GET' });
    const nextRange = JSON.stringify(state.range);
    if (state.videoId !== currentId) {
      currentId = state.videoId;
      visibilityOverride = null;
      notice = '';
      setDefaults();
      initialized = state.ready || Boolean(state.range);
    } else if (lastRange !== nextRange && root.activeElement?.tagName !== 'INPUT') {
      setDefaults();
    }
    lastRange = nextRange;
    // A video may become ready after opening controls during an ad or loading.
    if (!initialized && state.ready) {
      setDefaults();
      initialized = true;
    }
    place();
    host.hidden = !settingsLoaded || !(visibilityOverride ?? showByDefault) || !state.videoId;
    const changed = dirty();
    const stopping = state.enabled && !changed;
    const errors = state.ready ? validateTimeInputs(startInput.value, endInput.value, state.duration) : { start: '', end: '' };
    for (const [name, input] of [['start', startInput], ['end', endInput]]) {
      input.disabled = !state.ready;
      input.setAttribute('aria-invalid', String(Boolean(errors[name])));
      input.setCustomValidity(errors[name]);
      if ($(`${name}-error`).textContent !== errors[name]) $(`${name}-error`).textContent = errors[name];
      $(`${name}-error`).hidden = !errors[name];
    }
    root.querySelectorAll('.now').forEach((button) => { button.disabled = !state.ready; });
    const sliderStart = $('range-start');
    const sliderEnd = $('range-end');
    const duration = state.duration || 1;
    sliderStart.max = sliderEnd.max = String(duration);
    sliderStart.disabled = sliderEnd.disabled = !state.ready || duration < 0.5;
    if (!errors.start && !errors.end && state.ready) {
      sliderStart.value = String(parseTime(startInput.value));
      sliderEnd.value = String(parseTime(endInput.value));
    }
    sliderStart.setAttribute('aria-valuetext', preciseTime(Number(sliderStart.value)));
    sliderEnd.setAttribute('aria-valuetext', preciseTime(Number(sliderEnd.value)));
    $('range-fill').style.left = `${Number(sliderStart.value) / duration * 100}%`;
    $('range-fill').style.width = `${Math.max(0, Number(sliderEnd.value) - Number(sliderStart.value)) / duration * 100}%`;

    $('status').textContent = state.enabled ? (state.paused ? 'Paused' : 'Looping') : 'Ready';
    $('status').classList.toggle('active', state.enabled);
    $('toggle').textContent = stopping ? 'Stop loop' : state.enabled ? 'Update loop' : 'Start loop';
    $('toggle').classList.toggle('stopping', stopping);
    $('toggle').disabled = !stopping && (!state.ready || Boolean(errors.start || errors.end));
    const message = notice || state.error || (!state.ready ? (state.ad ? 'Waiting for the ad to finish…' : 'Waiting for the video. Live streams are not supported.') : state.enabled && state.paused ? 'Press play on YouTube to resume.' : '');
    if ($('message').textContent !== message) $('message').textContent = message;
    $('message').hidden = !message;
    $('message').classList.toggle('error', Boolean(notice || state.error));
  }

  function change(stop) {
    try {
      notice = '';
      state = controller.command(stop ? { type: 'YT_LOOP_STOP' } : {
        type: 'YT_LOOP_START', videoId: currentId,
        start: parseTime(startInput.value), end: parseTime(endInput.value),
      });
    } catch (problem) {
      notice = problem.message;
    }
    render();
  }

  root.querySelector('form').addEventListener('submit', (event) => {
    event.preventDefault();
    const fresh = controller.command({ type: 'YT_LOOP_GET' });
    if (fresh.videoId !== currentId) { render(); return; }
    if (state.enabled && !dirty()) { change(true); return; }
    const errors = validateTimeInputs(startInput.value, endInput.value, fresh.duration);
    if (!fresh.ready || errors.start || errors.end) {
      render();
      root.querySelector('input[aria-invalid="true"]')?.focus();
      return;
    }
    change(false);
  });
  [startInput, endInput].forEach((input) => input.addEventListener('input', () => { notice = ''; render(); }));
  root.querySelectorAll('.now').forEach((button) => button.addEventListener('click', () => {
    const fresh = controller.command({ type: 'YT_LOOP_GET' });
    if (!fresh.ready || fresh.videoId !== currentId) { render(); return; }
    $(button.dataset.time).value = preciseTime(Math.floor(fresh.currentTime * 10) / 10);
    notice = '';
    render();
  }));
  for (const boundary of ['start', 'end']) {
    const slider = $(`range-${boundary}`);
    slider.addEventListener('input', () => {
      const fresh = controller.command({ type: 'YT_LOOP_GET' });
      if (!fresh.ready || fresh.videoId !== currentId) { render(); return; }
      let start = Number($('range-start').value);
      let end = Number($('range-end').value);
      if (boundary === 'start') start = Math.max(0, Math.min(start, end - 0.5));
      else end = Math.min(fresh.duration, Math.max(end, start + 0.5));
      startInput.value = preciseTime(start);
      endInput.value = preciseTime(end);
      notice = '';
      render();
    });
    // Apply an active loop when the handle is released, avoiding repeated seeks
    // while dragging. Inactive ranges stay drafts until Start loop is clicked.
    slider.addEventListener('change', () => {
      const fresh = controller.command({ type: 'YT_LOOP_GET' });
      if (fresh.videoId !== currentId || !fresh.ready) { render(); return; }
      if (fresh.enabled) change(false);
    });
  }
  // Keep YouTube's global keyboard shortcuts out of editable controls.
  host.addEventListener('keydown', (event) => event.stopPropagation());
  host.addEventListener('keyup', (event) => event.stopPropagation());
  $('close').addEventListener('click', () => { visibilityOverride = false; host.hidden = true; });
  function show() {
    render();
    visibilityOverride = true;
    render();
    host.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    startInput.focus({ preventScroll: true });
  }
  globalThis.__ytRangeLooperPanel = { show };
  setInterval(render, 500);
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes.showControlsByDefault) return;
    showByDefault = changes.showControlsByDefault.newValue !== false;
    settingsLoaded = true;
    visibilityOverride = null;
    render();
  });
  chrome.storage.local.get({ showControlsByDefault: true }).then((settings) => {
    showByDefault = settings.showControlsByDefault !== false;
    settingsLoaded = true;
    render();
  }).catch(() => {
    settingsLoaded = true;
    render();
  });
  // Automatic page injection must not move the viewer or steal keyboard focus.
  render();
})();
