import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { randomUUID } from 'node:crypto';
import handler from '../api/sync-state.js';

async function client(saved) {
  const storage = new Map([['interview-bite-state-v1', JSON.stringify(saved)]]);
  const elements = new Map();
  const source = (await readFile(new URL('../app.js', import.meta.url), 'utf8'))
    .replace(/^import .*;\n/, '')
    .replace(/\ninit\(\);\s*$/, '');
  const context = vm.createContext({
    crypto: { randomUUID },
    localStorage: { getItem: (key) => storage.get(key), setItem: (key, value) => storage.set(key, value) },
    document: { querySelector: (selector) => {
      if (!elements.has(selector)) elements.set(selector, { style: {} });
      return elements.get(selector);
    } },
  });
  vm.runInContext(source, context);
  const run = (code) => vm.runInContext(code, context);
  run('loadState(); state.questions = [{id:"q-1"}, {id:"q-2"}];');
  return { run, storage, elements };
}

test('legacy learning records survive resume progress, reload and remote updates', async () => {
  const app = await client({ completed: ['q-1'], bookmarks: ['q-2'], updatedAt: 10 });
  app.run('setTrackedValue("completed", "resume-groupware-federation", true); setTrackedValue("bookmarks", "resume-groupware-federation", true); saveState({sync:false}); updateProgress();');
  assert.equal(app.elements.get('#completed-count').textContent, 1);
  assert.equal(app.elements.get('#progress-percent').textContent, '50%');
  const saved = JSON.parse(app.storage.get('interview-bite-state-v1'));
  assert.equal(saved.records.completed['q-1'].value, true);
  assert.equal(saved.records.completed['resume-groupware-federation'].value, true);
  assert.equal(saved.records.bookmarks['q-2'].value, true);
  const reloaded = await client(saved);
  assert.equal(reloaded.run('state.completed.size'), 2);
  const future = Date.now() + 1000;
  reloaded.run(`mergeRecords({records:{completed:{"resume-groupware-federation":{value:false,updatedAt:${future},clientId:"remote"},"q-2":{value:true,updatedAt:${future},clientId:"remote"}},bookmarks:{}}});updateProgress();`);
  assert.equal(reloaded.run('state.completed.has("resume-groupware-federation")'), false);
  assert.equal(reloaded.elements.get('#completed-count').textContent, 2);
  assert.equal(reloaded.run('state.bookmarks.has("resume-groupware-federation")'), true);
});

test('inserted QUIC lesson keeps existing learning progress IDs', async () => {
  const app = await client({ completed: ['q-29'], bookmarks: ['q-157'], updatedAt: 10 });
  const source = await readFile(new URL('../notion_technical_questions_final.txt', import.meta.url), 'utf8');
  const questions = app.run(`parseQuestions(${JSON.stringify(source)}).map(({id, title, answer}) => ({id, title, answer}))`);
  assert.equal(questions.length, 158);
  assert.equal(questions.find(({title}) => title === 'QUIC란?').id, 'q-158');
  assert.equal(questions.find(({title}) => title === 'HTTP와 HTTPS의 차이란?').id, 'q-29');
  assert.equal(questions.at(-1).id, 'q-157');
  assert.equal(app.run('state.completed.has("q-29")'), true);
  assert.equal(app.run('state.bookmarks.has("q-157")'), true);
  assert.equal(questions.find(({title}) => title.startsWith('HTTP/1.0과')).answer.split('\n').length, 6);
});

test('sync API round-trips both namespaces and keeps newer deletion records', async (t) => {
  const originalUrl = process.env.UPSTASH_REDIS_REST_URL;
  const originalToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example.test';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'test-only';
  t.after(() => {
    if (originalUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
    else process.env.UPSTASH_REDIS_REST_URL = originalUrl;
    if (originalToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
    else process.env.UPSTASH_REDIS_REST_TOKEN = originalToken;
  });
  const redis = new Map();
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    const [command, key, value] = JSON.parse(options.body);
    if (command === 'SET') redis.set(key, value);
    return new Response(JSON.stringify({ result: command === 'GET' ? redis.get(key) ?? null : 'OK' }), { status: 200 });
  });
  const request = async (method, state) => {
    let result;
    const res = { setHeader() {}, end(body) { result = JSON.parse(body); } };
    await handler({ method, query: { id: 'resume-test' }, body: { state } }, res);
    assert.equal(res.statusCode, 200);
    return result.state;
  };
  const record = (value, updatedAt) => ({ value, updatedAt, clientId: 'test' });
  await request('PUT', { records: { completed: { 'q-1': record(true, 10), 'resume-groupware-federation': record(true, 10) }, bookmarks: { 'resume-profile-teaching': record(true, 10) } } });
  await request('PUT', { records: { completed: { 'resume-groupware-federation': record(false, 20) } } });
  await request('PUT', { records: { completed: { 'resume-groupware-federation': record(true, 15) } } });
  const saved = await request('GET');
  assert.equal(saved.records.completed['q-1'].value, true);
  assert.equal(saved.records.completed['resume-groupware-federation'].value, false);
  assert.equal(saved.records.bookmarks['resume-profile-teaching'].value, true);
});
