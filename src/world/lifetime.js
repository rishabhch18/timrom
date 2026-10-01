/** Track engine-owned work without patching global browser APIs. */
export function createLifetime(platform) {
  let disposed = false;
  const timeouts = new Set(), intervals = new Set(), frames = new Set(), listeners = [];
  const abort = new AbortController();
  return {
    get disposed() { return disposed; },
    signal: abort.signal,
    setTimeout(fn, delay, ...args) {
      if (disposed) return 0;
      const id = platform.setTimeout(() => { timeouts.delete(id); if (!disposed) fn(...args); }, delay);
      timeouts.add(id); return id;
    },
    clearTimeout(id) { platform.clearTimeout(id); timeouts.delete(id); },
    setInterval(fn, delay) {
      if (disposed) return 0;
      const id = platform.setInterval(() => { if (!disposed) fn(); }, delay);
      intervals.add(id); return id;
    },
    clearInterval(id) { platform.clearInterval(id); intervals.delete(id); },
    requestAnimationFrame(fn) {
      if (disposed) return 0;
      const id = platform.requestAnimationFrame(time => { frames.delete(id); if (!disposed) fn(time); });
      frames.add(id); return id;
    },
    listen(target, type, fn, options) {
      if (disposed) return;
      target.addEventListener(type, fn, options);
      listeners.push(() => target.removeEventListener(type, fn, options));
    },
    dispose() {
      if (disposed) return;
      disposed = true; abort.abort();
      timeouts.forEach(id => platform.clearTimeout(id));
      intervals.forEach(id => platform.clearInterval(id));
      frames.forEach(id => platform.cancelAnimationFrame(id));
      listeners.forEach(remove => remove());
      timeouts.clear(); intervals.clear(); frames.clear(); listeners.length = 0;
    },
  };
}
