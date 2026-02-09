# 图片识别转简谱 — 技术架构设计

**版本**: v0.2.0  
**设计日期**: 2026年2月8日  
**设计人**: 技术架构师  
**设计原则**: 最小侵入、纯前端、模块独立

---

## 一、架构总览

### 核心约束

1. **纯前端架构不变** — 不引入后端服务，API 调用从浏览器直接发起
2. **不侵入现有管线** — 图片识别是编辑器的"前置输入源"，不修改 Parser/Renderer/Player
3. **新增独立模块** — 所有 OCR 相关代码封装在独立目录中，可独立移除
4. **渐进增强** — 不配置 API Key 的用户完全不受影响

### 架构全景

```
┌─────────────────────────────────────────────────────────────────┐
│                        Web Application                          │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                      输入层                              │    │
│  │                                                         │    │
│  │  ┌──────────────┐    ┌──────────────────────────────┐   │    │
│  │  │   文本输入     │    │      图片输入（新增）          │   │    │
│  │  │  (textarea)   │    │                              │   │    │
│  │  │              │    │  Upload/Paste → Preprocess    │   │    │
│  │  │              │    │       → LLM API → Postprocess │   │    │
│  │  │              │    │       → 简谱文本               │   │    │
│  │  └──────┬───────┘    └──────────────┬───────────────┘   │    │
│  │         │                           │                   │    │
│  │         └───────────┬───────────────┘                   │    │
│  │                     ▼                                   │    │
│  │              source: string                             │    │
│  └─────────────────────┬───────────────────────────────────┘    │
│                        ▼                                        │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   现有管线（不变）                        │    │
│  │   source → Parser → Score AST → Renderer → SVG          │    │
│  │                                → Player  → Audio         │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

**关键洞察**：图片识别的最终输出就是一个 `string`（简谱源码），和用户手动输入的 `string` 完全等价。下游管线无需任何修改。

---

## 二、模块设计

### 2.1 新增模块位置

```
apps/web/src/
├── components/
│   └── ImageImport/              ← 新增 UI 组件
│       ├── ImageImportButton.tsx  ← 入口按钮
│       ├── ImageImportModal.tsx   ← 上传/识别面板
│       ├── ImagePreview.tsx       ← 图片预览
│       ├── RecognitionResult.tsx  ← 识别结果展示
│       └── index.ts
├── services/
│   └── ocr/                      ← 新增 OCR 服务层
│       ├── types.ts              ← OCR 相关类型定义
│       ├── preprocessor.ts       ← 图片预处理
│       ├── llm-client.ts         ← LLM API 调用封装
│       ├── postprocessor.ts      ← 识别结果后处理
│       ├── ocr-service.ts        ← 统一服务入口
│       └── index.ts
├── components/
│   └── Settings/                 ← 新增设置组件
│       ├── SettingsModal.tsx      ← 设置面板
│       └── index.ts
└── store/
    └── useStore.ts               ← 微调：新增 OCR 状态字段
```

### 2.2 为什么不放在 `@hh-jianpu/core`

图片识别依赖浏览器 API（File、Canvas、fetch 到外部 LLM 服务），不符合 core 库"纯计算、无副作用、无平台依赖"的设计原则。它是 Web 应用层的功能，归属于 `apps/web`。

---

## 三、数据流设计

### 3.1 完整处理流水线

```
[用户上传/粘贴图片]
        │
        ▼
┌───────────────────┐
│  1. 前端预处理      │
│  - 格式校验         │
│  - 尺寸压缩         │
│  - 转 Base64        │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  2. LLM API 调用   │
│  - 构造 Prompt      │
│  - 发送图片         │
│  - 接收文本响应      │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  3. 后处理          │
│  - 清洗 LLM 输出    │
│  - 规范化语法格式    │
│  - 基础校验         │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  4. 填入编辑器      │
│  - 替换/追加模式    │
│  - 触发 setSource   │
│  → 后续全部复用     │
└───────────────────┘
```

### 3.2 各阶段详细设计

#### 阶段 1: 前端预处理（preprocessor.ts）

```typescript
interface PreprocessOptions {
  /** 最大宽度（像素），超过则等比缩放 */
  maxWidth: number;
  /** 最大高度（像素），超过则等比缩放 */
  maxHeight: number;
  /** JPEG 压缩质量 (0-1) */
  quality: number;
  /** 最大文件大小（字节） */
  maxFileSize: number;
}

const DEFAULT_PREPROCESS_OPTIONS: PreprocessOptions = {
  maxWidth: 2048,
  maxHeight: 2048,
  quality: 0.85,
  maxFileSize: 10 * 1024 * 1024, // 10MB
};

interface PreprocessResult {
  /** Base64 编码的图片数据 */
  base64: string;
  /** MIME 类型 */
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  /** 原始尺寸 */
  originalSize: { width: number; height: number };
  /** 处理后尺寸 */
  processedSize: { width: number; height: number };
}
```

**处理流程**：
1. 校验文件类型（仅 jpg/png/webp）
2. 校验文件大小（≤10MB）
3. 使用 Canvas 进行等比缩放（最大边不超过 2048px）
4. 导出为 JPEG Base64（减少传输体积）

#### 阶段 2: LLM API 调用（llm-client.ts）

```typescript
/** 支持的 LLM 服务商 */
type LLMProvider = 'openai' | 'anthropic' | 'compatible';

interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  /** 自定义 API 端点（用于兼容 API） */
  baseUrl?: string;
  /** 模型名称 */
  model?: string;
}

interface LLMRequest {
  image: string; // Base64
  mimeType: string;
}

interface LLMResponse {
  /** LLM 返回的原始文本 */
  rawText: string;
  /** 使用的 token 数量（如果 API 返回） */
  usage?: { promptTokens: number; completionTokens: number };
}
```

**Prompt 设计（核心）**：

```
你是一个简谱识别专家。请分析图片中的简谱（数字简谱/jianpu），
将其转换为以下文本格式。

格式规则：
- 第一行：标题: <歌曲名> （如果图片中有）
- 第二行：调号: <调号> （如 C, D, G 等，看图片中 1=? 的标注）
- 第三行：拍号: <拍号> （如 4/4, 3/4 等）
- 第四行：速度: <BPM> （如果有标注，否则默认 120）
- 空一行后输出音符

音符规则：
- 数字 1-7 表示 do-si
- 0 表示休止符
- - 表示延长前一个音符一拍
- | 表示小节线
- ' 在数字后面表示高八度（如 1' 表示高音 do）
- . 在数字后面表示低八度（如 1. 表示低音 do）
- _ 在数字后面表示减半时值（如 1_ 表示八分音符）
- # 在数字前面表示升半音
- b 在数字前面表示降半音
- 音符之间用空格分隔

注意：
- 只输出格式化后的文本，不要添加任何解释
- 如果某个音符不确定，用 ? 标记
- 保持原谱的小节划分
- 每行一个乐句或合理分行
```

#### 阶段 3: 后处理（postprocessor.ts）

```typescript
interface PostprocessResult {
  /** 处理后的简谱源码 */
  source: string;
  /** 识别警告（如发现的不确定内容） */
  warnings: string[];
}
```

**后处理步骤**：
1. 去除 LLM 输出中的 markdown 代码块标记（```）
2. 去除额外的解释性文字
3. 规范化空格和换行
4. 校验元信息格式是否正确
5. 将 `?` 标记转为注释或保留（供用户修正）
6. 尝试用现有 Parser 解析一次，检查是否有语法错误

#### 阶段 4: 填入编辑器

复用现有 `useStore` 的 `setSourceImmediate` 方法，与示例加载走相同路径。

---

## 四、类型定义

```typescript
// apps/web/src/services/ocr/types.ts

/** OCR 处理状态 */
export type OCRStatus = 
  | 'idle'          // 空闲
  | 'preprocessing' // 预处理中
  | 'recognizing'   // 识别中
  | 'postprocessing' // 后处理中
  | 'done'          // 完成
  | 'error';        // 错误

/** OCR 处理结果 */
export interface OCRResult {
  /** 识别出的简谱源码 */
  source: string;
  /** 处理警告 */
  warnings: string[];
  /** 处理耗时（毫秒） */
  duration: number;
}

/** OCR 错误 */
export interface OCRError {
  code: 'INVALID_IMAGE' | 'FILE_TOO_LARGE' | 'API_ERROR' 
      | 'NETWORK_ERROR' | 'TIMEOUT' | 'INVALID_API_KEY' 
      | 'NO_CONTENT';
  message: string;
}

/** LLM 服务商配置 */
export interface LLMProviderConfig {
  provider: 'openai' | 'anthropic' | 'compatible';
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

/** 导入模式 */
export type ImportMode = 'replace' | 'append';
```

---

## 五、状态管理扩展

在 `useStore` 中新增最少量的状态字段：

```typescript
// 新增字段（追加到现有 AppState 接口）
interface AppState {
  // ... 现有字段不变 ...

  // OCR 相关（新增）
  ocrStatus: OCRStatus;
  ocrResult: OCRResult | null;
  ocrError: OCRError | null;

  // OCR 操作（新增）
  recognizeImage: (file: File) => Promise<void>;
  applyOCRResult: (mode: ImportMode) => void;
  clearOCRState: () => void;
}
```

**设计决策**：
- OCR 状态放在主 store 中而非独立 store，因为 `applyOCRResult` 需要调用 `setSourceImmediate`
- 状态字段数量极少（3 个状态 + 3 个方法），对现有 store 侵入最小
- `clearOCRState` 在关闭面板时调用，确保无状态残留

---

## 六、API Key 存储

```typescript
// apps/web/src/services/ocr/config.ts

const STORAGE_KEY = 'hh-jianpu-llm-config';

export function saveLLMConfig(config: LLMProviderConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function loadLLMConfig(): LLMProviderConfig | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearLLMConfig(): void {
  localStorage.removeItem(STORAGE_KEY);
}
```

**安全考量**：
- API Key 仅存储在 `localStorage`，不经过任何后端
- API 调用直接从浏览器 `fetch` 发送到 LLM 服务商
- 需注意 CORS：OpenAI API 支持浏览器直接调用；Anthropic 可能需要代理
- 在帮助文档中提示用户使用低额度的 Key

---

## 七、组件层级

```
App.tsx
├── AppLayout
│   ├── [📷 识别图片] ← ImageImportButton（编辑模式下显示）
│   ├── [⚙️ 设置]    ← SettingsButton（新增）
│   └── ResizablePanels
│       ├── Editor
│       │   └── (粘贴图片检测)
│       └── ScoreView
├── ImageImportModal     ← 浮层面板
│   ├── ImagePreview
│   └── RecognitionResult
├── SettingsModal        ← 设置面板
├── HelpModal
└── PlayerBar
```

**与现有组件的交互**：
- `ImageImportButton` 放在 `AppLayout` 的编辑模式区域（靠近编辑器）
- `ImageImportModal` 作为独立浮层，与 `HelpModal` 同级
- `SettingsModal` 与 `HelpModal` 同级
- 识别完成后，调用 `setSourceImmediate(result)` → 后续流程自动触发

---

## 八、错误处理策略

```typescript
// 统一错误处理
async function handleOCRError(error: unknown): OCRError {
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return { code: 'NETWORK_ERROR', message: '网络连接失败，请检查网络' };
  }
  if (error instanceof DOMException && error.name === 'AbortError') {
    return { code: 'TIMEOUT', message: '识别超时，请重试' };
  }
  // API 响应错误
  if (error instanceof Response) {
    if (error.status === 401) {
      return { code: 'INVALID_API_KEY', message: 'API Key 无效，请检查设置' };
    }
    if (error.status === 429) {
      return { code: 'API_ERROR', message: 'API 调用频率限制，请稍后重试' };
    }
  }
  return { code: 'API_ERROR', message: '识别失败，请重试' };
}
```

**超时控制**：
- 使用 `AbortController` 设置 30 秒超时
- 超时后自动取消请求并提示用户

---

## 九、性能考量

| 环节 | 预估耗时 | 优化策略 |
|------|---------|---------|
| 图片预处理 | 100-500ms | Canvas 操作，纯前端 |
| 图片上传到 LLM | 1-3s | 压缩后体积 < 500KB |
| LLM 推理 | 3-10s | 取决于 LLM 服务商和图片复杂度 |
| 后处理 | < 50ms | 纯文本操作 |
| **总计** | **5-15s** | 进度条 + 状态提示 |

**体积影响**：
- 新增代码预计 < 5KB (gzipped)
- 无新增第三方依赖（纯 fetch + Canvas API）
- 对首屏加载零影响（模态框懒加载）

---

## 十、测试策略

### 单元测试

| 模块 | 测试内容 |
|------|---------|
| preprocessor | 图片压缩、格式校验、尺寸限制 |
| postprocessor | LLM 输出清洗、语法规范化、错误处理 |
| config | localStorage 读写、配置验证 |

### 集成测试

| 场景 | 测试内容 |
|------|---------|
| 正常流程 | 上传图片 → 识别 → 填入编辑器 → 预览正确 |
| 错误处理 | 无效图片 → 友好提示 |
| 无 Key | 按钮禁用 → 提示配置 |
| 网络异常 | 超时处理 → 错误提示 |

### 不做 LLM 真实调用测试

- 单元测试中 mock LLM 响应
- 真实调用在手动测试阶段验证

---

## 十一、安全与隐私

1. **API Key 保护**：仅存 localStorage，不上传到任何服务器
2. **图片隐私**：图片直接从浏览器发送到 LLM 服务商，不经过中间服务器
3. **CORS 限制**：如果 LLM 服务商不支持浏览器直接调用，提供可选的 CORS 代理配置
4. **用户知情**：在设置页面明确说明数据流向

---

## 十二、对现有代码的修改清单

| 文件 | 修改类型 | 修改内容 |
|------|---------|---------|
| `apps/web/src/store/useStore.ts` | 微调 | 新增 3 个 OCR 状态字段 + 3 个方法 |
| `apps/web/src/App.tsx` | 微调 | 引入 ImageImportButton、SettingsButton、两个 Modal |
| `apps/web/src/components/Layout/AppLayout.tsx` | 微调 | 顶栏新增设置按钮 |
| 其他现有文件 | **不修改** | Parser/Renderer/Player/ScoreView/Editor 等全部不动 |

**新增文件**：

| 文件 | 说明 |
|------|------|
| `apps/web/src/services/ocr/types.ts` | OCR 类型定义 |
| `apps/web/src/services/ocr/preprocessor.ts` | 图片预处理 |
| `apps/web/src/services/ocr/llm-client.ts` | LLM API 封装 |
| `apps/web/src/services/ocr/postprocessor.ts` | 后处理 |
| `apps/web/src/services/ocr/config.ts` | API Key 管理 |
| `apps/web/src/services/ocr/ocr-service.ts` | 统一入口 |
| `apps/web/src/services/ocr/index.ts` | 导出 |
| `apps/web/src/components/ImageImport/ImageImportButton.tsx` | 入口按钮 |
| `apps/web/src/components/ImageImport/ImageImportModal.tsx` | 上传面板 |
| `apps/web/src/components/ImageImport/ImagePreview.tsx` | 图片预览 |
| `apps/web/src/components/ImageImport/RecognitionResult.tsx` | 结果展示 |
| `apps/web/src/components/ImageImport/index.ts` | 导出 |
| `apps/web/src/components/Settings/SettingsModal.tsx` | 设置面板 |
| `apps/web/src/components/Settings/index.ts` | 导出 |

---

**设计人**: 技术架构师  
**审阅人**: 产品经理  
**约束**: 严格遵守"最小侵入"原则，所有新功能可独立移除而不影响现有能力
