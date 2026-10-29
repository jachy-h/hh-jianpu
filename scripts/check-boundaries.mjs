import fs from 'node:fs';
import path from 'node:path';
import ts from '../packages/core/node_modules/typescript/lib/typescript.js';
const root = process.cwd();
const failures = [];
const files = directory => fs.readdirSync(directory, { withFileTypes: true }).flatMap(item => {
  if (['node_modules', 'dist', 'build', 'audio-probe-dist'].includes(item.name)) return [];
  const file = path.join(directory, item.name);
  return item.isDirectory() ? files(file) : /\.(?:[cm]?js|tsx?|json)$/.test(file) ? [file] : [];
});
const check = (file, specifier) => {
  const relative = path.relative(root, file).replaceAll('\\', '/');
  const shared = relative.startsWith('packages/');
  const app = relative.startsWith('apps/web/') ? 'web' : relative.startsWith('apps/minitool/') ? 'minitool' : null;
  const resolved = specifier.startsWith('.') || path.isAbsolute(specifier) ? path.relative(root, path.resolve(path.dirname(file), specifier)).replaceAll('\\', '/') : specifier;
  if (shared && (/(^|\/)apps\//.test(resolved) || /@hh-jianpu\/(web|minitool)(\/|$)/.test(specifier))) failures.push(`${relative}: shared → app (${specifier})`);
  if (app && (resolved.startsWith(`apps/${app === 'web' ? 'minitool' : 'web'}/`) || specifier.startsWith(`@hh-jianpu/${app === 'web' ? 'minitool' : 'web'}`))) failures.push(`${relative}: cross application import (${specifier})`);
  if (relative.startsWith('packages/core/') && (/^(react|react-dom|tone)(\/|$)/.test(specifier) || /score-(view|library)/.test(resolved))) failures.push(`${relative}: core platform/UI/resource dependency (${specifier})`);
  const ownPackage = relative.split('/').slice(0, 2).join('/');
  if (specifier.startsWith('.') && resolved.startsWith('packages/') && !resolved.startsWith(`${ownPackage}/`)
    && /\/src\//.test(resolved) && !relative.includes('__tests__')) failures.push(`${relative}: package source traversal (${specifier})`);
};
for (const base of ['packages', 'apps']) for (const file of files(base)) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const walk = node => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) check(file, node.moduleSpecifier.text);
    if (ts.isCallExpression(node) && node.arguments.length && ts.isStringLiteral(node.arguments[0])
      && (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === 'require'))) check(file, node.arguments[0].text);
    ts.forEachChild(node, walk);
  };
  walk(source);
  if (file.endsWith('package.json')) {
    const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const specifier of Object.keys({ ...pkg.dependencies, ...pkg.peerDependencies })) check(file, specifier);
  }
  if (/(?:vite\.config|tsconfig)/.test(file)) {
    const text = fs.readFileSync(file, 'utf8');
    for (const match of text.matchAll(/['"]([^'"\n]*(?:\.\.\/|\/apps\/)[^'"\n]*)['"]/g)) {
      if (!match[1].includes('tsconfig.base') && !match[1].includes('outDir')) check(file, match[1]);
    }
  }
}
if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
else console.log('PASS: shared modules → core; applications → shared modules; no cross application imports');
