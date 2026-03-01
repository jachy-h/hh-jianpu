---
name: release
description: "创建版本发布 - 自动更新版本号、CHANGELOG、运行测试、构建并提交"
compatibility: copilot,opencode,qwen,claude
metadata:
  audience: maintainers
  workflow: github
---

# Release Skill - 版本发布

自动化版本发布流程。

## 什么时候使用

- `skill: release patch` — 补丁版本（如 1.0.0 → 1.0.1）
- `skill: release minor` — 小版本（如 1.0.0 → 1.1.0）
- `skill: release major` — 大版本（如 1.0.0 → 2.0.0）

## 发布前检查

- [ ] 所有功能已完成
- [ ] CHANGELOG Unreleased 部分已填写
- [ ] 单元测试通过：`pnpm test`
- [ ] 构建成功：`pnpm build`
- [ ] 无 lint 错误：`pnpm lint`

## 工作流程

### 1. 检查工作区
```bash
git status
```

### 2. 确定版本类型
- **patch**：Bug 修复、小优化
- **minor**：新功能、向后兼容的改进
- **major**：破坏性变更、重大重构

### 3. 运行发布脚本
```bash
./scripts/release.sh [patch|minor|major]
```

脚本自动执行：更新版本号 → 更新 CHANGELOG → 运行测试 → 构建 → Git commit + tag

### 4. 推送发布
```bash
git push origin main
git push origin v{x.y.z}
```

## 修改的文件

- `package.json` (root)
- `packages/core/package.json`
- `apps/web/package.json`
- `CHANGELOG.md`

## 项目配置

- 包管理：pnpm（monorepo）
- 版本脚本：`./scripts/release.sh`
- 测试：`pnpm test`
- 构建：`pnpm build`
- Lint：`pnpm lint`

## 注意事项

1. 测试失败必须修复后再发布
2. 确认 CHANGELOG 内容准确
3. 大版本发布前与团队确认

## 撤销发布

```bash
git tag -d v{x.y.z}
git push origin :refs/tags/v{x.y.z}
git reset --hard HEAD~1
```
