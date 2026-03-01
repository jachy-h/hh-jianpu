#!/bin/bash

# 版本发布脚本
# 用法: ./scripts/release.sh [patch|minor|major]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 获取版本类型参数，默认为 patch
VERSION_TYPE=${1:-patch}

echo -e "${GREEN}📦 开始版本发布流程...${NC}"
echo ""

# 1. 检查工作区是否干净
if [[ -n $(git status -s) ]]; then
  echo -e "${YELLOW}⚠️  工作区有未提交的更改${NC}"
  git status -s
  echo ""
  read -p "是否继续？(y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}❌ 发布已取消${NC}"
    exit 1
  fi
fi

# 2. 获取当前版本
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

# 4. 确认发布
read -p "确认发布版本 ${NEW_VERSION}？(y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo -e "${RED}❌ 发布已取消${NC}"
  exit 1
fi

echo ""
echo -e "${GREEN}🔧 更新版本号...${NC}"

# 5. 更新根 package.json
sed -i.bak "s/\"version\": \"$CURRENT_VERSION\"/\"version\": \"$NEW_VERSION\"/" package.json && rm package.json.bak

# 6. 更新子包 package.json
sed -i.bak "s/\"version\": \"$CURRENT_VERSION\"/\"version\": \"$NEW_VERSION\"/" packages/core/package.json && rm packages/core/package.json.bak
sed -i.bak "s/\"version\": \"$CURRENT_VERSION\"/\"version\": \"$NEW_VERSION\"/" apps/web/package.json && rm apps/web/package.json.bak

# 7. 更新 helpPage.tsx 里的版本号和日期
echo -e "${GREEN}📝 更新帮助文档版本号和日期...${NC}"
TODAY=$(date +%Y年%m月%d日)
sed -i.bak "s/version: '.*'/version: '$NEW_VERSION'/" apps/web/src/pages/helpPage.tsx && rm apps/web/src/pages/helpPage.tsx.bak
sed -i.bak "s|更新于.*|更新于 $TODAY|" apps/web/src/pages/helpPage.tsx && rm apps/web/src/pages/helpPage.tsx.bak

echo -e "${GREEN}✅ 版本号已更新${NC}"
echo ""

# 7. 更新 CHANGELOG
echo -e "${GREEN}📝 更新 CHANGELOG...${NC}"

# 获取今天日期
TODAY=$(date +%Y-%m-%d)

# 创建临时文件
TEMP_FILE=$(mktemp)

# 读取 CHANGELOG 并更新
{
  # 写入头部
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
  sed -n '/## \[0\./,$p' CHANGELOG.md
} > "$TEMP_FILE"

# 替换原文件
mv "$TEMP_FILE" CHANGELOG.md

echo -e "${GREEN}✅ CHANGELOG 已更新${NC}"
echo ""

# 8. 运行测试
echo -e "${GREEN}🧪 运行测试...${NC}"
cd packages/core && pnpm test -- --run

echo -e "${GREEN}✅ 测试通过${NC}"
echo ""

# 9. 构建
echo -e "${GREEN}🏗️  构建项目...${NC}"
pnpm build

echo -e "${GREEN}✅ 构建完成${NC}"
echo ""

# 10. Git 提交
echo -e "${GREEN}📤 提交更改...${NC}"
git add .
git commit -m "chore: release v${NEW_VERSION}"
git tag "v${NEW_VERSION}"

echo -e "${GREEN}✅ Git 提交完成${NC}"
echo ""

# 11. 完成
echo -e "${GREEN}🎉 版本 ${NEW_VERSION} 发布完成！${NC}"
echo ""
echo "📋 下一步操作："
echo "   1. 推送代码: git push origin main"
echo "   2. 推送标签: git push origin v${NEW_VERSION}"
echo ""
