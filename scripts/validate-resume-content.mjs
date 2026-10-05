import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { assembleResumeContent } from './resume-content-utils.mjs';

const expected = await assembleResumeContent();
const content = JSON.parse(await readFile(new URL('../resume-content.json', import.meta.url), 'utf8'));
assert.deepEqual(content, expected, 'Generated resume data is stale. Run npm run resume:build.');
for (const collection of ['questions', 'statements', 'groups']) {
  assert.equal(new Set(content[collection].map((item) => item.id)).size, content[collection].length, `Duplicate ${collection} IDs`);
}
assert.equal(new Set(content.questions.map((q) => q.title)).size, content.questions.length, 'Duplicate question titles');
const groups = new Set(content.groups.map((g) => g.id));
const statements = new Set(content.statements.map((s) => s.id));
for (const q of content.questions) {
  assert.match(q.id, /^resume-[a-z0-9-]+$/);
  assert.ok(groups.has(q.group), `${q.id}: missing group`);
  assert.ok(statements.has(q.source), `${q.id}: missing statement`);
  assert.ok(content.kinds[q.kind], `${q.id}: unknown kind`);
  assert.match(q.title, /[?.]$/, `${q.id}: incomplete question`);
  assert.ok(q.answer.length >= 160 && q.answer.split('\n').length >= 2, `${q.id}: incomplete answer`);
  assert.ok(!('note' in q), `${q.id}: personal preparation notes are no longer part of answers`);
  for (const key of q.refs || []) assert.ok(content.references[key], `${q.id}: unknown reference ${key}`);
}
for (const group of groups) assert.ok(content.questions.some((q) => q.group === group), `Empty group ${group}`);
for (const ref of Object.values(content.references)) assert.equal(new URL(ref.url).protocol, 'https:');
assert.doesNotMatch(JSON.stringify(content), /그루모바일|Why I[’']m Applying|010[- ]\d{4}[- ]\d{4}|[\w.+-]+@[\w.-]+\.[a-z]{2,}/i, 'Excluded content or contact details leaked');
console.log(`Validated ${content.questions.length} resume answers, ${content.statements.length} source statements, ${groups.size} groups.`);
