#!/bin/bash

# 版本发布脚本
# 用法: ./scripts/release.sh [patch|minor|major] [--yes]
#
# 工作区可以有未提交的内容，脚本会在发布时统一 git add -A 提交。

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 解析参数
VERSION_TYPE=""
AUTO_YES=false

for arg in "$@"; do
  case $arg in
    patch|minor|major)
      VERSION_TYPE="$arg"
      ;;
    --yes|-y)
      AUTO_YES=true
      ;;
  esac
done

VERSION_TYPE=${VERSION_TYPE:-patch}

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

NEW_VERSION="$MAJOR.$MINOR.$PATCH"
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
TODAY_CN=$(date +%Y年%m月%d日)
sed -i.bak "s/HELP_PAGE_VERSION = '.*'/HELP_PAGE_VERSION = 'v$NEW_VERSION'/" apps/web/src/config.ts && rm apps/web/src/config.ts.bak
sed -i.bak "s/HELP_PAGE_UPDATED_DATE = '.*'/HELP_PAGE_UPDATED_DATE = '$TODAY_CN'/" apps/web/src/config.ts && rm apps/web/src/config.ts.bak

echo -e "${GREEN}✅ 版本号已更新${NC}"
echo ""

# 8. 更新 CHANGELOG
echo -e "${GREEN}📝 更新 CHANGELOG...${NC}"

TODAY=$(date +%Y-%m-%d)
TEMP_FILE=$(mktemp)

{
  echo "# 更新日志 (CHANGELOG)"
  echo ""
  echo "All notable changes to this project will be documented in this file."
  echo ""
  echo "The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),"
  echo "and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html)."
  echo ""
  echo "## [Unreleased]"
  echo ""
  echo "## [$NEW_VERSION] - $TODAY"
  echo ""

  # 从原 CHANGELOG 中提取 Unreleased 的内容（跳过标题部分）
  sed -n '/## \[Unreleased\]/,/## \[/p' CHANGELOG.md | sed '$d' | tail -n +3

  # 添加旧版本记录
  sed -n '/## \[/,$p' CHANGELOG.md | grep -v '^## \[Unreleased\]'
} > "$TEMP_FILE"

mv "$TEMP_FILE" CHANGELOG.md

echo -e "${GREEN}✅ CHANGELOG 已更新${NC}"
echo ""

# 9. 运行测试
echo -e "${GREEN}🧪 运行测试...${NC}"
(cd packages/core && pnpm test -- --run)

echo -e "${GREEN}✅ 测试通过${NC}"
echo ""

# 10. 构建
echo -e "${GREEN}🏗️  构建项目...${NC}"
pnpm build

echo -e "${GREEN}✅ 构建完成${NC}"
echo ""

# 11. 提交所有内容（包括工作区业务代码 + 版本文件）
echo -e "${GREEN}📤 提交所有内容...${NC}"
git add -A

git commit -m "chore: release v${NEW_VERSION}"
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
