import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLifetime } from '../src/world/lifetime.js';
import { createPreviewStorage } from '../src/world/preview-storage.js';

test('unmount cancels pending animation, timer, interval and global keyboard listener', () => {
  let id = 0, calls = 0;
  const pending = new Map();
  const schedule = fn => { pending.set(++id, fn); return id; };
  const cancel = id => pending.delete(id);
  const platform = { setTimeout: schedule, clearTimeout: cancel, setInterval: schedule, clearInterval: cancel, requestAnimationFrame: schedule, cancelAnimationFrame: cancel };
  const first = createLifetime(platform), target = new EventTarget();
  first.setTimeout(() => calls++, 10); first.setInterval(() => calls++, 10);
  first.requestAnimationFrame(() => calls++); first.listen(target, 'keydown', () => calls++);
  first.dispose(); first.dispose();
  target.dispatchEvent(new Event('keydown'));
  assert.equal(pending.size, 0); assert.equal(calls, 0); assert.equal(first.signal.aborted, true);
  assert.equal(first.setTimeout(() => calls++, 0), 0);
  const second = createLifetime(platform);
  second.listen(target, 'keydown', () => calls++);
  target.dispatchEvent(new Event('keydown'));
  assert.equal(calls, 1); second.dispose();
});

test('denied browser storage does not prevent opening or leaving the scene', () => {
  const storage = createPreviewStorage(() => { throw new Error('denied'); });
  assert.deepEqual(storage.load(() => ({ demo: true })), { demo: true });
  assert.equal(storage.save({ demo: true }), false);
  assert.doesNotThrow(() => storage.clear());
});

test('incomplete old state falls back while retaining a recovery copy', () => {
  const values = new Map([['timrom.v1', '{"v":1,"name":"Saved name"}']]);
  const storage = createPreviewStorage(() => ({ getItem: k => values.get(k), setItem: (k,v) => values.set(k,v), removeItem: k => values.delete(k) }));
  assert.deepEqual(storage.load(() => ({ fresh: true })), { fresh: true });
  assert.equal(values.get('timrom.v1.recovery'), '{"v":1,"name":"Saved name"}');
});
