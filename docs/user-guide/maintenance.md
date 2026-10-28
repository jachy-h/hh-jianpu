# 帮助文档维护

用户文档以当前实现为准，功能变更应在同一次修改中同步文档，不等到发布时补写。

| 变更范围 | 同步检查 |
|---|---|
| Parser、Renderer、Player 的符号、时值和限制 | `notation-syntax.md`、网页 `apps/web/src/pages/HelpPage.tsx`、速查数据 `apps/web/src/components/Help/symbol-reference-data.ts` |
| 播放控件、移调、保存、导入、目录恢复 | `getting-started.md`、网页帮助与常见问题 |
| 公共曲谱分类、曲目 | 网页帮助、使用指南中的数量和名称、`docs/score-library.md` |
| 音色加载与播放行为 | 网页帮助、使用指南、`docs/playback-instruments.md` |

## 完成前检查

1. 对照代码核实默认值、按钮名称、成功与失败行为；区分“已支持”和“暂不支持”。
2. 同时搜索网页帮助和用户指南中的旧术语，避免只更新一个入口。
3. 新语法用完整、可播放的小节示例，放入 `notation-syntax.md` 的 `jianpu` 代码块；现有 `notation-examples.test.ts` 会读取并解析这些示例。
4. 执行项目质量检查：`pnpm lint`、`pnpm build:core`、`pnpm test`、`pnpm build:web`。涉及帮助排版时，在窄屏与桌面检查目录跳转、表格和代码块横向滚动。
5. 按实际核对日期更新文档日期及 `apps/web/src/config.ts` 的帮助日期；帮助版本自动读取根 `package.json`，不要单独硬编码版本。在 CHANGELOG 记录面向用户的变化。

历史设计、计划和交付报告保留历史版本，不把它们当作当前功能说明。新增用户指南请从现有指南链接，避免产生无法发现的孤立文档。
