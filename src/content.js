(function () {
  'use strict';
  // Opening the popup repeatedly must never install duplicate controllers.
  if (globalThis.__ytRangeLooper) return;
  const { videoId, validateRange } = globalThis.YTLoopCore;
  let id = null;
  let video = null;
  let range = null;
  let enabled = false;
  let error = '';
  let loopTimer = null;
  let seekingToStart = false;
  let markerHost = null;
  let markerStart = null;
  let markerEnd = null;

  function isAd() {
    return Boolean(document.querySelector('.ad-showing, .ad-interrupting'));
  }

  function removeMarkers() {
    markerHost?.remove();
    markerHost = null;
    markerStart = null;
    markerEnd = null;
  }

  function syncMarkers() {
    if (!enabled || !range || !video || isAd() || validateRange(range.start, range.end, video.duration)) {
      removeMarkers();
      return;
    }
    // Use the full seek bar, not individual chapter segments. Percentages follow
    // resizing and fullscreen without measuring or changing YouTube's layout.
    const timeline = document.querySelector('#movie_player .ytp-progress-bar, #movie_player .ypcs-scrub-slider-slot.ytu-player-controls');
    if (!timeline) {
      removeMarkers();
      return;
    }
    if (!markerHost || markerHost.parentElement !== timeline || !markerHost.isConnected) {
      removeMarkers();
      markerHost = document.createElement('div');
      markerHost.setAttribute('data-yt-range-looper', 'markers');
      markerHost.setAttribute('aria-hidden', 'true');
      markerHost.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:35;';
      const shadow = markerHost.attachShadow({ mode: 'closed' });
      for (const boundary of ['start', 'stop']) {
        const marker = document.createElement('span');
        marker.style.cssText = 'position:absolute;top:50%;width:5px;height:11px;box-sizing:border-box;pointer-events:none;border:1.5px solid #ffdbba;filter:drop-shadow(0 1px 1px #0009);';
        if (boundary === 'start') {
          marker.style.borderRight = '0';
          marker.style.transform = 'translateY(-50%)';
          markerStart = marker;
        } else {
          marker.style.borderLeft = '0';
          marker.style.transform = 'translate(-100%,-50%)';
          markerEnd = marker;
        }
        shadow.appendChild(marker);
      }
      timeline.appendChild(markerHost);
    }
    const startPosition = `${range.start / video.duration * 100}%`;
    const endPosition = `${range.end / video.duration * 100}%`;
    if (markerStart.style.left !== startPosition) markerStart.style.left = startPosition;
    if (markerEnd.style.left !== endPosition) markerEnd.style.left = endPosition;
  }

  function stop() {
    enabled = false;
    clearInterval(loopTimer);
    loopTimer = null;
    removeMarkers();
  }

  function play() {
    const promise = video?.play();
    promise?.catch(() => {
      error = 'Press play on YouTube to continue your loop.';
    });
  }

  function enforce() {
    sync();
    if (!enabled || !video || isAd() || !range || video.seeking || seekingToStart) return;
    if (!Number.isFinite(video.duration) || !video.duration) return;
    const problem = validateRange(range.start, range.end, video.duration);
    if (problem) {
      error = problem;
      stop();
      return;
    }
    if (video.currentTime >= range.end || video.currentTime < range.start) {
      const ended = video.ended;
      seekingToStart = true;
      video.currentTime = range.start;
      // The browser emits seeked even when a timeupdate caused the seek.
      if (ended) play();
    }
  }

  function onSeeked() {
    seekingToStart = false;
    enforce();
  }

  function sync() {
    const nextId = videoId(location.href);
    if (nextId !== id) {
      stop();
      range = null;
      error = '';
      id = nextId;
    }
    const nextVideo = id ? document.querySelector('#movie_player video.html5-main-video, video.html5-main-video, video') : null;
    if (nextVideo !== video) {
      if (video) {
        video.removeEventListener('timeupdate', enforce);
        video.removeEventListener('ended', enforce);
        video.removeEventListener('seeked', onSeeked);
      }
      video = nextVideo;
      seekingToStart = false;
      if (video) {
        video.addEventListener('timeupdate', enforce);
        video.addEventListener('ended', enforce);
        video.addEventListener('seeked', onSeeked);
      }
    }
    syncMarkers();
  }

  function snapshot() {
    sync();
    const ad = isAd();
    const ready = Boolean(id && video && Number.isFinite(video.duration) && video.duration > 0 && video.readyState >= 1 && !ad);
    return {
      darkMode: Boolean(document.documentElement?.hasAttribute('dark')),
      videoId: id,
      ready,
      ad,
      duration: ready ? video.duration : null,
      currentTime: ready ? video.currentTime : null,
      title: document.querySelector('h1.ytd-watch-metadata yt-formatted-string')?.textContent?.trim() || document.title.replace(/ - YouTube$/, ''),
      range,
      enabled,
      paused: video?.paused ?? true,
      error,
    };
  }

  function command(message) {
    const state = snapshot();
    if (message.type === 'YT_LOOP_GET') return state;
    if (message.type === 'YT_LOOP_STOP') {
      stop();
      error = '';
      return snapshot();
    }
    if (message.type !== 'YT_LOOP_START') return undefined;
    if (message.videoId !== id) throw new Error('The video changed. Reopen the extension to choose a new range.');
    if (!state.ready) throw new Error(state.ad ? 'Wait for the ad to finish, then try again.' : 'Wait for a regular YouTube video to load.');
    const problem = validateRange(message.start, message.end, video.duration);
    if (problem) throw new Error(problem);
    stop();
    range = { start: message.start, end: message.end };
    enabled = true;
    error = '';
    seekingToStart = false;
    // Enabling or updating a loop should not interrupt playback already inside it.
    if (video.currentTime < range.start || video.currentTime >= range.end) {
      video.currentTime = range.start;
    }
    if (video.paused) play();
    loopTimer = setInterval(enforce, 75);
    return snapshot();
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message?.type?.startsWith('YT_LOOP_')) return;
    try {
      sendResponse({ ok: true, state: command(message) });
    } catch (problem) {
      sendResponse({ ok: false, error: problem.message });
    }
  });
  // YouTube navigates without a page reload and may replace its video element.
  document.addEventListener('yt-navigate-finish', sync);
  setInterval(sync, 500);
  globalThis.__ytRangeLooper = { command };
  sync();
})();
