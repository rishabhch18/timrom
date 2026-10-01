import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('the preserved model pack contains all 51 valid GLBs with matching original bytes', () => {
  const root = new URL('../', import.meta.url);
  const pack = JSON.parse(readFileSync(new URL('models.json', root), 'utf8'));
  assert.equal(Object.keys(pack).length, 51);
  for (const [name, base64] of Object.entries(pack)) {
    const glb = Buffer.from(base64, 'base64');
    assert.equal(glb.readUInt32LE(0), 0x46546c67, `${name}: GLB magic`);
    assert.equal(glb.readUInt32LE(4), 2, `${name}: GLB version`);
    assert.equal(glb.readUInt32LE(8), glb.length, `${name}: byte length`);
    assert.deepEqual(glb, readFileSync(new URL(`models/${name}.glb`, root)), `${name}: unchanged model`);
    const jsonSize = glb.readUInt32LE(12);
    const scene = JSON.parse(glb.subarray(20, 20 + jsonSize).toString());
    assert.ok(scene.scenes.length > 0, `${name}: scene`);
    if (name.startsWith('character-')) assert.ok(scene.animations.length > 0, `${name}: preserved animation clips`);
  }
});
