import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { AEBridge } from '../src/bridge.js';
import { resolveColor } from '../src/brand.js';
import { createServer } from '../src/server.js';
import { loadPanel } from './fake-ae.js';

const brand = {
  name: 'Acme',
  colors: { primary: '#FF0000', text: '#FFFFFF' },
  fonts: { heading: 'Acme-Bold', body: 'Acme-Regular' },
  defaults: { width: 1080, height: 1920, frameRate: 25, duration: 6 },
};

async function connect({ allowRawScript = false, panelAllowsRaw = false, timeoutMs = 3000 } = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), 'ae-mcp-'));
  const auditLog = path.join(dir, 'audit.jsonl');
  const ae = loadPanel({ bridgeDir: dir, allowRawScript: panelAllowsRaw });
  // Stand in for AE's scheduleTask loop.
  const timer = setInterval(ae.poll, 20);
  const server = createServer({ bridge: new AEBridge({ dir, timeoutMs }), brand, allowRawScript, auditLog });
  const client = new Client({ name: 'test', version: '1.0.0' });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(a), client.connect(b)]);
  const call = async (name, args = {}) => {
    const res = await client.callTool({ name, arguments: args });
    const text = res.content[0].text;
    return res.isError ? { error: text } : JSON.parse(text);
  };
  const close = async () => { clearInterval(timer); await client.close(); rmSync(dir, { recursive: true, force: true }); };
  return { ae, client, call, close, auditLog };
}

describe('aftereffects-mcp end to end through the real panel script', () => {
  let s;
  before(async () => { s = await connect(); });
  after(async () => { await s.close(); });

  test('ping reaches the panel', async () => {
    const r = await s.call('ping');
    assert.equal(r.aeVersion, '26.0.0');
    assert.equal(r.bridgeVersion, '1.0.0');
  });

  test('create_composition fills brand defaults and resolves brand colours', async () => {
    const r = await s.call('create_composition', { name: 'Promo', bgColor: 'primary' });
    assert.deepEqual([r.width, r.height, r.frameRate, r.duration], [1080, 1920, 25, 6]);
    assert.deepEqual(r.bgColor, [1, 0, 0]);
    assert.equal(s.ae.app.project.activeItem.name, 'Promo');
  });

  test('add_text_layer applies brand font and default text colour', async () => {
    const r = await s.call('add_text_layer', { text: 'Hello "world"\nline 2', font: 'heading', fontSize: 120, position: [540, 400] });
    assert.equal(r.type, 'text');
    assert.equal(r.text, 'Hello "world"\nline 2');
    assert.deepEqual(r.position, [540, 400]);
    const doc = s.ae.app.project.activeItem.layer(1).property('ADBE Text Properties').property('ADBE Text Document').value;
    assert.equal(doc.font, 'Acme-Bold');
    assert.deepEqual([...doc.fillColor], [1, 1, 1]);
  });

  test('add_shape_layer builds fill and stroke', async () => {
    const r = await s.call('add_shape_layer', { shape: 'rectangle', size: [300, 200], color: '#00ff00', strokeColor: 'primary', roundness: 20, name: 'Card' });
    assert.equal(r.name, 'Card');
    assert.equal(r.type, 'shape');
    const inspect = await s.call('inspect_layer', { layer: 'Card', depth: 6 });
    const flat = JSON.stringify(inspect.properties);
    assert.match(flat, /"matchName":"ADBE Vector Rect Size","value":\[300,200\]/);
    assert.match(flat, /"matchName":"ADBE Vector Fill Color","value":\[0,1,0\]/);
    assert.match(flat, /"matchName":"ADBE Vector Stroke Color","value":\[1,0,0\]/);
  });

  test('set_keyframes animates position with easing and bare property names', async () => {
    const r = await s.call('set_keyframes', {
      layer: 'Card', property: 'Position', replace: true,
      keyframes: [{ time: 0, value: [0, 960] }, { time: 1, value: [540, 960], easing: 'linear' }],
    });
    assert.equal(r.numKeys, 2);
    const scale = await s.call('set_keyframes', { layer: 'Card', property: 'Transform/Scale', keyframes: [{ time: 0, value: [0, 0] }] });
    assert.equal(scale.numKeys, 1);
  });

  test('apply_effect sets parameters and reports bad names', async () => {
    const r = await s.call('apply_effect', { layer: 'Card', effect: 'Gaussian Blur', properties: { Blurriness: 15 } });
    assert.equal(r.matchName, 'ADBE Gaussian Blur 2');
    assert.equal(r.parameters[0].value, 15);
    const bad = await s.call('apply_effect', { layer: 'Card', effect: 'Nope' });
    assert.match(bad.error, /Unknown effect 'Nope'/);
    const badParam = await s.call('apply_effect', { layer: 'Card', effect: 'Gaussian Blur', properties: { Wat: 1 } });
    assert.match(badParam.error, /no parameter 'Wat'/);
  });

  test('get_composition lists layers top to bottom', async () => {
    const r = await s.call('get_composition', { comp: 'Promo' });
    assert.deepEqual(r.layers.map((l) => l.name), ['Card', 'Hello "world"\nline 2']);
    assert.deepEqual(r.layers[0].effects, ['Gaussian Blur']);
  });

  test('errors from AE come back as tool errors', async () => {
    assert.match((await s.call('get_composition', { comp: 'Missing' })).error, /Composition not found: Missing/);
    assert.match((await s.call('delete_layer', { layer: 99 })).error, /out of range/);
    assert.match((await s.call('add_text_layer', { text: 'x', color: 'chartreuse' })).error, /Unknown colour "chartreuse".*primary, text/);
  });

  test('every command is wrapped in an undo group', () => {
    assert.ok(s.ae.app.undo.includes('MCP: create_composition'));
  });

  test('mutating calls are written to the audit log, reads are not', () => {
    const lines = readFileSync(s.auditLog, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
    const commands = lines.map((l) => l.command);
    assert.ok(commands.includes('create_composition'));
    assert.ok(!commands.includes('get_composition'));
  });

  test('brand kit is exposed as a resource', async () => {
    const r = await s.client.readResource({ uri: 'brand://kit' });
    assert.equal(JSON.parse(r.contents[0].text).name, 'Acme');
  });
});

describe('raw ExtendScript gating', () => {
  test('run_script is not offered unless the server enables it', async () => {
    const s = await connect();
    const { tools } = await s.client.listTools();
    assert.ok(!tools.some((t) => t.name === 'run_script'));
    await s.close();
  });

  test('panel refuses run_script unless its checkbox is ticked', async () => {
    const s = await connect({ allowRawScript: true });
    assert.match((await s.call('run_script', { code: 'return 1;' })).error, /disabled in the AE-MCP-Bridge panel/);
    await s.close();
  });

  test('run_script returns values when both sides allow it', async () => {
    const s = await connect({ allowRawScript: true, panelAllowsRaw: true });
    assert.deepEqual(await s.call('run_script', { code: 'return { n: app.project.numItems, s: Json.stringify([1]) };' }), { n: 0, s: '[1]' });
    await s.close();
  });
});

test('bridge times out and withdraws the command when AE is not listening', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'ae-mcp-'));
  const bridge = new AEBridge({ dir, timeoutMs: 300 });
  await assert.rejects(bridge.send('ping'), /No response from After Effects/);
  const { readdirSync } = await import('node:fs');
  assert.deepEqual(readdirSync(dir), []);
  rmSync(dir, { recursive: true, force: true });
});

test('resolveColor handles hex, short hex, arrays and names', () => {
  const b = { colors: { brand: '#336699' } };
  assert.deepEqual(resolveColor(b, '#fff'), [1, 1, 1]);
  assert.deepEqual(resolveColor(b, 'brand'), [0.2, 0.4, 0.6]);
  assert.deepEqual(resolveColor(b, [0.1, 0.2, 0.3]), [0.1, 0.2, 0.3]);
  assert.throws(() => resolveColor(b, 'nope'), /Unknown colour/);
});
