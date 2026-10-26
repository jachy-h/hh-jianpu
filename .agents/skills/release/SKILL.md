---
name: release
description: "创建版本发布 - 自动更新版本号、CHANGELOG、运行测试、构建并提交"
compatibility: copilot,opencode,qwen,claude
metadata:
  audience: maintainers
  workflow: github
---

# Release Skill - 版本发布

自动化版本发布流程。先显式暂存本次发布文件；无关未暂存内容保留在工作区。

## 什么时候使用

- `skill: release patch` — 补丁版本（如 1.0.0 → 1.0.1）
- `skill: release minor` — 小版本（如 1.0.0 → 1.1.0）
- `skill: release major` — 大版本（如 1.0.0 → 2.0.0）

---

## 工作流程

### 步骤 1：确认 CHANGELOG [Unreleased] 已填写

打开 `CHANGELOG.md`，确保 `## [Unreleased]` 下方有本次发布的内容描述。

### 步骤 2：运行发布脚本

先审查 `git diff` 并用明确路径暂存发布所需文件。脚本只提交暂存区，另行暂存固定的版本文件，不会执行全工作区 `git add -A`。

```bash
# 人工交互模式（会询问是否确认发布版本号）
./scripts/release.sh [patch|minor|major]

# AI Agent / 非交互模式（传入 --yes 跳过所有确认）
./scripts/release.sh [patch|minor|major] --yes

# 指定目标版本并关联 issue
./scripts/release.sh 0.7.1 --yes --issue=3
```

脚本自动执行：
1. 计算新版本号
2. 更新版本文件：`package.json`、`packages/core/package.json`、`apps/web/package.json`
3. 更新 `apps/web/src/config.ts`（版本号 + 发布日期）
4. 将 `CHANGELOG [Unreleased]` 内容归档到新版本下，恢复空 `[Unreleased]`
5. 运行完整质量门禁（`pnpm lint`、`pnpm build:core`、`pnpm test`）
6. 构建项目（`pnpm build`）
7. 暂存固定版本文件并提交已审查的暂存区，生成 `chore: release vX.Y.Z`；`--issue=N` 将 `Refs #N` 写入提交正文
8. 打标签 `vX.Y.Z`

### 步骤 3：推送

```bash
git push origin main
git push origin v{x.y.z}
```

---

## 发布前检查清单

- [ ] `CHANGELOG.md` 的 `[Unreleased]` 部分已填写
- [ ] 本地测试可通过：`pnpm test`

---

## 注意事项

1. 测试失败脚本会中止，修复后从步骤 2 重新运行
2. `--yes` 标志供 AI Agent 或 CI 使用，人工发布建议不加，方便确认版本号
3. 大版本发布前与团队确认

## 撤销发布

```bash
git tag -d v{x.y.z}
git push origin :refs/tags/v{x.y.z}
git reset --hard HEAD~1
```
