#!/bin/bash

# 版本发布脚本
# 用法: ./scripts/release.sh [patch|minor|major|X.Y.Z] [--yes] [--issue=N]
#
# 先显式暂存本次发布文件；脚本只提交暂存区，额外暂存已知版本文件。

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 解析参数
VERSION_TYPE=""
AUTO_YES=false
ISSUE_REFERENCE=""

for arg in "$@"; do
  case $arg in
    patch|minor|major)
      VERSION_TYPE="$arg"
      ;;
    [0-9]*.[0-9]*.[0-9]*)
      VERSION_TYPE="$arg"
      ;;
    --issue=*)
      ISSUE_REFERENCE="${arg#--issue=}"
      [[ "$ISSUE_REFERENCE" =~ ^[1-9][0-9]*$ ]] || { echo "无效的 issue 编号"; exit 1; }
      ;;
    --yes|-y)
      AUTO_YES=true
      ;;
    *)
      echo "不支持的参数: $arg"; exit 1
      ;;
  esac
done

VERSION_TYPE=${VERSION_TYPE:-patch}

if git diff --cached --quiet; then
  echo "请先显式暂存本次发布文件；脚本不会提交整个工作区。"; exit 1
fi

echo -e "${GREEN}📦 开始版本发布流程...${NC}"
echo ""

# 1. 获取当前版本
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo -e "${GREEN}📌 当前版本: ${CURRENT_VERSION}${NC}"

# 3. 计算新版本号
IFS='.' read -r -a VERSION_PARTS <<< "$CURRENT_VERSION"
MAJOR=${VERSION_PARTS[0]}
MINOR=${VERSION_PARTS[1]}
PATCH=${VERSION_PARTS[2]}

if [[ "$VERSION_TYPE" =~ ^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$ ]]; then
  IFS='.' read -r -a TARGET_PARTS <<< "$VERSION_TYPE"
  MAJOR=${TARGET_PARTS[0]}
  MINOR=${TARGET_PARTS[1]}
  PATCH=${TARGET_PARTS[2]}
else
case $VERSION_TYPE in
  major)
    MAJOR=$((MAJOR + 1))
    MINOR=0
    PATCH=0
    ;;
  minor)
    MINOR=$((MINOR + 1))
    PATCH=0
    ;;
  patch)
    PATCH=$((PATCH + 1))
    ;;
  *)
    echo -e "${RED}❌ 无效的版本类型: $VERSION_TYPE${NC}"
    echo "   支持的类型: patch, minor, major"
    exit 1
    ;;
esac
fi

NEW_VERSION="$MAJOR.$MINOR.$PATCH"
if ! node -e 'const a=process.argv[1].split(".").map(Number), b=process.argv[2].split(".").map(Number); const i=a.findIndex((n,i)=>n!==b[i]); process.exit(i>=0 && a[i]>b[i] ? 0 : 1)' "$NEW_VERSION" "$CURRENT_VERSION"; then
  echo "目标版本必须高于当前版本"; exit 1
fi
if git rev-parse -q --verify "refs/tags/v$NEW_VERSION" >/dev/null; then
  echo "标签 v$NEW_VERSION 已存在"; exit 1
fi
# 先确认发布说明完整，避免改完版本号才发现缺少说明。
node <<'NODE'
const fs = require('fs');
const text = fs.readFileSync('CHANGELOG.md', 'utf8');
const marker = '## [Unreleased]';
const start = text.indexOf(marker);
const next = text.indexOf('\n## [', start + marker.length);
if (start < 0 || !text.slice(start + marker.length, next < 0 ? undefined : next).trim()) {
  throw new Error('请先填写 CHANGELOG [Unreleased]');
}
NODE

echo -e "${GREEN}🎯 新版本: ${NEW_VERSION}${NC}"
echo ""

# 4. 确认发布（--yes 时跳过）
if [[ "$AUTO_YES" == false ]]; then
  read -p "确认发布版本 ${NEW_VERSION}？(y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}❌ 发布已取消${NC}"
    exit 1
  fi
fi

echo ""
echo -e "${GREEN}🔧 更新版本号...${NC}"

# 5. 更新根 package.json
sed -i.bak "s/\"version\": \"$CURRENT_VERSION\"/\"version\": \"$NEW_VERSION\"/" package.json && rm package.json.bak

# 6. 更新子包 package.json
sed -i.bak "s/\"version\": \"$CURRENT_VERSION\"/\"version\": \"$NEW_VERSION\"/" packages/core/package.json && rm packages/core/package.json.bak
sed -i.bak "s/\"version\": \"$CURRENT_VERSION\"/\"version\": \"$NEW_VERSION\"/" apps/web/package.json && rm apps/web/package.json.bak

# 7. 更新 config.ts 里的版本号和日期
echo -e "${GREEN}📝 更新 config.ts 版本号和日期...${NC}"
TODAY_CN=$(TZ=Asia/Shanghai date +%Y年%m月%d日)
sed -i.bak "s/HELP_PAGE_VERSION = '.*'/HELP_PAGE_VERSION = 'v$NEW_VERSION'/" apps/web/src/config.ts && rm apps/web/src/config.ts.bak
sed -i.bak "s/HELP_PAGE_UPDATED_DATE = '.*'/HELP_PAGE_UPDATED_DATE = '$TODAY_CN'/" apps/web/src/config.ts && rm apps/web/src/config.ts.bak

echo -e "${GREEN}✅ 版本号已更新${NC}"
echo ""

# 8. 更新 CHANGELOG
echo -e "${GREEN}📝 更新 CHANGELOG...${NC}"

TODAY=$(TZ=Asia/Shanghai date +%Y-%m-%d)
NEW_VERSION="$NEW_VERSION" RELEASE_DATE="$TODAY" node <<'NODE'
const fs = require('fs');
const path = 'CHANGELOG.md';
const text = fs.readFileSync(path, 'utf8');
const marker = '## [Unreleased]';
const start = text.indexOf(marker);
const next = text.indexOf('\n## [', start + marker.length);
const content = text.slice(start + marker.length, next < 0 ? undefined : next).trim();
const previous = next < 0 ? '' : text.slice(next).trimStart();
fs.writeFileSync(path, text.slice(0, start) + marker + '\n\n## [' + process.env.NEW_VERSION + '] - ' + process.env.RELEASE_DATE + '\n\n' + content + '\n\n' + previous);
NODE

echo -e "${GREEN}✅ CHANGELOG 已更新${NC}"
echo ""

# 9. 运行测试
echo -e "${GREEN}🧪 运行测试...${NC}"
pnpm lint
pnpm build:core
pnpm test

echo -e "${GREEN}✅ 测试通过${NC}"
echo ""

# 10. 构建
echo -e "${GREEN}🏗️  构建项目...${NC}"
pnpm build

echo -e "${GREEN}✅ 构建完成${NC}"
echo ""

# 11. 仅提交预先审查过的暂存文件，以及脚本更新的固定版本文件
echo -e "${GREEN}📤 提交已暂存的发布内容...${NC}"
git add -- package.json packages/core/package.json apps/web/package.json apps/web/src/config.ts CHANGELOG.md

if [[ -n "$ISSUE_REFERENCE" ]]; then
  git commit -m "chore: release v${NEW_VERSION}" -m "Refs #${ISSUE_REFERENCE}"
else
  git commit -m "chore: release v${NEW_VERSION}"
fi
git tag "v${NEW_VERSION}"

echo -e "${GREEN}✅ Git commit + tag 完成${NC}"
echo ""

# 12. 完成
echo -e "${GREEN}🎉 版本 ${NEW_VERSION} 发布完成！${NC}"
echo ""
echo "📋 下一步操作："
echo "   1. 推送代码: git push origin main"
echo "   2. 推送标签: git push origin v${NEW_VERSION}"
echo ""
