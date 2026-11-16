/* Shared by the popup, content script, and Node tests. */
(function (root) {
  'use strict';

  function parseTime(value) {
    const text = String(value).trim();
    if (!/^\d+(?:\.\d{1,3})?$/.test(text) &&
        !/^\d+:\d{1,2}(?:\.\d{1,3})?$/.test(text) &&
        !/^\d+:\d{1,2}:\d{1,2}(?:\.\d{1,3})?$/.test(text)) return NaN;
    const parts = text.split(':').map(Number);
    if (parts.length > 1 && parts.slice(1).some((part) => part >= 60)) return NaN;
    return parts.reduce((total, part) => total * 60 + part, 0);
  }

  function formatTime(seconds) {
    const value = Math.max(0, Math.floor(seconds || 0));
    const hours = Math.floor(value / 3600);
    const minutes = Math.floor(value / 60) % 60;
    const rest = String(value % 60).padStart(2, '0');
    return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${rest}` : `${minutes}:${rest}`;
  }

  function rangeErrors(start, end, duration) {
    const errors = { start: '', end: '' };
    if (!Number.isFinite(start)) errors.start = 'Use seconds, m:ss, or h:mm:ss.';
    else if (start < 0) errors.start = 'Start time cannot be negative.';
    if (!Number.isFinite(end)) errors.end = 'Use seconds, m:ss, or h:mm:ss.';
    else if (end < 0) errors.end = 'Stop time cannot be negative.';
    if (!Number.isFinite(duration) || duration <= 0) {
      if (!errors.end) errors.end = 'Wait for the video to load.';
      return errors;
    }
    if (!errors.start && start >= duration) errors.start = `Start must be before ${formatTime(duration)}.`;
    if (!errors.end && end > duration) errors.end = `Stop must be at or before ${formatTime(duration)}.`;
    if (!errors.start && !errors.end) {
      if (end <= start) errors.end = 'Stop must be later than start.';
      else if (Math.round((end - start) * 1000) < 500) errors.end = 'Choose at least 0.5 seconds.';
    }
    return errors;
  }

  function validateTimeInputs(startText, endText, duration) {
    const errors = rangeErrors(parseTime(startText), parseTime(endText), duration);
    if (!String(startText).trim()) errors.start = 'Enter a start time.';
    if (!String(endText).trim()) errors.end = 'Enter a stop time.';
    if (/^-/.test(String(startText).trim())) errors.start = 'Start time cannot be negative.';
    if (/^-/.test(String(endText).trim())) errors.end = 'Stop time cannot be negative.';
    return errors;
  }

  function validateRange(start, end, duration) {
    const errors = rangeErrors(start, end, duration);
    return errors.start || errors.end;
  }

  function videoId(url) {
    try {
      const parsed = new URL(url);
      if (!['www.youtube.com', 'youtube.com', 'm.youtube.com'].includes(parsed.hostname)) return null;
      if (parsed.pathname === '/watch') return parsed.searchParams.get('v') || null;
      return parsed.pathname.match(/^\/shorts\/([^/]+)/)?.[1] || null;
    } catch {
      return null;
    }
  }

  const api = { parseTime, formatTime, validateRange, validateTimeInputs, videoId };
  root.YTLoopCore = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(globalThis);
