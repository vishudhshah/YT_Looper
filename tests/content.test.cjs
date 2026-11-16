const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function setup() {
  let ad = false;
  let selected;
  function makeElement() {
    return {
      style: {}, attributes: {}, children: [], parentElement: null, isConnected: false,
      setAttribute(name, value) { this.attributes[name] = value; },
      attachShadow() { this.shadow = makeElement(); return this.shadow; },
      appendChild(child) { child.parentElement = this; child.isConnected = true; this.children.push(child); },
      remove() {
        if (this.parentElement) this.parentElement.children = this.parentElement.children.filter((child) => child !== this);
        this.parentElement = null;
        this.isConnected = false;
      },
    };
  }
  let timeline = makeElement();
  const timers = new Map();
  const listeners = [];
  function makeVideo() {
    const events = new Map();
    return {
      currentTime: 0, duration: 120, readyState: 4, paused: true, ended: false, seeking: false, plays: 0,
      play() { this.paused = false; this.plays++; return Promise.resolve(); },
      addEventListener(name, callback) { events.set(name, callback); },
      removeEventListener(name) { events.delete(name); },
      emit(name) { events.get(name)?.(); },
    };
  }
  selected = makeVideo();
  const context = vm.createContext({
    URL, console,
    location: { href: 'https://www.youtube.com/watch?v=first' },
    document: {
      title: 'Practice video - YouTube',
      querySelector(selector) {
        if (selector.includes('ad-showing')) return ad ? {} : null;
        if (selector.includes('h1.')) return null;
        if (selector.includes('ytp-progress-bar')) return timeline;
        return selected;
      },
      createElement: makeElement,
      addEventListener() {},
    },
    chrome: { runtime: { onMessage: { addListener(listener) { listeners.push(listener); } } } },
    setInterval(fn, delay) { const key = {}; timers.set(key, { fn, delay }); return key; },
    clearInterval(key) { timers.delete(key); },
  });
  const core = fs.readFileSync('src/core.js', 'utf8');
  const content = fs.readFileSync('src/content.js', 'utf8');
  vm.runInContext(core, context);
  vm.runInContext(content, context);
  return {
    context, makeVideo, timers, listeners,
    get timeline() { return timeline; },
    replaceTimeline() { timeline = makeElement(); },
    removeTimeline() { timeline = null; },
    get video() { return selected; },
    replaceVideo(video) { selected = video; },
    setAd(value) { ad = value; },
    send(type, extra = {}) {
      let response;
      listeners[0]({ type, ...extra }, {}, (value) => { response = value; });
      return response;
    },
    tick() { [...timers.values()].forEach(({ fn }) => fn()); },
    reinject() { vm.runInContext(core, context); vm.runInContext(content, context); },
  };
}

function start(env, start = 10, end = 20) {
  return env.send('YT_LOOP_START', { videoId: 'first', start, end });
}

test('starts playback at the range start and wraps at the boundary', () => {
  const env = setup();
  assert.equal(start(env).ok, true);
  assert.equal(env.video.currentTime, 10);
  assert.equal(env.video.paused, false);
  env.video.currentTime = 20;
  env.video.emit('timeupdate');
  assert.equal(env.video.currentTime, 10);
  env.video.emit('seeked');
  env.video.currentTime = 5;
  env.tick();
  assert.equal(env.video.currentTime, 10);
});

test('stopping keeps playback running and retains the editable range', () => {
  const env = setup();
  start(env);
  const result = env.send('YT_LOOP_STOP');
  assert.equal(result.state.enabled, false);
  assert.equal(result.state.range.end, 20);
  env.video.currentTime = 25;
  env.tick();
  env.video.emit('timeupdate');
  assert.equal(env.video.currentTime, 25);
  assert.equal(env.video.paused, false);
});

test('manual pause stays paused and video end restarts the loop', () => {
  const env = setup();
  start(env, 110, 120);
  env.video.paused = true;
  env.video.currentTime = 115;
  env.tick();
  assert.equal(env.video.paused, true);
  env.video.currentTime = 120;
  env.video.ended = true;
  env.video.emit('ended');
  assert.equal(env.video.currentTime, 110);
  assert.equal(env.video.paused, false);
});

test('ad playback is untouched and the range resumes after ads', () => {
  const env = setup();
  start(env);
  env.setAd(true);
  env.video.currentTime = 25;
  env.tick();
  assert.equal(env.video.currentTime, 25);
  assert.equal(env.send('YT_LOOP_GET').state.ad, true);
  assert.equal(start(env).ok, false);
  env.setAd(false);
  env.tick();
  assert.equal(env.video.currentTime, 10);
});

test('navigation resets the range before it can affect another video', () => {
  const env = setup();
  start(env);
  env.context.location.href = 'https://www.youtube.com/watch?v=second';
  env.video.currentTime = 30;
  env.tick();
  const state = env.send('YT_LOOP_GET').state;
  assert.equal(state.enabled, false);
  assert.equal(state.range, null);
  assert.equal(env.video.currentTime, 30);
  assert.equal(start(env).ok, false);
});

test('repeated popup injections keep one message listener and controller', () => {
  const env = setup();
  start(env);
  env.reinject();
  assert.equal(env.listeners.length, 1);
  assert.equal(env.timers.size, 2);
  assert.equal(env.send('YT_LOOP_GET').state.enabled, true);
});

test('rebinds a replacement video element and rejects invalid ranges', () => {
  const env = setup();
  start(env);
  const previous = env.video;
  const next = env.makeVideo();
  next.currentTime = 30;
  env.replaceVideo(next);
  env.tick();
  assert.equal(next.currentTime, 10);
  previous.currentTime = 45;
  previous.emit('timeupdate');
  assert.equal(previous.currentTime, 45);
  assert.equal(start(env, 40, 20).ok, false);
  assert.equal(env.send('YT_LOOP_GET').state.range.start, 10);
});

test('rejects unloaded and live video without enabling the loop', () => {
  const env = setup();
  env.video.duration = Infinity;
  assert.equal(start(env).ok, false);
  assert.equal(env.send('YT_LOOP_GET').state.enabled, false);
});


test('adds two non-interactive markers at the loop boundaries and updates them', () => {
  const env = setup();
  assert.equal(env.timeline.children.length, 0);
  start(env, 30, 90);
  assert.equal(env.timeline.children.length, 1);
  const host = env.timeline.children[0];
  assert.equal(host.attributes['aria-hidden'], 'true');
  assert.match(host.style.cssText, /pointer-events:none/);
  assert.equal(host.shadow.children.length, 2);
  assert.equal(host.shadow.children[0].style.left, '25%');
  assert.equal(host.shadow.children[1].style.left, '75%');
  env.tick();
  assert.equal(env.timeline.children.length, 1);
  start(env, 0, 120);
  const updated = env.timeline.children[0].shadow.children;
  assert.equal(updated[0].style.left, '0%');
  assert.equal(updated[1].style.left, '100%');
});

test('removes markers when stopped, during ads, and on navigation', () => {
  const env = setup();
  start(env);
  env.send('YT_LOOP_STOP');
  assert.equal(env.timeline.children.length, 0);
  start(env);
  env.setAd(true);
  env.tick();
  assert.equal(env.timeline.children.length, 0);
  env.setAd(false);
  env.tick();
  assert.equal(env.timeline.children.length, 1);
  env.context.location.href = 'https://www.youtube.com/watch?v=second';
  env.tick();
  assert.equal(env.timeline.children.length, 0);
});

test('recreates markers after the player replaces its timeline', () => {
  const env = setup();
  start(env);
  const previous = env.timeline;
  env.replaceTimeline();
  env.tick();
  assert.equal(previous.children.length, 0);
  assert.equal(env.timeline.children.length, 1);
  env.removeTimeline();
  env.tick();
  assert.equal(env.send('YT_LOOP_GET').state.enabled, true);
});
