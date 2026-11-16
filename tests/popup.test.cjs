const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

async function setup() {
  const html = fs.readFileSync('src/popup.html', 'utf8');
  const elements = new Map();
  for (const [, id] of html.matchAll(/\bid="([^"]+)"/g)) {
    const events = new Map();
    const attrs = new Map();
    const classes = new Set();
    elements.set(id, {
      value: '', textContent: '', hidden: false, disabled: false,
      classList: { toggle(name, on) { on ? classes.add(name) : classes.delete(name); }, remove(name) { classes.delete(name); } },
      addEventListener(name, fn) { events.set(name, fn); },
      setAttribute(name, value) { attrs.set(name, value); },
      getAttribute(name) { return attrs.get(name); },
      toggleAttribute(name, force) { if (force) attrs.set(name, ''); else attrs.delete(name); },
      setCustomValidity(message) { this.validationMessage = message; },
      focus() { this.focused = true; },
      emit(name) { return events.get(name)?.({ preventDefault() {} }); },
    });
  }
  const messages = [];
  const state = { videoId: 'demo', ready: true, duration: 120, currentTime: 10, title: 'Video', range: null, enabled: false, paused: true, error: '' };
  const context = vm.createContext({
    URL,
    document: {
      getElementById(id) { assert.ok(elements.has(id), `Missing element: ${id}`); return elements.get(id); },
      querySelectorAll() { return []; },
      querySelector() { return ['start', 'end'].map((id) => elements.get(id)).find((el) => el.getAttribute('aria-invalid') === 'true'); },
    },
    chrome: {
      scripting: { async executeScript() {} },
      tabs: {
        async query() { return [{ id: 1, url: 'https://www.youtube.com/watch?v=demo' }]; },
        async sendMessage(_id, message) {
          messages.push(message);
          if (message.type === 'YT_LOOP_START') {
            state.enabled = true;
            state.range = { start: message.start, end: message.end };
          }
          if (message.type === 'YT_LOOP_STOP') state.enabled = false;
          return { ok: true, state: structuredClone(state) };
        },
      },
    },
    setInterval() {},
  });
  vm.runInContext(fs.readFileSync('src/core.js', 'utf8'), context);
  vm.runInContext(fs.readFileSync('src/popup.js', 'utf8'), context);
  await new Promise(setImmediate);
  return { get: (id) => elements.get(id), messages };
}

test('popup connects and shows validation errors beside the invalid field', async () => {
  const env = await setup();
  assert.equal(env.get('loop-form').hidden, false);
  assert.equal(env.get('toggle').disabled, false);
  env.get('end').value = '1:99';
  env.get('end').emit('input');
  assert.equal(env.get('end').getAttribute('aria-invalid'), 'true');
  assert.equal(env.get('end-error').hidden, false);
  assert.ok(env.get('end').validationMessage);
  assert.equal(env.get('start-error').hidden, true);
  assert.equal(env.get('toggle').disabled, true);
  env.get('loop-form').emit('submit');
  assert.ok(env.get('end').focused);
  assert.equal(env.messages.some((m) => m.type === 'YT_LOOP_START'), false);
});

test('correcting the range clears errors and enables submission', async () => {
  const env = await setup();
  env.get('end').value = '';
  env.get('end').emit('input');
  assert.equal(env.get('end-error').textContent, 'Enter a stop time.');
  env.get('end').value = '2:00';
  env.get('end').emit('input');
  assert.equal(env.get('end').validationMessage, '');
  assert.equal(env.get('end-error').hidden, true);
  assert.equal(env.get('toggle').disabled, false);
  env.get('loop-form').emit('submit');
  await new Promise(setImmediate);
  assert.equal(env.messages.at(-1).end, 120);
  assert.equal(env.get('toggle-label').textContent, 'Stop loop');
});

test('invalid edits cannot update a running loop but can still stop it', async () => {
  const env = await setup();
  env.get('loop-form').emit('submit');
  await new Promise(setImmediate);
  env.get('start').value = 'abc';
  env.get('start').emit('input');
  assert.equal(env.get('toggle').disabled, true);
  assert.equal(env.get('stop').hidden, false);
  assert.equal(env.get('stop').disabled, false);
  env.get('stop').emit('click');
  await new Promise(setImmediate);
  assert.equal(env.messages.at(-1).type, 'YT_LOOP_STOP');
});
