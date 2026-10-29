import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
// ESLint 已使用的 Acorn；直接声明依赖以保证干净安装可复现。
const require = createRequire(import.meta.url);
const { parse } = require('acorn');
const ALLOWED = new Set(['.html', '.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.woff', '.woff2', '.json']);
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(item => item.isDirectory() ? walk(path.join(dir, item.name)) : [path.join(dir, item.name)]);
export function auditMinitool(directory = 'apps/minitool/dist', inventory = 'apps/minitool/build/dependencies.json') {
  const errors = [], warnings = [];
  const files = walk(directory);
  const relative = file => path.relative(directory, file).replaceAll('\\', '/');
  if (!fs.existsSync(path.join(directory, 'index.html'))) errors.push('Missing root index.html');
  if (files.filter(file => file.endsWith('.html')).length !== 1) errors.push('Exactly one HTML entry is required');
  const usedAssets = new Set();
  for (const file of files) {
    const name = relative(file);
    if (!ALLOWED.has(path.extname(name))) errors.push(`Unsupported file: ${name}`);
    if (/(^|\/)(node_modules|\.git|\.DS_Store)(\/|$)|\.map$/.test(name)) errors.push(`Development file: ${name}`);
    if (!/\.(html|css|js|json)$/.test(name)) continue;
    const text = fs.readFileSync(file, 'utf8');
    if (fs.statSync(file).size > 2 * 1024 ** 2) warnings.push(`${name}: text exceeds 2 MiB`);
    if (name.endsWith('.html')) {
      if (!/<!doctype html>/i.test(text) || !/lang=["']zh-CN/.test(text) || !/charset=["']?UTF-8/i.test(text) || !/viewport-fit=cover/.test(text)) errors.push('HTML metadata incomplete');
      if (/<script(?![^>]*\bsrc=)[^>]*>\s*[^<]|\bon\w+\s*=|type=["']module|<iframe\b|<object\b|<base\b|http-equiv=["']Content-Security-Policy/i.test(text)) errors.push(`Forbidden HTML capability: ${name}`);
    }
    if (/\.(html|css)$/.test(name)) for (const match of text.matchAll(/(?:\b(?:src|href)=["']([^"']+)|url\(["']?([^)'"\s]+))/g)) {
      const ref = match[1] ?? match[2];
      if (ref.startsWith('data:') || ref.startsWith('#')) continue;
      if (/^(?:\/|[a-z]+:)/i.test(ref)) errors.push(`Non-relative resource: ${name}: ${ref}`);
      else { const asset = path.resolve(path.dirname(file), ref); usedAssets.add(asset); if (!asset.startsWith(path.resolve(directory) + path.sep) || !fs.existsSync(asset)) errors.push(`Missing/escaping resource: ${name}: ${ref}`); }
    }
    for (const match of text.matchAll(/data:[^,\s"']*;base64,([a-z\d+/=]+)/gi)) {
      const bytes = Buffer.from(match[1], 'base64').length;
      if (bytes > 1024 ** 2) errors.push(`${name}: Base64 exceeds 1 MiB`);
      else if (bytes > 100 * 1024) warnings.push(`${name}: large Base64`);
    }
    if (name.endsWith('.js')) {
      try {
        const tree = parse(text, { ecmaVersion: 2017, sourceType: 'script' });
        const visit = node => {
          if (!node || typeof node !== 'object') return;
          if ((node.type === 'CallExpression' || node.type === 'NewExpression') && node.callee) {
            const callee = text.slice(node.callee.start, node.callee.end);
            if (/^(?:(?:window|globalThis)\.)?(?:fetch|XMLHttpRequest|WebSocket|EventSource|Worker|SharedWorker|Function|eval|RTCPeerConnection)$/.test(callee)
              || /navigator\.(?:clipboard|geolocation|bluetooth|usb|hid|serial|credentials|locks)|(?:window\.)?(?:open|prompt)$|\.execCommand$|WebAssembly\.|\.serviceWorker\.|\.requestFullscreen$|\.addModule$/.test(callee)) errors.push(`Forbidden call: ${name}: ${callee}`);
          }
          for (const value of Object.values(node)) {
            if (Array.isArray(value)) value.forEach(visit);
            else if (value && typeof value === 'object') visit(value);
          }
        }; visit(tree);
      } catch (error) { errors.push(`${name}: not ES2017 classic script: ${error.message}`); }
    }
  }
  if (fs.existsSync(inventory)) {
    const dependencies = JSON.parse(fs.readFileSync(inventory, 'utf8'));
    for (const module of dependencies) if (/node_modules\/.*(?:tone@|\/tone\/)|apps\/web\//.test(module)) errors.push(`Forbidden dependency: ${module}`);
  } else errors.push('Missing build dependency inventory');
  const textBytes = files.filter(file => /\.(html|css|js|json)$/.test(file)).reduce((sum, file) => sum + fs.statSync(file).size, 0);
  if (textBytes > 5 * 1024 ** 2) warnings.push('Total uncompressed text exceeds 5 MiB');
  return { files: files.map(relative).sort(), textBytes, errors, warnings };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = auditMinitool(process.argv[2]);
  for (const error of result.errors) console.error(`ERROR: ${error}`);
  for (const warning of result.warnings) console.warn(`WARN: ${warning}`);
  console.log(`${result.errors.length ? 'FAILED' : 'PASS'}: ${result.files.length} files; ${result.textBytes} text bytes; ${result.errors.length} errors; ${result.warnings.length} warnings`);
  if (result.errors.length) process.exitCode = 1;
}
