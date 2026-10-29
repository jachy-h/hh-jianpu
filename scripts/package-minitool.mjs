import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { auditMinitool } from './audit-minitool.mjs';

const probe = process.argv.includes('--probe');
const directory = probe ? 'apps/minitool/audio-probe-dist' : 'apps/minitool/dist';
const inventory = probe ? 'apps/minitool/build/probe-dependencies.json' : 'apps/minitool/build/dependencies.json';
const result = auditMinitool(directory, inventory);
if (result.errors.length) throw new Error(result.errors.join('\n'));
fs.mkdirSync('artifacts', { recursive: true });
const name = `hh-jianpu-${probe ? 'audio-probe' : 'minitool'}-v0.8.0`;
const zip = path.resolve(`artifacts/${name}.zip`);
execFileSync('python3', ['-c', `import pathlib,sys,zipfile
root=pathlib.Path(sys.argv[1]); out=pathlib.Path(sys.argv[2])
with zipfile.ZipFile(out,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for p in sorted(root.rglob('*')):
  if p.is_file():
   info=zipfile.ZipInfo(p.relative_to(root).as_posix(),date_time=(2026,1,1,0,0,0)); info.compress_type=zipfile.ZIP_DEFLATED; info.external_attr=0o100644<<16
   z.writestr(info,p.read_bytes())
with zipfile.ZipFile(out) as z:
 assert 'index.html' in z.namelist(); assert z.testzip() is None
`, directory, zip]);
const bytes = fs.statSync(zip).size;
if (bytes > 10 * 1024 ** 2) throw new Error('ZIP exceeds 10 MiB');
const extracted = fs.mkdtempSync(path.join(os.tmpdir(), 'hh-minitool-'));
try {
  execFileSync('python3', ['-c', 'import zipfile,sys;zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])', zip, extracted]);
  const final = auditMinitool(extracted, inventory);
  if (final.errors.length || final.files.join('\n') !== result.files.join('\n')) throw new Error('ZIP round-trip validation failed');
} finally { fs.rmSync(extracted, { recursive: true, force: true }); }
const hash = createHash('sha256').update(fs.readFileSync(zip)).digest('hex');
const notes = [...result.warnings, ...(bytes > 2 * 1024 ** 2 ? ['ZIP exceeds recommended 2 MiB'] : [])];
fs.writeFileSync(`artifacts/${name}-validation.md`, `# v0.8.0 ${probe ? '音频实验' : 'H5 小工具'}校验摘要\n\n- ZIP：${path.basename(zip)}\n- 文件：${result.files.join(', ')}\n- 压缩体积：${bytes} bytes\n- 解压文本：${result.textBytes} bytes\n- SHA-256：${hash}\n- 静态门禁：通过（ES2017 经典脚本、文件类型、入口、资源路径、禁用调用、依赖清单、Base64、ZIP 回读/CRC）\n- 提示：${notes.join('; ') || '无静态风险提示'}\n- 平台模拟器、Android 真机扫码、iOS 真机扫码：待用户验证同一 ZIP\n- Chrome 61 JS/CSS 兼容性、真机性能：未实测\n- 普通浏览器调试结果不能替代小工具容器验收。\n`);
console.log(`${zip}\n${bytes} bytes\nSHA-256 ${hash}`);
