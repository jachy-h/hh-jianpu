import { execFileSync } from 'node:child_process';
import { existsSync, rmSync, copyFileSync, cpSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const workspace = fileURLToPath(new URL('../', import.meta.url));

/** 直接调用已安装的工具，避免嵌套 pnpm 触发版本下载或隐式安装。 */
export function buildShared({ clean = false } = {}) {
  const run = (args, cwd = workspace) => execFileSync(process.execPath, args, { cwd, stdio: 'inherit' });
  for (const [index, name] of ['core', 'score-library', 'score-view', 'beat-visualizer'].entries()) {
    const directory = resolve(workspace, 'packages', name);
    const tsc = resolve(directory, 'node_modules/typescript/bin/tsc');
    if (!existsSync(tsc)) throw new Error(`${name} 缺少依赖，请先在仓库根目录运行 pnpm install`);
    console.log(`[shared ${index + 1}/4] 构建 ${name}…`);
    if (clean) rmSync(resolve(directory, 'dist'), { recursive: true, force: true });
    if (name === 'score-library') run(['--import', 'tsx', 'scripts/generate.mjs'], directory);
    run(name === 'core' ? [tsc, '--build', '--force'] : [tsc, '-p', 'tsconfig.json'], directory);
    if (name === 'score-view') {
      copyFileSync(resolve(directory, 'src/style.css'), resolve(directory, 'dist/style.css'));
      cpSync(resolve(directory, 'src/assets'), resolve(directory, 'dist/assets'), { recursive: true });
    }
  }
  run(['scripts/validate-library.mjs']);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) buildShared({ clean: true });
