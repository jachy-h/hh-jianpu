# Errors — 错误记录

> 记录命令失败、异常报错、意外行为等。
> 格式规范见 `.agents/skills/self-improvement/SKILL.md`。

---

<!-- 在此下方追加错误条目 -->

## [ERR-20261026-001] pnpm lint

**记录时间**: 2026-10-26T17:25:00+08:00
**记录者**: codex
**优先级**: medium
**状态**: resolved

### 摘要
项目架构检查时，lint 脚本因缺少 ESLint 无法运行。

### 错误信息
```text
sh: eslint: command not found
Command failed with exit code 127.
```

### 上下文
- 执行命令：`pnpm lint`。
- core 和 web 声明了 lint 脚本，但 package.json 未声明 ESLint 开发依赖，仓库未发现 ESLint 配置。
- 同次检查中生产构建通过，core 测试 191 项通过、4 项跳过。
- 附加验证中 `pnpm exec tsx -e` 因沙箱禁止创建 IPC 管道而报 `listen EPERM`；改用 `node --import tsx --input-type=module -e`，避免 CLI 的 IPC 服务。

### 建议修复
补齐 ESLint 依赖与 TypeScript/React 配置，并将 lint、测试、构建纳入 PR 检查。

2026-10-26 已补齐根目录 ESLint flat config、相关开发依赖和 PR 质量检查；清理历史未使用变量与宽泛类型。core 的 4 个 skip 均来自过期拍数或分组断言，修正 fixture 后恢复执行。

---

## [ERR-20261026-002] 依赖源码路径 glob

**记录时间**: 2026-10-26T19:27:00+08:00
**记录者**: codex
**优先级**: low
**状态**: pending

### 摘要
使用了与实际安装版本不匹配的 Tone.js 依赖路径 glob，zsh 因无匹配项中止命令。

### 错误信息
```text
zsh: no matches found: node_modules/.pnpm/tone@15.0.4*/node_modules/tone/Tone/core/clock/Transport.ts
```

### 上下文
- 尝试查看 Tone.Transport.scheduleRepeat API 源码。
- 当前依赖目录安装的是 `tone@15.1.22`，而 glob 假定为 `15.0.4`。
- 改用 `rg --files node_modules/.pnpm | rg '/Transport\\.(ts|js)$'` 定位后已成功检查。
- 初次尝试用 shell 重定向写此经验记录时遇到 `operation not permitted`；改用 `apply_patch` 后成功。

### 建议修复
依赖路径不确定时先枚举实际目录，再读取目标文件；避免在 zsh 中使用无保护的版本 glob。

---

## [ERR-20261026-003] Tone.js 选段循环音源重叠

**记录时间**: 2026-10-26T19:33:00+08:00
**记录者**: codex
**优先级**: high
**状态**: resolved

### 摘要
浏览器试听选段循环时，延音跨循环边界导致 Tone.js 单声部振荡器拒绝重叠启动；重复调度回调也不适合在此处管理 Transport 循环边界。

### 错误信息
```text
Error: Start time must be strictly greater than previous start time
```

### 上下文
- 小节 6 的延音在下轮开始时仍处于 release 阶段，单声部 Synth 重触发产生运行时错误。
- 初版按事件调用 `scheduleRepeat`，无法保证同一音源跨循环释放期间的安全重用。
- 改为 Tone.Transport 原生 loopStart/loopEnd 循环，一次调度区间内事件，并使用上限 8 声部的 PolySynth 处理跨边界释放重叠。
- 隔离浏览器页面试听 4.5 秒并停止；修复后未出现新的播放错误。

### 建议修复
Tone.Transport 负责拍点与重复区间；音源层需允许跨边界释放尾音重叠。涉及循环播放时进行真实浏览器音频运行验证，不能仅依赖构建和纯调度测试。

---

## [ERR-20261026-004] PolySynth 构造参数类型

**记录时间**: 2026-10-26T19:35:00+08:00
**记录者**: codex
**优先级**: medium
**状态**: resolved

### 摘要
按 Tone.js 第二参数重载传入 `maxPolyphony`，TypeScript 正确拒绝该 voice options 字段。

### 错误信息
```text
src/player/synth.ts(52,7): error TS2353: Object literal may only specify known properties, and 'maxPolyphony' does not exist in type 'RecursivePartial<OmitMonophonicOptions<SynthOptions>>'.
```

### 上下文
- `PolySynth` 构造器的 `(voice, options)` 第二个参数只接受单声部音源配置，不接受 maxPolyphony。
- 改为单一 options 对象 `{ voice: Tone.Synth, maxPolyphony: 8, options: {...} }` 后类型检查与生产构建通过。

### 建议修复
使用带重载的第三方 API 时先读安装版本的 `.d.ts` 构造签名，再选择对象形式，避免参考错误重载。

---
