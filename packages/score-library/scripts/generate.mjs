import fs from 'node:fs';
import { loadScoreLibrary } from '../src/loader.ts';
const base = new URL('../resources/scores/', import.meta.url);
const files = {};
for (const category of fs.readdirSync(base).sort()) {
  const dir = new URL(`${category}/`, base);
  if (!fs.statSync(dir).isDirectory()) continue;
  for (const file of fs.readdirSync(dir).sort()) {
    if (file.endsWith('.jsonc')) files[`${category}/${file}`] = fs.readFileSync(new URL(file, dir), 'utf8');
  }
}
const categories = loadScoreLibrary(files);
fs.writeFileSync(new URL('../src/resources.generated.ts', import.meta.url), `// 由 resources/scores 自动生成；请编辑资源源文件。\nimport type { ScoreCategory } from './loader.js';\nexport const SCORE_LIBRARY_DATA: readonly ScoreCategory[] = ${JSON.stringify(categories, null, 2)};\n`);
console.log(`Generated ${Object.keys(files).length} shared resource files`);
