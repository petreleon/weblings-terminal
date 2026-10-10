import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { LiveChecks } from '../src/live-checks.ts';

function fixture() {
  let snapshot = { key: 'intro2', source: 'broken', isTest: false };
  const jobs = [];
  let cancellations = 0;
  const engine = {
    state: { phase: 'ready' },
    execute(kind, source, status, extra) {
      status('Type-checking...');
      return new Promise(resolve => jobs.push({ kind, source, extra, resolve }));
    },
    // Keep promises pending to model a late result arriving after cancellation.
    cancel() { ++cancellations; }
  };
  const checks = new LiveChecks(engine, () => snapshot, 5);
  return { checks, jobs, setSnapshot: value => { snapshot = value; }, get cancellations() { return cancellations; } };
}
const error = { level: 'error', message: 'old error', rendered: 'old error', line: 1 };

test('rapid edits check only the latest source and never execute it', async () => {
  const f = fixture();
  f.checks.schedule();
  f.setSnapshot({ key: 'intro2', source: 'fixed', isTest: false });
  f.checks.schedule();
  await delay(20);
  assert.equal(f.jobs.length, 1);
  assert.equal(f.jobs[0].source, 'fixed');
  assert.equal(f.jobs[0].kind, 'check');
  f.jobs[0].resolve({ ok: true, diagnostics: [] });
  await delay(0);
  assert.equal(f.checks.state.phase, 'ready');
});

test('a cancelled check cannot replace the latest diagnostics', async () => {
  const f = fixture(); f.checks.schedule(); await delay(20);
  f.setSnapshot({ key: 'variables1', source: 'new exercise', isTest: false });
  f.checks.schedule(); await delay(20);
  assert.equal(f.cancellations, 1);
  f.jobs[1].resolve({ ok: true, diagnostics: [] }); await delay(0);
  f.jobs[0].resolve({ ok: false, diagnostics: [error] }); await delay(0);
  assert.equal(f.checks.state.phase, 'ready');
  assert.deepEqual(f.checks.state.diagnostics, []);
});

test('explicit execution pauses checks; editing while paused never cancels a run', async () => {
  const f = fixture(); f.checks.schedule(); await delay(20);
  f.checks.pause();
  assert.equal(f.cancellations, 1);
  f.setSnapshot({ key: 'playground', source: 'edited during run', isTest: false });
  f.checks.schedule(); await delay(20);
  assert.equal(f.cancellations, 1);
  assert.equal(f.jobs.length, 1);
  f.checks.resume(); await delay(20);
  assert.equal(f.jobs[1].source, 'edited during run');
  f.jobs[1].resolve({ ok: true, diagnostics: [] }); await delay(0);
});

test('test modules and const verifiers are checked without running tests', async () => {
  const f = fixture();
  f.setSnapshot({ key: 'tests1', source: 'test source', isTest: true, constCheck: 'const _: () = assert!(true);' });
  f.checks.schedule(); await delay(20);
  assert.equal(f.jobs[0].kind, 'check');
  assert.deepEqual(f.jobs[0].extra, { isTest: true, constCheck: 'const _: () = assert!(true);' });
  f.jobs[0].resolve({ ok: false, diagnostics: [error] }); await delay(0);
  assert.deepEqual(f.checks.state.diagnostics, [error]);
});
