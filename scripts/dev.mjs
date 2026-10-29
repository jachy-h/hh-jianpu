import { spawn, execFileSync } from 'node:child_process';
import { watch, copyFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { buildShared, workspace } from './build-shared.mjs';

const target = process.argv[2] ?? 'web';
if (!['web', 'minitool', 'all'].includes(target)) throw new Error(`未知开发目标：${target}`);
const targets = target === 'all' ? ['web', 'minitool'] : [target];
const args = process.argv.slice(3).filter(arg => arg !== '--');
if (target === 'all' && args.length) throw new Error('dev:all 使用 Web 5173 / H5 5174；自定义端口请分别启动');
const children = [];
const watchers = [];
let closing = false;
let timer;

function close(code = 0) {
  if (closing) return;
  closing = true;
  clearTimeout(timer);
  for (const watcher of watchers) watcher.close();
  for (const child of children) child.kill('SIGTERM');
  process.exitCode = code;
}
function start(commandArgs, cwd) {
  const child = spawn(process.execPath, commandArgs, { cwd, stdio: 'inherit' });
  children.push(child);
  child.on('error', error => { console.error(`[dev] ${error.message}`); close(1); });
  child.on('exit', (code, signal) => {
    if (!closing) {
      console.error(`[dev] 子进程退出 (${signal ?? code})，停止本次开发任务`);
      close(code || 1);
    }
  });
}
process.on('SIGINT', () => close());
process.on('SIGTERM', () => close());

try {
  console.log(`[dev] 准备 ${targets.join(' + ')}，先构建共享模块…`);
  // 不删除正在被另一个开发服务消费的 dist；三阶段构建输出明确进度。
  buildShared();
  for (const name of ['core', 'score-library', 'score-view']) {
    const directory = resolve(workspace, 'packages', name);
    start([resolve(directory, 'node_modules/typescript/bin/tsc'), '--watch', '--preserveWatchOutput'], directory);
  }
  const generate = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        execFileSync(process.execPath, ['--import', 'tsx', 'packages/score-library/scripts/generate.mjs'], { cwd: workspace, stdio: 'inherit' });
      } catch { console.error('[dev] 资源生成失败，修复后将自动重试。'); }
    }, 80);
  };
  watchers.push(watch(resolve(workspace, 'packages/score-library/resources/scores'), { recursive: true }, generate));
  watchers.push(watch(resolve(workspace, 'packages/score-view/src/style.css'), () => {
    copyFileSync(resolve(workspace, 'packages/score-view/src/style.css'), resolve(workspace, 'packages/score-view/dist/style.css'));
  }));
  for (const name of targets) {
    const directory = resolve(workspace, 'apps', name);
    const require = createRequire(resolve(directory, 'package.json'));
    const vite = resolve(dirname(require.resolve('vite/package.json')), 'bin/vite.js');
    const customPort = args.some(arg => arg === '--port' || arg.startsWith('--port='));
    const port = name === 'web' ? '5173' : '5174';
    console.log(`[dev] 启动 ${name}${customPort ? '（自定义端口）' : ` → http://127.0.0.1:${port}`}`);
    start([vite, '--host', '127.0.0.1', '--strictPort', ...(customPort ? [] : ['--port', port]), ...args], directory);
  }
} catch (error) {
  console.error(`[dev] 启动失败：${error.message}`);
  close(1);
}
