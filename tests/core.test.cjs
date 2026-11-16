const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseTime, formatTime, validateRange, videoId } = require('../src/core.js');

test('parses seconds, minutes, hours, and fractional seconds', () => {
  for (const [input, expected] of [['90', 90], ['1:30', 90], ['1:02:30', 3750], [' 0:05.25 ', 5.25], ['0.5', 0.5]]) {
    assert.equal(parseTime(input), expected);
  }
});

test('rejects malformed and out-of-range clock components', () => {
  for (const input of ['', '-1', '1:60', '1:99:00', 'abc', '1e2', 'Infinity', '1:2:3:4', '5.', ':30']) {
    assert.ok(Number.isNaN(parseTime(input)), input);
  }
});

test('formats short and hour-long timestamps', () => {
  assert.equal(formatTime(9), '0:09');
  assert.equal(formatTime(90.8), '1:30');
  assert.equal(formatTime(3750), '1:02:30');
});

test('validates finite ranges, minimum length, order, and video bounds', () => {
  assert.equal(validateRange(0, 10, 10), '');
  assert.equal(validateRange(0.5, 1, 10), '');
  for (const args of [[NaN, 10, 20], [-1, 10, 20], [10, 10, 20], [10, 9, 20], [0, 0.1, 20], [0, 10, Infinity], [0, 30, 20]]) {
    assert.notEqual(validateRange(...args), '');
  }
});

test('identifies YouTube watch and Shorts pages, excluding lookalike hosts', () => {
  assert.equal(videoId('https://www.youtube.com/watch?v=abc&list=xyz'), 'abc');
  assert.equal(videoId('https://www.youtube.com/shorts/abc'), 'abc');
  assert.equal(videoId('https://m.youtube.com/watch?v=abc'), 'abc');
  for (const url of ['https://www.youtube.com/', 'https://www.youtube.com/watch', 'https://youtube.com.evil.test/watch?v=abc', 'garbage']) {
    assert.equal(videoId(url), null);
  }
});

const { validateTimeInputs } = require('../src/core.js');

test('shows required and format errors on the affected field', () => {
  assert.equal(validateTimeInputs('', '10', 120).start, 'Enter a start time.');
  assert.equal(validateTimeInputs('0', ' ', 120).end, 'Enter a stop time.');
  for (const text of ['abc', '1:60', '1:99:00', 'Infinity', '1e3', '0:10junk']) {
    const errors = validateTimeInputs(text, '90', 120);
    assert.ok(errors.start, text);
    assert.equal(errors.end, '');
  }
});

test('rejects negative times, times beyond video bounds, and reversed ranges', () => {
  assert.match(validateTimeInputs('-1', '10', 120).start, /negative/);
  assert.match(validateTimeInputs('0', '-1', 120).end, /negative/);
  assert.match(validateTimeInputs('120', '120', 120).start, /before/);
  assert.match(validateTimeInputs('0', '121', 120).end, /at or before/);
  assert.match(validateTimeInputs('10', '5', 120).end, /later/);
  assert.match(validateTimeInputs('10', '10', 120).end, /later/);
  assert.match(validateTimeInputs('10', '10.1', 120).end, /0.5/);
});

test('clears both field errors for a corrected range including an exact video end', () => {
  assert.deepEqual(validateTimeInputs('1:30', '2:00', 120), { start: '', end: '' });
  assert.deepEqual(validateTimeInputs('0', '0.5', 120), { start: '', end: '' });
});
