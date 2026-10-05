import { readFile, readdir } from 'node:fs/promises';
import referenceEntries from '../resume-content/references.mjs';

export async function assembleResumeContent() {
  const snapshot = JSON.parse(await readFile(new URL('../resume-source.json', import.meta.url), 'utf8'));
  const nodes = new Map(snapshot.pages.flatMap((page) => page.texts.map((node) => [node.id, { ...node, page: page.name }])));
  const files = (await readdir(new URL('../resume-content/', import.meta.url))).filter((name) => /^\d.*\.mjs$/.test(name)).sort();
  const modules = await Promise.all(files.map((name) => import(new URL(`../resume-content/${name}`, import.meta.url))));
  const groups = modules.flatMap((module) => module.default);
  const statements = new Map();
  const questions = [];
  for (const group of groups) {
    for (const [slug, nodeId, line, kind, title, answer, refs] of group.questions) {
      const node = nodes.get(nodeId);
      const text = node?.text.split('\n')[line]?.replace(/\u2028/g, ' ').trim();
      if (!text) throw new Error(`Missing resume source: ${group.id}/${slug} → ${nodeId}:${line}`);
      const source = `source-${nodeId.replaceAll(':', '-')}-${line}`;
      statements.set(source, { id: source, text, nodeId, line, page: node.page });
      questions.push({ id: `resume-${group.id}-${slug}`, group: group.id, source, kind, title, answer, ...(refs?.length ? { refs } : {}) });
    }
  }
  return {
    version: 1,
    source: { url: `https://www.figma.com/design/${snapshot.fileKey}/?node-id=104-35`, retrievedAt: snapshot.retrievedAt },
    kinds: { experience: '경험', technical: '기술 원리', design: '설계·선택', troubleshooting: '문제 해결', verification: '검증·성과', collaboration: '협업·리딩' },
    groups: groups.map(({ id, label, company }) => ({ id, label, company })),
    statements: [...statements.values()],
    references: Object.fromEntries(Object.entries(referenceEntries).map(([id, [label, url]]) => [id, { label, url }])),
    questions,
  };
}
