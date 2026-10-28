# 维护公共曲谱库

所有公共曲谱统一放在 `apps/web/resources/scores/`。示例曲谱、竹笛入门及后续分类共用 JSONC 格式、加载逻辑和页面组件，不再维护单独的 TypeScript 曲谱列表。

```text
apps/web/resources/scores/
├── examples/
│   ├── category.jsonc
│   ├── 001-duetDemo.jsonc
│   ├── 002-twinkle.jsonc
│   └── ...
└── bamboo/
    ├── category.jsonc
    └── 001-practice-1.jsonc
```

## 新增曲谱

在对应分类目录中新增一个 `.jsonc` 文件即可，不需要注册到代码中。建议用 `001-xxx.jsonc`、`002-xxx.jsonc` 命名；同分类内按文件名自然排序。

```jsonc
{
  // 分类内唯一，改标题或文件名时保留。
  "id": "practice-2",
  "name": "练习(2)",
  // 可选，填写实际来源；无来源说明时可省略。
  "attribution": "来源说明",
  "source": [
    "---",
    "标题：练习(2)",
    "调号：C",
    "拍号：4/4",
    "速度：80",
    "---",
    "",
    "Q 1 - - - | 2 - - - ||",
  ],
}
```

`id`、`name`、`source` 必填，`attribution` 可选。`source` 每个字符串对应简谱的一行，自动以换行连接；也支持带 `\n` 的单个字符串。JSONC 支持 `//`、`/* */` 注释和尾随逗号。

## 新增或开放分类

1. 在 `apps/web/resources/scores/` 下新建一级目录，例如 `flute/`。
2. 添加 `category.jsonc`，再放入曲谱文件。

```jsonc
{
  "id": "flute",
  "name": "长笛练习",
  "order": 30,
  "enabled": true,
}
```

分类配置四个字段均必填。`id` 全库唯一；`name` 为首页标签名称；`order` 越小越靠前，同序号按分类 ID 排序；`enabled: false` 隐藏分类并禁止通过公共加载入口打开，资源仍会打包到客户端，因此不能用于保密或访问控制。空分类显示待补充提示。

分类标签和曲谱列表自动生成，无需修改页面、Store 或类型枚举。曲谱归属由目录决定，不在曲谱里重复填写分类；分类 ID 与曲谱 ID 共同定位资源，不同分类可使用相同曲谱 ID。

只扫描一级分类目录及其直属 `.jsonc` 文件。分类目录必须包含 `category.jsonc`，该文件名保留给分类配置。

## 加载与校验

`apps/web/src/services/scoreLibrary.ts` 统一扫描、解析、校验、排序并提供查询。页面通过 Store 的 `loadLibraryScore(categoryId, scoreId)` 加载，再复用公共模板保存隔离流程：先保存旧稿，打开公共曲谱，首次编辑创建个人副本。

首次启动优先打开示例分类中的 `twinkle`（小星星）；移除或隐藏该资源后回退到首个已开放曲目，没有可用曲目时使用空谱。

开发时添加文件会触发 Vite 更新；已部署的网站需要重新构建和部署。运行 `pnpm test` 检查所有分类和曲谱，配置错误与重复 ID 会指出文件名；`pnpm build:web` 验证打包。打开新增曲目检查谱面、播放及移调。

迁移时保留原曲谱 ID 和谱文。旧独立 Markdown 中的东北民谣以 `dongbei-original` 保存，列表名标注 G♯ 调，用以区分原示例列表中的 G 调版本。

## 导入和下载

首页「导入曲谱」接受 `.json` 和 `.jsonc`，支持本目录的单首 `id / name / source` 结构、旧版 `id / title / source` 存储文件以及本工具的版本化备份。`source` 支持字符串或逐行数组；单首文件缺少 ID 和时间戳时自动补齐。重复导入相同 ID、标题和谱文会跳过；同 ID 内容不同时保留原曲谱并新增导入副本。

个人曲谱列表的「下载」生成带注释的 `.jsonc` 单首文件，使用与公共曲谱相同的 `id / name / source` 结构，额外保留创建与更新时间。可直接重新导入，也可放入公共曲谱分类目录。「下载全部曲谱」生成 `.jsonc` 备份包，包含当前编辑内容，用于完整恢复；备份包不能作为分类中的单首资源文件。
