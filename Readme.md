# 🎵 hh-jianpu

**哈哈简谱 — 网页端动态简谱工具**

一款功能完整的网页简谱编辑和播放工具：粘贴简谱文本 → 实时渲染曲谱 → 播放并高亮跟踪，另可通过 AI 识别简谱图片自动转换为文本。

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)]()
[![Test Coverage](https://img.shields.io/badge/tests-44%2F44%20passing-brightgreen)]()
[![Version](https://img.shields.io/badge/version-0.1.2-blue)]()
[![License](https://img.shields.io/badge/license-MIT-blue)]()

---

## ✨ 功能

- 📝 **简谱文本输入**，实时预览渲染
- 📷 **图片识别转简谱**，支持 AI 识别简谱图片并转换为可编辑文本（需配置 LLM API Key）
- 📖 **在线帮助文档**，点击「帮助」按钮查看完整编写说明
- 🔧 **可拖动分隔线**，自由调整编辑器和预览面板宽度
- ▶️ **播放旋律**，音符逐个高亮跟踪
- 🎤 **歌词支持**，在简谱下方显示歌词并高亮跟踪
- 🎚️ **播放速度调节**（BPM 40-240）
- 📱 **响应式布局**，桌面/平板/移动端适配
- 🎼 **内置示例曲谱**（小星星、生日快乐、欢乐颂，均含歌词）
- ⚡ **极速构建**，首屏加载 < 2 秒
- 🔧 **TypeScript 全栈**，类型安全

---

## 🚀 快速开始

### 安装依赖

```bash
pnpm install
```

### 启动开发服务器

```bash
pnpm dev
```

访问 http://localhost:5173

### 生产构建

```bash
pnpm build
```

---

## 📖 简谱格式

```
标题: 小星星
调号: C
拍号: 4/4
速度: 120

1 1 5 5 | 6 6 5 - | 4 4 3 3 | 2 2 1 - |
```

### 符号说明

| 符号 | 含义 | 示例 |
|------|------|------|
| `1-7` | 基本音符 do-si | `1 3 5` |
| `0` | 休止符 | `1 0 5 -` |
| `-` | 延长前一音 | `5 - - -` |
| `\|` | 小节线 | `1 2 3 4 \| 5 6 7 1'` |
| `'` | 高八度 | `1'`（高音 do）|
| `.` 前缀 | 低八度 | `.7`（低音 si）|
| `/` | 减时线（每个减半，可叠加） | `1/` (半拍) `1//` (1/4拍) |
| `_` | 歌词占位符（C行中跳过音符） | `C 星 _ _ 光` |
| `#` | 升半音 | `#4` |
| `b` | 降半音 | `b7` |

**💡 需要详细说明？** 点击应用内的「❓ 帮助」按钮查看完整编写说明，或阅读 [docs/user-guide/notation-syntax.md](docs/user-guide/notation-syntax.md)

---

## 📁 项目结构

```
hh-jianpu/
├── packages/
│   └── core/              # @hh-jianpu/core 核心库
│       ├── parser/        # 简谱文本解析器
│       ├── renderer/      # SVG 布局计算
│       ├── player/        # 音频播放与调度
│       └── types/         # TypeScript 类型定义
│
├── apps/
│   └── web/               # Web 应用（React + Vite）
│       ├── components/    # React 组件
│       │   ├── Editor/    # 简谱编辑器
│       │   ├── ScoreView/ # SVG 曲谱渲染
│       │   ├── Player/    # 播放控制栏
│       │   ├── HelpModal/ # 帮助文档弹窗
│       │   ├── Settings/  # 设置面板（v0.2.0 新增）
│       │   ├── ImageImport/  # 图片识别（v0.2.0 新增）
│       │   └── ResizablePanels/  # 可拖动分隔线
│       ├── services/      # 服务层
│       │   └── ocr/       # 图片识别服务（v0.2.0 新增）
│       ├── store/         # Zustand 状态管理
│       └── examples/      # 示例曲谱
│
└── docs/
    ├── production/        # 产品设计文档
    ├── architecture/      # 技术架构文档
    ├── development/       # 开发计划
    ├── testing/           # 测试报告
    └── user-guide/        # 用户指南
        └── notation-syntax.md  # 简谱编写说明
```

---

## 🧪 测试

### 运行单元测试

```bash
cd packages/core
pnpm test
```

### 测试结果

```
✓ Test Files  3 passed (3)
✓ Tests      44 passed (44)
  通过率: 100%
```

详见 [测试报告](docs/testing/final-report.md)

---

## 📚 文档

### 用户指南
- [简谱源码编写说明](docs/user-guide/notation-syntax.md) — 完整语法规则和示例

### 产品设计
- [用户需求分析](docs/production/01-user-requirements.md)
- [产品原型设计](docs/production/02-product-design.md)

### 技术架构
- [技术架构设计](docs/architecture/01-technical-architecture.md)

### 测试报告
- [功能测试报告](docs/testing/test-report.md)
- [单元测试报告](docs/testing/unit-test-report.md)
- [最终交付报告](docs/testing/final-report.md)

---

## 🛠️ 技术栈

| 层级 | 技术 |
|------|------|
| 语言 | TypeScript 5.4 |
| 构建 | Vite 5.4 |
| 前端框架 | React 18 |
| 状态管理 | Zustand 4.5 |
| 音频合成 | Tone.js 15.0 |
| 样式 | Tailwind CSS 3.4 |
| 包管理 | pnpm + monorepo |
| 测试 | Vitest 2.1 |

---

## 🎯 开发路线

### ✅ v0.2.0 (Current) — AI 增强
- ✅ 图片识别转简谱（LLM 多模态 API）
- ✅ 歌词支持（显示与高亮跟踪）
- ✅ 波音、倚音、连音线等装饰音
- ✅ 节拍验证

### ✅ v0.1.0 — MVP
- ✅ 简谱解析与渲染
- ✅ 播放与高亮跟踪
- ✅ 速度调节
- ✅ 示例曲谱
- ✅ 响应式布局

### 🚧 v0.3.0 — 编辑体验
- [ ] 集成 CodeMirror 语法高亮
- [ ] 本地存储（localStorage）
- [ ] 改进错误提示
- [ ] 循环播放选段

### 📅 v0.4.0 — 导出与分享
- [ ] 导出图片/PDF
- [ ] 变调功能
- [ ] 分享链接

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

## 📄 License

MIT

---

**Made with ❤️ for music learners**