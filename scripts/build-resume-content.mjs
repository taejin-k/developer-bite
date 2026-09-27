import { writeFile } from 'node:fs/promises';
import { assembleResumeContent } from './resume-content-utils.mjs';
const content = await assembleResumeContent();
await writeFile(new URL('../resume-content.json', import.meta.url), JSON.stringify(content, null, 2) + '\n');
console.log(`Built ${content.questions.length} resume questions across ${content.groups.length} groups.`);
