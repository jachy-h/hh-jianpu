# 小工具容器能力清单 · 小红书

来源：https://miniapp-sandbox.xiaohongshu.com/minitool/doc
在线核验：2026-10-28
页面标注更新时间：2026-10-19

L0: 小红书 · 小工具开发者文档
L1: # 小工具容器 · 能力清单
L2: 
L3: 面向小工具开发者，说明小红书小工具容器内 哪些 Web 能力可用、哪些不可用，以及容器提供的 平台 JS API（AI 文本生成 / 发笔记 / 关注作者 / 存相册 / 本地缓存 / 文件系统 / 评论区 / 窗口信息 / 定位 / 振动 / 陀螺仪）。
L4: 创作或改写小工具时，请先复制小工具上传页提供的完整改写口令，交给 AI 助手按口令执行。
L5: 
L6: 适用 iOS / Android 双端（除注明外一致） · 最后更新 2026-10-19
L7: 
L8: 目 录
L9:   1. 【0†1. 运行环境】
L10:   2. 【1†2. 可用能力】
L11:     1. 【2†2.1 页面与渲染】
L12:     2. 【3†2.2 JS / CSS 兼容基线】
L13:     3. 【4†2.3 媒体与文件】
L14:     4. 【5†2.4 数据存储】
L15:     5. 【6†2.5 交互】
L16:     6. 【7†2.6 资源加载规则】
L17:   3. 【8†3. 平台 JS API】
L18:     1. 【9†3.1 调用约定】
L19:     2. 【10†3.2 API 一览】
L20:     3. 【11†3.3 发布笔记】
L21:     4. 【12†3.4 保存图片到相册】
L22:     5. 【13†3.5 临时文件】
L23:     6. 【14†3.6 客户端版本判断】
L24:     7. 【15†3.7 小工具本地缓存】
L25:     8. 【16†3.8 文件系统】
L26:     9. 【17†3.9 发布评论】
L27:     10. 【18†3.10 AI 文本生成】
L28:     11. 【19†3.11 窗口信息】
L29:     12. 【20†3.12 定位】
L30:     13. 【21†3.13 振动反馈】
L31:     14. 【22†3.14 陀螺仪】
L32:     15. 【23†3.15 关注作者】
L33:   4. 【24†4. 不可用能力】
L34:     1. 【25†4.1 禁用 Web API】
L35:     2. 【26†4.2 禁用行为】
L36:     3. 【27†4.3 移动端不支持】
L37:   5. 【28†5. WebGL / 图形计算边界】
L38:   6. 【29†6. 常见问题 FAQ】
L39: ## 01运行环境
L40: 
L41: 小工具是运行在受限沙箱环境里的纯 Web 应用（HTML / CSS / JS），请把它当作一个"能力受限的浏览器页面"来开发。
L42: 
L43: 📋
L44: 
L45: 创作入口：使用小工具上传页的改写口令。
L46: 无论从零创作还是改写现有 H5，都应在上传页“第一步：调整为符合小红书规范的代码格式”中 完整复制当前口令并发送给工作区内的 AI 助手。AI 助手须按口令下载对应版本 Skill、 解压到指定目录、读取 `SKILL.md`，再对当前产物进行校验、修复和打包；完成后将生成的 zip 用于上传页第二步。本能力清单用于解释容器边界，不能代替上传页口令，也不要沿用手工保存的旧口令。
L47: 
L48: 技术栈
L49: 
L50: #### 标准 Web 技术栈
L51: 
L52: 使用标准 HTML / CSS / JS 与标准 Web API 开发，最终产物须符合 Chrome 61 兼容基线。
L53: 
L54: 兼容性
L55: 
L56: #### Android 8.1 / Chrome 61
L57: 
L58: Android 端按出厂 Chrome / WebView 61 的最低能力交付；iOS 支持的额外能力仅作增强。
L59: 
L60: 平台能力
L61: #### JS API（window.xhs）
L62: 
L63: 容器自动注入 JS API SDK，可调用 AI 文本生成、发布笔记、关注作者、保存相册、 窗口信息、定位、振动和陀螺仪等能力（详见 【8†§3】），无需自行引入脚本。
L64: 
L65: 沙箱
L66: 
L67: #### 安全沙箱
L68: 
L69: 容器对部分敏感 Web 能力做了限制（详见下文），并对文件选择、页面跳转等做了统一管控。
L70: 
L71: 隔离
L72: 
L73: #### 独立隔离
L74: 
L75: 每个小工具拥有独立的存储与运行环境，小工具之间互相隔离、无法访问彼此数据，也无法互相通信。
L76: 
L77: 网络边界
L78: 
L79: #### 页面不能主动联网
L80: 
L81: 页面、脚本、图片、字体等资源必须打包在小工具内，网页不能直接请求外部服务。 可用平台能力以 §3 的公开说明为准。
L82: 
L83: ## 02可用能力
L84: ### 2.1 页面与渲染
L85: 
L86: 能力  | 说明
L87: --- | ---
L88: HTML / CSS / JS  | 支持 Chrome 61 基线内的标准能力；新语法、新 API 与现代 CSS 须转译、检测或降级，详见 §2.2
L89: 内联样式  | `<style>` 与 `style=""` 均可用
L90: 页面内脚本  | 页面自带的脚本可正常执行
L91: Canvas 2D  | `canvas.getContext('2d')`，完整支持
L92: WebGL  | `getContext('webgl' / 'webgl2')`，纯渲染可用（能力边界见 §5）
L93: 文本选择  | 不限制
L94: ### 2.2 JS / CSS 兼容基线
L95: 
L96: 小工具最低兼容 Android 8.1 出厂 Chrome / WebView 61，iOS 最低支持 iOS 18.4。
L97: 
L98:   * JavaScript：最终交付代码须编译到 ES2017 / Chrome 61；更高版本语法由构建工具转译。
L99:   * CSS：最终样式须兼容 Chrome 61；更高版本 CSS 只能作为增强，并保留基础样式。
L100:   * 能力检测：使用 Chrome 61 基线外的高级 Web API 或 CSS 能力前，必须先检测是否支持； 支持时启用增强，不支持时走降级路径。
L101: 
L102: 开发方式：请复制小工具上传页提供的完整改写口令，让 AI 助手加载对应版本 Skill， 并严格按照 `SKILL.md` 完成开发、兼容处理、校验和打包。具体开发规则以 Skill 为准。
L103: ### 2.3 媒体与文件
L104: 
L105: 能力  | 用法  | 说明
L106: --- | --- | ---
L107: 摄像头  | `getUserMedia({ video })`  | 需用户在系统弹窗中授权
L108: 麦克风  | `getUserMedia({ audio })`  | 需用户在系统弹窗中授权
L109: 选择图片 / 拍照  | `<input type="file">`  | 系统选择器接管，仅支持选择图片和视频（无论 accept 如何设置）
L110: 音视频播放  | `<video>` / `<audio>`  | 支持内联播放
L111: ### 2.4 数据存储
L112: 
L113: 能力  | 说明
L114: --- | ---
L115: Storage JS API  | 推荐的小工具本地缓存方案；版本要求与判断见 【14†§3.6】，API 见 【15†§3.7】
L116: 文件系统 JS API  | 用于持久文件和二进制数据；客户端 9.49+ 可用，API 见 【16†§3.8】
L117: localStorage / sessionStorage / IndexedDB / Cookie / Cache API  | 仅作为未满足 【14†§3.6】 版本条件时的兼容降级方案
L118: 
L119: ⚠️
L120: 
L121: 不要把浏览器自带存储当作可靠的持久化方案。 小工具容器无法保证 `localStorage`、`sessionStorage`、 `IndexedDB`、Cookie 或 Cache API 始终可用，也无法保证其数据持续有效。 兼容低版本客户端时，所有读写都要做异常处理，并能容忍数据缺失、失效或被清理。 客户端从低版本升级到支持 Storage JS API 的版本时，开发者需自行维护不同存储方案之间的数据迁移与一致性。
L122:   * 数据仅属于当前小工具，其他小工具与外部无法访问。请勿假设数据永久持久化。
L123: ### 2.5 交互
L124: 
L125: 能力  | 说明
L126: --- | ---
L127: `alert()` / `confirm()`  | 可用，以原生 UI 展示
L128: 振动反馈  | 使用平台 JS API `vibrateShort` / `vibrateLong`， 参数与设备差异见 【21†§3.13】
L129: ### 2.6 资源加载规则
L130: 
L131: 小工具页面资源本地运行、不能直接联网，容器对页面如何加载各类资源有明确约束（对应浏览器 CSP 限制）。所有资源须打包在小工具内（下表"包内资源"），另按类型额外允许 `data:` / `blob:` 等内存来源。
L132: 资源类型  | 允许的加载方式  | 不允许
L133: --- | --- | ---
L134: 脚本 `<script>`  | ✅ 引用包内脚本 `<script src="./app.js">`（同源外链）  | 🔴 内联 `<script>...</script>`
L135: 🔴 行内事件 `onclick="..."` 等、`javascript:` URI
L136: 🔴 `eval()` / `new Function()`、WebAssembly
L137: 🔴 外部域名脚本、`data:` / `blob:` 脚本
L138: 样式 `<style>` / `<link>`  | ✅ 内联 `<style>`、`style="..."` 行内样式
L139: ✅ 引用包内样式表  | 🔴 外部域名样式表
L140: 图片 `<img>` / CSS 背景图  | ✅ 包内图片 `<img src="./a.png">`
L141: ✅ `data:` URI（base64 内嵌）
L142: ✅ `blob:`（`createObjectURL` 内存对象，如选图预览）  | 🔴 外部域名图片
L143: 字体 `@font-face`  | ✅ 包内字体文件  | 🔴 外部域名字体
L144: `iframe` / `object`  | 🔴 全部禁止  | —
L145: #### 支持的文件类型
L146: 
L147: 小工具包内仅支持以下文件类型：
L148: 
L149: 文件类型  | 原因
L150: --- | ---
L151: `.html`  | 小工具主体，必须有且只有一个入口文件
L152: `.css`  | 样式文件，虽然口令要求内联，但不排除用户分开放
L153: `.js`  | 脚本文件，同上
L154: `.png` / `.jpg` / `.jpeg` / `.gif` / `.webp` / `.svg`  | 图片资源，内联 base64 太大时用户可能分开放
L155: `.woff` / `.woff2`  | 字体文件，本地字体场景
L156: `.json`  | 静态数据文件，部分小工具需要读取本地配置数据
L157: #### 实践要点
L158: 
L159:   * 脚本必须外置：容器禁止内联脚本与行内事件处理器，请把 JS 写进包内 `.js` 文件用 `<script src>` 引入，事件绑定改用 `addEventListener`（不要用 `onclick=` 属性）。
L160:   * 样式可内联：`<style>` 和 `style="..."` 都能用，无需外置。
L161:   * 选图预览用 `<img src>` 配 `data:` 或 `blob:` 均可显示（如 `FileReader.readAsDataURL` 或 `URL.createObjectURL`）。
L162: 
L163: 💡
L164: 
L165: 外部 CDN 一律加载不到，所有资源请全部打包进小工具。
L166: 
L167: ## 03平台 JS API
L168: 
L169: 除标准 Web 能力外，容器会自动注入 JS API SDK，小工具可通过 `window.xhs.miniTool.*` 调用 App 原生能力：发布笔记、保存图片到相册、 本地缓存、文件读写、发布评论、关注作者、窗口信息、定位、振动和陀螺仪； 通过 `window.xhs.AI` 调用平台对话模型。 无需在包内引入任何 SDK 脚本。
L170: ### 3.1 miniTool 调用约定
L171: 项  | 规则
L172: --- | ---
L173: 唯一入口  | 端能力只能通过本文公开的 `window.xhs.miniTool` 方法调用，参数形式见各节；未列出的能力不受支持
L174: 一次性异步调用  | 通过 `<apiName>(options)` 调用。 传入 `success` / `fail` / `complete` 任一回调时返回 `undefined`；都不传则返回 `Promise`
L175: 异步调用成功  | resolve / `success` 收到结果对象，含 `errMsg: "<api>:ok"` 及该 API 的业务字段
L176: 异步调用失败  | reject / `fail` 收到 `{ errMsg: "<api>:fail ...", errCode? }`；参数不合法时会在本地直接失败，不上行
L177: 事件监听  | `onGyroscopeChange(callback)` / `offGyroscopeChange(callback?)` 直接接收监听函数，同步返回 `undefined`，不接受 `success` / `fail` / `complete`。数据回调收到 `{ x, y, z }`，不带 `errMsg`；生命周期见 【22†§3.14】
L178: 参数校验  | 按各接口声明传入字段、类型和枚举值，表中未声明的字段不要传。 事件监听方法传入非法回调参数时会同步抛出 `TypeError`
L179: 可用性判断  | 调用前用 `window.xhs && window.xhs.miniTool` 判空， 再检查具体方法是否为函数；方法存在时仍需处理调用失败，并准备降级路径
L180: 
L181:     `// Promise 形态
L182:     async function saveImage(filePath) {
L183:       const miniTool = window.xhs && window.xhs.miniTool;
L184:       if (!miniTool || typeof miniTool.saveImageToPhotosAlbum !== "function") return;
L185: 
L186:       try {
L187:         await miniTool.saveImageToPhotosAlbum({ filePath });
L188:       } catch (err) {
L189:         console.log(err.errMsg); // "saveImageToPhotosAlbum:fail ..."
L190:       }
L191:     }
L192: 
L193:     // 回调形态（返回 undefined）
L194:     function saveImageWithCallbacks(filePath) {
L195:       const miniTool = window.xhs && window.xhs.miniTool;
L196:       if (!miniTool || typeof miniTool.saveImageToPhotosAlbum !== "function") return;
L197:       miniTool.saveImageToPhotosAlbum({
L198:         filePath,
L199:         success: (res) => console.log(res.errMsg),
L200:         fail: (err) => console.log(err.errMsg),
L201:         complete: () => {},
L202:       });
L203:     }`
L204: ### 3.2 API 一览
L205: API  | 能力  | 可替代 / 适用场景  | 形态
L206: --- | --- | --- | ---
L207: 【11†`postNote`】  | 唤起笔记发布页，带入标题 / 正文 / 图片 / 视频  | 网页无法直接发布笔记时使用  | 异步
L208: 【12†`saveImageToPhotosAlbum`】  | 保存图片到系统相册  | 替代 `<a download>` / Blob 下载保存图片  | 异步
L209: 【13†`writeTempFile`】  | 把 base64 数据写成容器内临时文件，换取 `filePath`  | 需要向其他端 API 传本地路径时使用  | 异步
L210: 【14†`getLaunchOptions`】  | 异步获取客户端启动参数  | 读取 `miniToolEnv.buildVersion` 做客户端版本判断  | 异步
L211: 【15†`setStorage` / `getStorage` / `getStorageInfo` / `removeStorage` / `clearStorage`】  | 小工具本地缓存（版本要求见 【14†§3.6】）  | 替代 `localStorage` / `IndexedDB` / Cookie / Cache API  | 异步
L212: 【16†`saveFile` / `writeFile` / `appendFile` / `readFile` / `readDir` / `statFile` / `unlink` / `mkdir` / `getFileStorageInfo`】  | 小工具本地文件的保存、读写、查询与管理  | 持久文件、二进制数据和大文件分片读写（客户端 9.49+）  | 异步
L213: 【17†`interactionOpenApi`】  | 携带评论草稿打开评论编辑器  | 分享小工具生成的文本或图片（客户端 9.49+）  | 异步
L214: 【18†`AI.createModel(...).generateText(...)`】  | 调用平台对话模型生成文本  | AI 对话、文案生成、灵感辅助与个性化解读（内测加白）  | Promise / 非流式
L215: 【19†`getWindowInfo`】  | 获取容器窗口尺寸、安全区和顶部按钮位置  | 页面布局与原生按钮避让（客户端 9.49+）  | 异步
L216: 【20†`getLocation`】  | 获取单次定位  | 替代网页 `navigator.geolocation`（客户端 9.49+）  | 异步
L217: 【21†`vibrateShort`】  | 触发短振动，指定轻 / 中 / 重强度  | 点击等操作的触感反馈（客户端 9.50+）  | 异步
L218: 【21†`vibrateLong`】  | 触发长振动  | 需要长振动的交互反馈（客户端 9.50+）  | 异步
L219: 【22†`startGyroscope`】  | 开始陀螺仪采集  | 获取角速度前启动采集（客户端 9.50+）  | 异步
L220: 【22†`stopGyroscope`】  | 停止陀螺仪采集  | 结束使用时停止采集（客户端 9.50+）  | 异步
L221: 【22†`onGyroscopeChange`】  | 注册角速度数据监听  | 接收 `x / y / z` 数据（客户端 9.50+）  | 同步注册监听
L222: 【22†`offGyroscopeChange`】  | 移除角速度数据监听  | 解除指定或全部监听（客户端 9.50+）  | 同步移除监听
L223: 【23†`followAuthor`】  | 引导关注当前小工具作者  | 关注作者及刷新关注按钮状态（客户端 9.51+）  | 异步
L224: 【23†`getFollowStatus`】  | 查询当前用户与小工具作者的关注状态  | 渲染关注 / 已关注状态（客户端 9.51+）  | 异步
L225: 💡
L226: 
L227: 媒体类字段（图片 / 视频 / 封面）只接受 `data:` base64 或本地文件路径（容器不联网，网络地址不可用）。体积较大的 base64 建议先用 `writeTempFile` 换成 `filePath` 再传。
L228: ### 3.3 postNote — 发布笔记
L229: 
L230: 唤起 App 笔记发布页，并带入小工具产出的内容与媒体。用户在发布页可继续编辑或取消。
L231: 字段  | 类型  | 必填  | 说明
L232: --- | --- | --- | ---
L233: `title`  | string  | 否  | 标题，最长 20 字
L234: `content`  | string  | 否  | 正文，最长 1000 字
L235: `pageType`  | string  | 否  | 页面类型：`video_publish` / `photo_publish` / `slides_edit`（客户端 9.43+）
L236: `mediaInfo`  | object  | 是  | 媒体信息，下列三种资源至少传一种，可同时传
L237: `mediaInfo.image_resources`  | `{ url }[]`  | 否  | 图片，1–18 张；`url` 为 base64 或本地路径
L238: `mediaInfo.video_resources`  | `{ video_url, cover_url? }`  | 否  | 单个视频，`cover_url` 为可选封面
L239: `mediaInfo.live_photo_sources`  | `{ url, video_url }[]`  | 否  | 实况照片，1–18 组；`url` 为封面，`video_url` 为视频（客户端 9.43+）
L240: 
L241:     `// 图文笔记
L242:     await window.xhs.miniTool.postNote({
L243:       title: "我的作品",
L244:       content: "用小工具生成的",
L245:       pageType: "photo_publish",
L246:       mediaInfo: {
L247:         image_resources: [{ url: "data:image/png;base64,iVBORw0KGgo..." }],
L248:       },
L249:     });
L250: 
L251:     // 视频笔记
L252:     await window.xhs.miniTool.postNote({
L253:       pageType: "video_publish",
L254:       mediaInfo: {
L255:         video_resources: { video_url: videoPath, cover_url: coverPath },
L256:       },
L257:     });
L258: 
L259:     // 实况笔记（客户端 9.43+）
L260:     await window.xhs.miniTool.postNote({
L261:       pageType: "slides_edit",
L262:       mediaInfo: {
L263:         live_photo_sources: [{ url: coverPath, video_url: videoPath }],
L264:       },
L265:     });`
L266: ⚠️
L267: 
L268: 成功回调只代表发布页已被唤起并由用户点击发布，不代表笔记最终审核通过。请勿依赖它做强一致的业务状态。
L269: ### 3.4 saveImageToPhotosAlbum — 保存图片到相册
L270: 
L271: 💡
L272: 
L273: `saveImageToPhotosAlbum` API 需要客户端 9.42+。可复用 【14†§3.6】 的 `getBuildVersion` 与 `isClientVersionAtLeast`，以 `9420` 作为最低客户端版本判断。
L274: 
L275: 字段  | 类型  | 必填  | 说明
L276: --- | --- | --- | ---
L277: `filePath`  | string  | 是  | 本地图片：`data:` base64 或 `writeTempFile` 返回的路径；不支持 `http(s)://` 网络地址
L278: 
L279:     `// Canvas 导出直接保存
L280:     const dataUrl = canvas.toDataURL("image/png");
L281:     await window.xhs.miniTool.saveImageToPhotosAlbum({ filePath: dataUrl });`
L282:   * 需由用户主动操作（点击等）触发，首次调用可能弹出系统相册权限弹窗；用户拒绝授权会走失败回调。
L283:   * 大图建议先 `writeTempFile` 落成文件再保存，避免超长 base64 上行。
L284: ### 3.5 writeTempFile — base64 转临时文件
L285: 
L286: 把内存里的 base64（Canvas 导出、选图预览结果等）写成容器内的临时文件，换取可传给其他 JS API 的 `filePath`。
L287: 字段  | 类型  | 必填  | 说明
L288: --- | --- | --- | ---
L289: `data`  | string  | 是  | base64 数据（支持带 `data:` 前缀的 data URI）
L290: `filePath`（返回）  | string  | —  | 写入后的临时文件路径
L291: 
L292:     `const { filePath } = await window.xhs.miniTool.writeTempFile({
L293:       data: canvas.toDataURL("image/png"),
L294:     });
L295: 
L296:     await window.xhs.miniTool.saveImageToPhotosAlbum({ filePath });
L297:     // 或带入发布页
L298:     await window.xhs.miniTool.postNote({
L299:       mediaInfo: { image_resources: [{ url: filePath }] },
L300:     });`
L301:   * 返回的是临时文件，不保证长期有效，请即用即弃，不要持久化保存该路径。
L302:   * 仅支持常见图片 / 视频类型（png、jpeg、webp、gif、mp4），其他类型会失败。
L303: ### 3.6 客户端版本判断
L304: 
L305: 💡
L306: 
L307: `buildVersion` 的末 3 位是编译 / 打包序号，判断客户端版本时必须忽略。 例如 `9462004` 表示客户端 `9.46.2`、编译序号 `004`。
L308: `window.xhs`、`launchOptions`、`miniToolEnv` 和 `buildVersion` 都可能缺失，同步读取时必须逐级判空。同步值不存在时， 在确认 `window.xhs.miniTool.getLaunchOptions` 是函数后，再异步获取客户端值。 两种方式都无法取到版本号时，按不支持 Storage JS API 处理。
L309: 
L310:     `function readBuildVersion(launchOptions) {
L311:       const miniToolEnv = launchOptions && launchOptions.miniToolEnv;
L312:       return Number(miniToolEnv && miniToolEnv.buildVersion) || 0;
L313:     }
L314: 
L315:     async function getBuildVersion() {
L316:       const xhs = window.xhs;
L317:       const syncBuildVersion = readBuildVersion(xhs && xhs.launchOptions);
L318:       if (syncBuildVersion) return syncBuildVersion;
L319: 
L320:       const miniTool = xhs && xhs.miniTool;
L321:       if (!miniTool || typeof miniTool.getLaunchOptions !== "function") return 0;
L322: 
L323:       try {
L324:         const launchOptions = await miniTool.getLaunchOptions();
L325:         return readBuildVersion(launchOptions);
L326:       } catch (error) {
L327:         return 0;
L328:       }
L329:     }
L330: 
L331:     function getClientVersion(buildVersion) {
L332:       // 例如 9462004 / 1000 取整后为 9462，即客户端 9.46.2
L333:       return Math.floor(buildVersion / 1000);
L334:     }
L335: 
L336:     function isClientVersionAtLeast(buildVersion, minimumClientVersion) {
L337:       return getClientVersion(buildVersion) >= minimumClientVersion;
L338:     }`
L339: ### 3.7 Storage — 小工具本地缓存
L340: 
L341: 💡
L342: 客户端满足 【14†§3.6】 的版本条件时，使用 Storage JS API 持久化业务数据。 未满足版本条件时可按需降级到浏览器存储，但必须容忍写入失败或数据丢失。
L343: 
L344:     `const STORAGE_MIN_CLIENT_VERSION = 9460; // 客户端 9.46.0
L345: 
L346:     async function setLocalData(key, data) {
L347:       let serializedData;
L348:       try {
L349:         serializedData = JSON.stringify(data);
L350:       } catch (error) {
L351:         return false;
L352:       }
L353:       if (typeof serializedData !== "string") return false;
L354: 
L355:       const buildVersion = await getBuildVersion();
L356:       const miniTool = window.xhs && window.xhs.miniTool;
L357: 
L358:       if (
L359:         isClientVersionAtLeast(buildVersion, STORAGE_MIN_CLIENT_VERSION) &&
L360:         miniTool &&
L361:         typeof miniTool.setStorage === "function"
L362:       ) {
L363:         try {
L364:           await miniTool.setStorage({ key, data: serializedData });
L365:           return true;
L366:         } catch (error) {
L367:           return false;
L368:         }
L369:       }
L370: 
L371:       // 仅用于兼容低版本客户端；容器不保证其可用性或持久性
L372:       try {
L373:         localStorage.setItem(key, serializedData);
L374:         return true;
L375:       } catch (error) {
L376:         return false;
L377:       }
L378:     }`
L379: 调用方必须处理 `setLocalData` 返回 `false` 的情况， 不能假设数据已成功持久化。
L380: 
L381: API  | 参数  | 结果 / 说明
L382: --- | --- | ---
L383: `setStorage`  | `key: string`、`data: string`、`encrypt?: boolean`  | 写入或覆盖缓存；`data` 必须是 JSON 字符串
L384: `getStorage`  | `key: string`、`encrypt?: boolean`  | 返回 `{ data }`；`data` 为 JSON 字符串，`encrypt` 须与写入时一致
L385: `getStorageInfo`  | 无  | 返回 `{ keys, usedBytes, limitBytes }`；`usedBytes` 为已用容量，`limitBytes` 为容量上限，单位均为字节
L386: `removeStorage`  | `key: string`  | 删除指定缓存
L387: `clearStorage`  | 无  | 清空当前小工具的全部缓存
L388:   * 单个 key 最大 1 MB，当前小工具全部缓存最大 10 MB。
L389:   * `data` 只支持 JSON 字符串。对象、数组等数据必须先用 `JSON.stringify` 序列化；读取后再用 `JSON.parse` 解析。
L390:   * `encrypt` 默认为 `false`；读取时必须与写入时保持一致。
L391:   * 这些 API 同时支持 Promise 与 `success` / `fail` / `complete` 回调。
L392: 
L393:     `await window.xhs.miniTool.setStorage({
L394:       key: "profile",
L395:       data: JSON.stringify({ nickname: "小红薯" }),
L396:     });
L397: 
L398:     const { data } = await window.xhs.miniTool.getStorage({ key: "profile" });
L399:     const profile = data === null ? null : JSON.parse(data);
L400:     const { keys, usedBytes, limitBytes } = await window.xhs.miniTool.getStorageInfo();
L401: 
L402:     await window.xhs.miniTool.removeStorage({ key: "profile" });
L403:     await window.xhs.miniTool.clearStorage();`
L404: ### 3.8 文件系统
L405: 
L406: 💡
L407: 
L408: 文件系统 API 需要客户端 9.49+。可复用 【14†§3.6】 的 `getBuildVersion` 与 `isClientVersionAtLeast`，以 `9490` 作为最低客户端版本判断。
L409: 
L410: 文件和二进制数据使用文件系统保存。持久目录根路径由 `launchOptions.miniToolEnv.userDataPath` 提供；请只在该路径后拼接相对路径， 不要硬编码、解析或改写端上返回的文件句柄。
L411: API  | 参数  | 结果 / 说明
L412: --- | --- | ---
L413: `saveFile`  | `tempFilePath: string`、`filePath?: string | null`  | 将临时文件移动到持久目录，返回 `{ savedFilePath }`
L414: `writeFile`  | `filePath: string`、`data: string`、`encoding: "utf8" | "base64"`  | 覆盖写入，返回 `{ writtenBytes }`
L415: `appendFile`  | `filePath: string`、`data: string`、`encoding: "utf8" | "base64"`  | 向文件末尾追加，返回 `{ writtenBytes }`
L416: `readFile`  | `filePath: string`、`encoding: "utf8" | "base64"`、`position?: number`、`length?: number`  | 读取一个文件分片，返回 `{ data, bytesRead, eof }`
L417: `readDir`  | `dirPath: string`  | 读取目录直接子项，返回 `{ files, truncated }`
L418: `statFile`  | `filePath: string`  | 读取文件或目录信息，返回 `{ size, lastModified, isDir }`
L419: `unlink`  | `filePath: string`  | 删除持久目录中的文件
L420: `mkdir`  | `dirPath: string`、`recursive?: boolean`  | 创建持久文件目录
L421: `getFileStorageInfo`  | 无  | 返回 `{ usedBytes, limitBytes, fileCount, tmpUsedBytes, writeChunkMaxBytes, readChunkMaxBytes }`
L422: 
L423:     `const miniTool = window.xhs && window.xhs.miniTool;
L424:     const launchOptions = await miniTool.getLaunchOptions();
L425:     const userDataPath = launchOptions.miniToolEnv.userDataPath;
L426:     const filePath = userDataPath + "/drafts/note.json";
L427: 
L428:     await miniTool.writeFile({
L429:       filePath,
L430:       data: JSON.stringify({ title: "草稿" }),
L431:       encoding: "utf8",
L432:     });
L433: 
L434:     const { data } = await miniTool.readFile({
L435:       filePath,
L436:       encoding: "utf8",
L437:     });`
L438:   * `writeFile` 覆盖写入，`appendFile` 追加写入。大文件由业务自行分片：第一片用 `writeFile`，后续片串行调用 `appendFile`。
L439:   * 分片大小以 `getFileStorageInfo` 返回的 `writeChunkMaxBytes` 和 `readChunkMaxBytes` 为准，不要硬编码。
L440:   * 图片和视频渲染时直接使用文件句柄作为 `img.src`、`video.src` 或 CSS 资源；需要文件字节时才使用 `readFile`。
L441:   * `usr` 是本地工作区而非备份空间。它不随容器关闭清空，但卸载、清数据或包清理后仍可能丢失，重要数据应可重建或引导用户导出。
L442: ### 3.9 interactionOpenApi — 发布评论
L443: 
L444: 💡
L445: 
L446: 评论区能力需要客户端 9.49+，并应由用户点击等主动操作触发。
L447: 
L448: 用于唤起评论区并携带评论草稿；草稿字段遵循评论侧契约。容器会统一关闭小工具后再拉起评论区。
L449: 字段  | 类型  | 必填  | 说明
L450: --- | --- | --- | ---
L451: `payload`  | object  | 是  | 评论草稿；由评论侧定义字段
L452: `payload.action`  | string  | 按评论侧契约  | 发布评论时使用 `post_comment`
L453: `payload.content`  | string  | 否  | 评论文本
L454: `payload.media_bean`  | array  | 否  | 有序图片列表；媒体路径使用本地文件句柄
L455: `payload.miniToolSnapshotInfo`  | string  | 否  | 小工具附加状态的 JSON 字符串，最大 2KB；超限时该字段无效
L456: `saveToAlbum`  | boolean  | 否  | 是否将 payload 中的图片同步保存到相册，默认 `true`
L457: 
L458:     `const result = await window.xhs.miniTool.interactionOpenApi({
L459:       payload: {
L460:         action: "post_comment",
L461:         content: "快来和我 PK！",
L462:         media_bean: [{
L463:           media_type: "image",
L464:           cover_image_url: imageFilePath,
L465:         }],
L466:         miniToolSnapshotInfo: JSON.stringify({ page: "result" }),
L467:       },
L468:       saveToAlbum: true,
L469:     });
L470: 
L471:     // { routed, savedToAlbum, albumFailReason? }`
L472:   * 目前仅支持图片，使用 `{ media_type: "image", cover_image_url }`；视频和实况图不支持。
L473:   * 媒体路径必须是容器可访问的本地文件句柄；网络 URL、`data:` URI 和绝对路径不可用。
L474:   * `miniToolSnapshotInfo` 有效时，用户从评论区重新打开小工具可读取该数据，用于恢复对应业务状态；恢复逻辑由开发者自行实现。
L475:   * `routed` 表示评论侧路由是否成功。请求保存相册但失败时，失败原因会通过可选字段 `albumFailReason` 返回。
L476: ### 3.10 AI 文本生成（内测）
L477: 
L478: ✨
L479: 
L480: 平台已提供对话模型。无需 API key、自定义模型服务地址或 token 费用。 AI 能力仅在小红书 App 小工具容器中有效；内测阶段需先在群内提交 uid，由平台为对应 appId 加白。 未加白时调用会返回 `AI_NOT_ALLOWED`。
L481: 经典脚本通过 `window.xhs.AI` 创建模型，再调用 `generateText()`。本期仅支持非流式文本生成，回复会整段一次性返回。
L482: 
L483:     `const ai = window.xhs && window.xhs.AI;
L484:     if (!ai) {
L485:       // 提示用户在支持该能力的小红书 App 中打开
L486:       return;
L487:     }
L488: 
L489:     const model = ai.createModel("deepseek-v4-flash");
L490:     const result = await model.generateText({
L491:       messages: [
L492:         { role: "system", content: "你是一位简洁、友好的灵感助手。" },
L493:         { role: "user", content: userInput },
L494:       ],
L495:     });
L496: 
L497:     const text = (result.choices &&
L498:       result.choices[0] &&
L499:       result.choices[0].message &&
L500:       result.choices[0].message.content) || "";`
L501: #### 模型与参数
L502: 
L503: 项  | 说明
L504: --- | ---
L505: `deepseek-v4-flash`  | 默认推荐；通用对话能力，遵循人设指令，表现稳定
L506: `dots-3-note-prev`  | 小红书自研“点点”模型，自带点点人格和小红书调性
L507: `messages`  | 最多 40 条、总计最多 12000 字符；`role` 使用 `system` / `user` / `assistant`
L508: `max_output_tokens`  | 最大 2048；超出时自动收敛
L509: `temperature`  | 范围 0–1.5
L510: #### 有记忆的对话页
L511: 平台不会保存会话上下文。页面内用数组维护 `messages`，每次调用全量传入； 只保留 system prompt 和最近十几轮。需要下次打开继续聊时，使用 §3.7 的 `setStorage` / `getStorage` 保存裁剪后的历史。
L512: 
L513:     `const messages = [
L514:       { role: "system", content: "你是一位小红书文案灵感助手。" },
L515:     ];
L516:     const model = window.xhs.AI.createModel("deepseek-v4-flash");
L517: 
L518:     async function sendMessage(content) {
L519:       messages.push({ role: "user", content });
L520:       sendButton.disabled = true;
L521:       loadingBubble.hidden = false;
L522: 
L523:       try {
L524:         const result = await model.generateText({
L525:           messages: [messages[0]].concat(messages.slice(1).slice(-20)),
L526:           max_output_tokens: 800,
L527:           temperature: 0.8,
L528:         });
L529:         const reply = (result.choices &&
L530:           result.choices[0] &&
L531:           result.choices[0].message &&
L532:           result.choices[0].message.content) || "";
L533: 
L534:         messages.push({ role: "assistant", content: reply });
L535:         answerElement.textContent = reply; // 模型输出仅按纯文本渲染
L536:         await window.xhs.miniTool.setStorage({
L537:           key: "ai-chat-history",
L538:           data: JSON.stringify([messages[0]].concat(messages.slice(1).slice(-20))),
L539:         });
L540:         console.log("AI request_id:", result.request_id);
L541:       } finally {
L542:         loadingBubble.hidden = true;
L543:         sendButton.disabled = false;
L544:       }
L545:     }`
L546: ⚠️
L547: 
L548: 配额与内容安全：内测期每个用户每天最多调用 100 次；次数用完返回 `AI_QUOTA_EXCEEDED`。system prompt、用户输入和模型输出都会经过内容审核，命中时返回 `AI_CONTENT_BLOCKED`。成功响应包含 `request_id`，排查问题时请一并提供。 `choices` 可能为空，业务必须处理空结果。
L549: #### 已有外部模型怎么迁移
L550: 
L551:   1. 移除小工具包内的 API key 和自定义模型 URL，避免密钥泄漏。
L552:   2. 保留现有 prompt、人设、交互和消息裁剪，只把模型调用替换为 `window.xhs.AI`。
L553:   3. 真机调用后检查成功响应的 `request_id`，或确认收到平台 AI 错误码，以判断链路已经接通。
L554: 
L555: ### 3.11 getWindowInfo — 获取窗口信息
L556: 
L557: 💡
L558: 
L559: 需要客户端 9.49+，以 `9490` 作为最低客户端版本判断，方法见 【14†§3.6】。
L560: 
L561: 获取容器当前的窗口尺寸、安全区和顶部按钮位置，用于页面布局与原生按钮避让。
L562: 
L563: 调用：`getWindowInfo(options?)`。参数：无。 这是异步接口，Promise / 回调与通用结果遵循 【9†§3.1】。
L564: #### 成功结果
L565: 
L566: 💡
L567: 
L568: 尺寸与坐标使用逻辑像素（Android 为 dp，iOS 为 pt），保留小数。 `pixelRatio` 是无单位的像素比。
L569: 
L570: 字段  | 类型  | 说明
L571: --- | --- | ---
L572: `pixelRatio`  | number  | 设备像素比 DPR，无单位
L573: `screenWidth` / `screenHeight`  | number  | 屏幕或当前承载窗口的逻辑宽高；分屏、折叠屏下不能假定为整块物理屏尺寸
L574: `windowWidth` / `windowHeight`  | number  | 容器实际页面视口的逻辑宽高
L575: `statusBarHeight`  | number  | 状态栏的逻辑高度
L576: `screenTop`  | number  | 容器顶部相对所在屏幕或承载窗口原点的 y 坐标
L577: `safeArea`  | object  | 安全区域矩形，结构见下文
L578: `menuButtons`  | object  | 始终存在，包含 `back` / `me` / `share`； 各按钮值为矩形对象，不可见时为 `null`
L579: 矩形对象包含 `left` / `top` / `right` / `bottom` / `width` / `height`， 均为 number，使用上述逻辑像素单位。`safeArea` 和按钮矩形均使用 容器坐标系，以容器左上角为原点。`right` / `bottom` 表示坐标，满足 `left + width = right`、 `top + height = bottom`。
L580: 
L581:     `async function readWindowInfo() {
L582:       const miniTool = window.xhs && window.xhs.miniTool;
L583:       if (!miniTool || typeof miniTool.getWindowInfo !== "function") return;
L584: 
L585:       try {
L586:         const info = await miniTool.getWindowInfo();
L587:         console.log("容器逻辑尺寸", info.windowWidth, info.windowHeight);
L588:         console.log("安全区域", info.safeArea);
L589: 
L590:         const shareButton = info.menuButtons && info.menuButtons.share;
L591:         if (shareButton) {
L592:           console.log("分享按钮区域", shareButton);
L593:         }
L594:         return info;
L595:       } catch (err) {
L596:         console.log(err.errMsg || err.message);
L597:       }
L598:     }
L599: 
L600:     readWindowInfo();`
L601:   * 按返回的容器尺寸和矩形布局，避免硬编码状态栏高度、安全区或按钮位置。
L602:   * 读取顶部按钮前判断是否为 `null`；按钮隐藏时无需为其避让。
L603:   * 窗口形态或尺寸变化后，需要最新值时再次调用。
L604: ### 3.12 getLocation — 获取单次定位
L605: 
L606: 💡
L607: 
L608: 需要客户端 9.49+，以 `9490` 作为最低客户端版本判断，方法见 【14†§3.6】。
L609: 
L610: 通过客户端获取一次定位。调用：`getLocation(options?)`， Promise / 回调与通用结果遵循 【9†§3.1】。
L611: 
L612: 字段  | 类型  | 必填  | 说明
L613: --- | --- | --- | ---
L614: `type`  | string  | 否  | `wgs84`（GPS 坐标）或 `gcj02`（地图坐标）； 未传由客户端默认行为决定，地图场景显式传 `gcj02`
L615: #### 成功结果
L616: 
L617: 除通用 `errMsg` 外，以下业务字段均可选，使用前先检查是否返回。
L618: 
L619: 字段  | 类型  | 必有  | 说明
L620: --- | --- | --- | ---
L621: `latitude`  | number  | 否  | 纬度，范围 [-90, 90]
L622: `longitude`  | number  | 否  | 经度，范围 [-180, 180]
L623: `speed`  | number  | 否  | 速度，单位 m/s
L624: `accuracy`  | number  | 否  | 位置精确度，单位 m
L625: `altitude`  | number  | 否  | 高度，单位 m
L626: `verticalAccuracy`  | number  | 否  | 垂直精度，单位 m；未返回时本次无该精度信息
L627: `horizontalAccuracy`  | number  | 否  | 水平精度，单位 m；未返回时本次无该精度信息
L628: 
L629: 💡
L630: 双端均需兼容字段缺失：未返回的字段读取为 `undefined`，SDK 不会补齐为 `0`。精度字段返回 `0`，也不能据此认定定位完全精确。
L631: 
L632:     `async function locateOnce() {
L633:       const miniTool = window.xhs && window.xhs.miniTool;
L634:       if (!miniTool || typeof miniTool.getLocation !== "function") return;
L635: 
L636:       try {
L637:         const location = await miniTool.getLocation({ type: "gcj02" });
L638:         if (!Number.isFinite(location.latitude) ||
L639:             !Number.isFinite(location.longitude)) {
L640:           console.log("本次定位未返回完整经纬度");
L641:           return;
L642:         }
L643:         if (!Number.isFinite(location.verticalAccuracy)) {
L644:           console.log("本次无垂直精度信息");
L645:         }
L646:         if (!Number.isFinite(location.horizontalAccuracy)) {
L647:           console.log("本次无水平精度信息");
L648:         }
L649: 
L650:         // 精度字段不补成 0，返回 0 也不代表完全精确。
L651:         // 在业务内存中使用原始结果，不打印精确坐标。
L652:         return location;
L653:       } catch (err) {
L654:         console.log(err.errMsg || err.message, err.errCode);
L655:       }
L656:     }
L657: 
L658:     // 由用户发起定位的交互调用 locateOnce()，接收结果后交给业务使用。`
L659:   * 授权、系统定位开关和相关失败由客户端处理，调用方需处理权限拒绝、定位失败等情况。
L660:   * 经纬度可能合法地为 `0`，用有限数检查，避免用真假值判断字段是否存在。
L661:   * 仅获取单次定位，不提供持续定位、后台定位或轨迹监听，避免轮询调用。
L662:   * 精确坐标只交给需要它的业务使用，不写入日志或埋点。
L663: ### 3.13 振动反馈
L664: 
L665: 💡
L666: 
L667: `vibrateShort` / `vibrateLong` 需要客户端 9.50+， 以 `9500` 作为最低客户端版本判断，方法见 【14†§3.6】。
L668: 
L669: 通过 `vibrateShort` / `vibrateLong` 提供触感反馈。 两者均为异步调用，遵循 【9†§3.1】；成功结果无额外业务字段。
L670: 
L671: API  | 参数  | 成功含义
L672: --- | --- | ---
L673: `vibrateShort({ type })`  | `type` 必填，指定短振动强度  | 已触发反馈，不表示振动已经结束
L674: `vibrateLong(options?)`  | 无  | 已触发反馈，不表示振动已经结束
L675: #### 短振动参数
L676: 字段  | 类型  | 必填  | 说明
L677: --- | --- | --- | ---
L678: `type`  | string  | 是  | `heavy` 重 / `medium` 中 / `light` 轻； 无默认值
L679: 
L680:     `async function shortFeedback() {
L681:       const miniTool = window.xhs && window.xhs.miniTool;
L682:       if (!miniTool || typeof miniTool.vibrateShort !== "function") return;
L683: 
L684:       try {
L685:         await miniTool.vibrateShort({ type: "medium" });
L686:         // 调用成功不表示振动已经结束。
L687:       } catch (err) {
L688:         console.log(err.errMsg || err.message);
L689:       }
L690:     }
L691: 
L692:     async function longFeedback() {
L693:       const miniTool = window.xhs && window.xhs.miniTool;
L694:       if (!miniTool || typeof miniTool.vibrateLong !== "function") return;
L695: 
L696:       try {
L697:         await miniTool.vibrateLong();
L698:         // 调用成功不表示振动已经结束。
L699:       } catch (err) {
L700:         console.log(err.errMsg || err.message);
L701:       }
L702:     }
L703: 
L704:     // 短振、长振分别由相应的用户交互调用 shortFeedback() / longFeedback()。`
L705:   * 无需申请运行时系统权限，建议结合用户交互使用并避免高频触发。
L706:   * 无马达或系统关闭触感反馈时，调用可能成功但无体感；不同强度的实际效果也受设备影响。
L707:   * 不支持自定义时长、波形或数值强度，长振动不承诺精确持续时长。
L708: ### 3.14 陀螺仪
L709: 
L710: 💡
L711: 
L712: 陀螺仪采集与监听接口均需要客户端 9.50+，以 `9500` 作为最低客户端版本判断，方法见 【14†§3.6】。
L713: 
L714: 获取设备绕各轴旋转的角速度。采集启停与数据监听各自独立：先注册监听，再开始采集； 业务结束时停止采集并解除监听。
L715: 
L716: API  | 参数  | 返回与职责
L717: --- | --- | ---
L718: `startGyroscope(options?)`  | `interval` 可选，见下表  | 异步开始采集，遵循 【9†§3.1】
L719: `stopGyroscope(options?)`  | 无  | 异步停止采集，遵循 【9†§3.1】，保留监听
L720: `onGyroscopeChange(callback)`  | 必填函数  | 同步注册监听，返回 `undefined`；不启动采集
L721: `offGyroscopeChange(callback?)`  | 可选函数  | 同步解除监听，返回 `undefined`；不停止采集
L722: #### 采样参数
L723: 
L724: `startGyroscope` 的 `interval` 为可选 string， 默认 `normal`。以下为采样档位，实际事件到达间隔受设备和运行状态影响。
L725: 
L726: interval  | 采样间隔  | 默认
L727: --- | --- | ---
L728: `ui`  | 60 ms  | 否
L729: `normal`  | 200 ms  | 是
L730: #### 监听数据
L731: 
L732: `callback(frame)` 每次收到一帧 `{ x, y, z }`， 不带 `errMsg`；各字段表示角速度，不是姿态角。 `startGyroscope` / `stopGyroscope` 的成功结果无额外业务字段。
L733: 字段  | 类型  | 单位  | 说明
L734: --- | --- | --- | ---
L735: `x`  | number  | rad/s  | 绕 X 轴的角速度
L736: `y`  | number  | rad/s  | 绕 Y 轴的角速度
L737: `z`  | number  | rad/s  | 绕 Z 轴的角速度
L738: 
L739:     `function handleGyroscopeChange(frame) {
L740:       // frame.x / frame.y / frame.z：角速度，单位 rad/s。
L741:       // 在此更新业务状态，避免逐帧执行重任务。
L742:     }
L743: 
L744:     function hasGyroscopeApi() {
L745:       const miniTool = window.xhs && window.xhs.miniTool;
L746:       return !!miniTool &&
L747:         ["startGyroscope", "stopGyroscope",
L748:          "onGyroscopeChange", "offGyroscopeChange"].every(function (name) {
L749:           return typeof miniTool[name] === "function";
L750:         });
L751:     }
L752: 
L753:     async function startMotion() {
L754:       if (!hasGyroscopeApi()) return;
L755:       try {
L756:         miniTool.onGyroscopeChange(handleGyroscopeChange);
L757:         await miniTool.startGyroscope({ interval: "ui" });
L758:       } catch (err) {
L759:         miniTool.offGyroscopeChange(handleGyroscopeChange);
L760:         console.log(err.errMsg || err.message);
L761:       }
L762:     }
L763:     async function stopMotion() {
L764:       if (!hasGyroscopeApi()) return;
L765:       try {
L766:         await miniTool.stopGyroscope();
L767:       } catch (err) {
L768:         console.log(err.errMsg || err.message);
L769:       } finally {
L770:         miniTool.offGyroscopeChange(handleGyroscopeChange);
L771:       }
L772:     }`
L773: 由单一业务管理上述示例的启停，按交互串行调用 `startMotion()` / `stopMotion()`，前一次操作结束后再执行下一次。业务结束时主动清理， 不依赖页面卸载阶段的异步调用完成。
L774: 
L775:   * `stopGyroscope()` 只停止采集，保留已注册的监听，再次开始后原监听继续收帧； 未开始时调用停止可正常成功。
L776:   * 同一函数引用重复注册会去重；`offGyroscopeChange(callback)` 移除对应监听， `offGyroscopeChange()` 清空全部监听。
L777:   * `on/off` 不接受 `success` / `fail` / `complete`，不返回 Promise；非法回调参数会同步抛出 `TypeError`。
L778:   * 设备无陀螺仪等不支持情况通过开始采集失败暴露，`errCode` 为 `10002`。
L779:   * 已启动的采集在后台或页面隐藏时暂停，回前台自动续采。
L780:   * 多个组件共享陀螺仪时，统一协调采集启停，各组件只移除自己的监听。
L781: ### 3.15 关注作者
L782: 
L783: 💡
L784: 
L785: 关注 API 需要客户端 9.51+，可复用 【14†§3.6】 的版本判断方式， 以 `9510` 作为最低客户端版本判断值。
L786: 
L787: 通过 `window.xhs.miniTool` 上的 `followAuthor` 引导关注当前小工具作者，并用 `getFollowStatus` 查询关注关系。两个方法都没有业务入参， 关注对象由平台绑定当前小工具作者，不能指定其他用户 ID。成功结果遵循 【9†§3.1】 的 Promise / 回调约定，并通过 `follow_status` 表达关注状态。
L788: API  | 参数  | 结果与说明
L789: --- | --- | ---
L790: `followAuthor(options?)`  | 无业务参数；`options` 可省略，用于传入可选回调  | 拉起平台关注确认流程。成功时返回 `follow_status`： `1` 已关注、`2` 作者本人、`-1` 操作失败； 已关注或当前用户是作者本人时可直接返回状态，不一定弹窗。
L791: `getFollowStatus(options?)`  | 无业务参数；`options` 可省略，用于传入可选回调  | 幂等查询当前用户与作者的关注关系。查询失败通过 `follow_status: -1` 返回，不走 fail / reject；失败结果不缓存， 后续调用会重新查询。
L792: 
L793: follow_status  | 说明
L794: --- | ---
L795: `-1`  | 接口失败（关注操作失败或查询失败）
L796: `0`  | 未关注（包括未登录）
L797: `1`  | 已关注，互相关注也归为此状态
L798: `2`  | 当前用户是小工具作者本人
L799: `followAuthor` 在交互取消或受频控限制时会 reject / 触发 `fail`：`errCode: 20002` 表示用户关闭确认框（包括点击蒙层） 或放弃登录， `15404` 表示关注引导达到频次上限：同一账号对同一工具每天最多展示 10 次确认框，第 11 次调用会被频控拦截，次数按自然日重置；已关注或作者本人等不弹窗的调用不计数。 确认流程尚未结束时重复调用，会以 `10003` 失败。关注接口本身执行失败则 resolve， 通过 `follow_status: -1` 表达。使用 `getFollowStatus` 时，查询业务失败同样 resolve 为 `follow_status: -1`。
L800: 以下示例用两个页面元素显示状态并触发关注，可按页面结构调整：
L801: 
L802:     `<button id="followButton" type="button">关注作者</button>
L803:     <span id="followStatus" aria-live="polite"></span>`
L804: 
L805:     `const followButton = document.getElementById("followButton");
L806:     const followStatusText = document.getElementById("followStatus");
L807:     let currentFollowStatus = -1;
L808:     let followPending = false;
L809: 
L810:     function renderFollowStatus(status) {
L811:       currentFollowStatus = status;
L812:       if (followStatusText) {
L813:         const labels = {
L814:           "-1": "暂时无法获取关注状态",
L815:           "0": "未关注",
L816:           "1": "已关注",
L817:           "2": "作者本人",
L818:         };
L819:         followStatusText.textContent = labels[String(status)] || "未知状态";
L820:       }
L821:       if (followButton) {
L822:         followButton.disabled = followPending || (status === 1 || status === 2);
L823:       }
L824:     }
L825: 
L826:     async function refreshFollowStatus() {
L827:       const miniTool = window.xhs && window.xhs.miniTool;
L828:       if (!miniTool || typeof miniTool.getFollowStatus !== "function") return;
L829: 
L830:       try {
L831:         const result = await miniTool.getFollowStatus();
L832:         // -1 查询失败；0 未关注；1 已关注（含互关）；2 作者本人。
L833:         renderFollowStatus(result.follow_status);
L834:       } catch (err) {
L835:         // 处理调用层异常；查询业务失败会通过 follow_status = -1 返回。
L836:         console.log(err.errMsg || err.message);
L837:       }
L838:     }
L839: 
L840:     async function onFollowClick() {
L841:       const miniTool = window.xhs && window.xhs.miniTool;
L842:       if (!miniTool || typeof miniTool.followAuthor !== "function" || followPending) return;
L843:       let followNotice = "";
L844:       followPending = true;
L845:       renderFollowStatus(currentFollowStatus);
L846:       try {
L847:         const result = await miniTool.followAuthor();
L848:         renderFollowStatus(result.follow_status);
L849:       } catch (err) {
L850:         if (err.errCode === 20002) return; // 用户关闭确认框或拒绝授权。
L851:         if (err.errCode === 15404) {
L852:           followNotice = "今日关注引导次数已达上限";
L853:           return;
L854:         }
L855:         if (err.errCode === 10003) return; // 关注确认流程仍在进行。
L856:         console.log(err.errMsg || err.message);
L857:       } finally {
L858:         followPending = false;
L859:         renderFollowStatus(currentFollowStatus);
L860:         if (followNotice && followStatusText) {
L861:           followStatusText.textContent = followNotice;
L862:         }
L863:       }
L864:     }
L865: 
L866:     if (followButton) {
L867:       followButton.addEventListener("click", onFollowClick);
L868:     }
L869: 
L870:     refreshFollowStatus();
L871:     `
L872:   * 两个方法均只针对当前小工具作者；不能通过传入用户 ID 改为关注或查询其他用户。
L873:   * 查询关注状态可用于刷新自绘关注按钮；`follow_status: -1` 表示暂时无法确认状态，可由后续查询重试。
L874:   * 未登录时查询返回 `follow_status: 0`。已登录用户在小红书 App 的其他入口取关后，进程内缓存可能使查询暂时返回旧状态；App 重启后再查会读取更新后的关注状态。
L875: ## 04不可用能力
L876: 
L877: 以下 Web API 与行为在容器内已被禁用，调用会失败（抛出异常、返回空值或被拦截），请勿使用。 定位、陀螺仪可使用 【8†§3】 列出的平台 JS API。
L878: ### 4.1 已禁用的 Web API
L879: 分类  | 能力
L880: --- | ---
L881: 定位  | Web 地理定位 `navigator.geolocation`； 单次定位使用平台 【20†`getLocation`】
L882: 剪贴板  | `navigator.clipboard`、`execCommand('copy'/'cut'/'paste')`
L883: 硬件连接  | 蓝牙、USB、HID、串口
L884: 传感器  | Web 加速度计、陀螺仪、磁力计、环境光、设备运动 / 朝向； 陀螺仪角速度使用 【22†平台陀螺仪 API】
L885: 实时通信  | WebRTC、WebSocket、EventSource（SSE）
L886: 后台运行  | Web Worker、SharedWorker、Service Worker
L887: 屏幕  | 屏幕共享、全屏 `requestFullscreen`（全屏由容器统一管理）
L888: 设备信息  | 电池状态、网络信息、媒体设备枚举
L889: 存储进阶  | 持久化存储、跨域存储访问
L890: 凭据  | WebAuthn / `navigator.credentials`、Web Locks
L891: 窗口  | `window.open`（弹新窗口）、`window.prompt`
L892: ### 4.2 已禁用的行为
L893: 
L894: 行为  | 说明
L895: --- | ---
L896: 网络请求  | `fetch` / `XMLHttpRequest`、加载外部图片 / 字体 / 媒体等网页联网请求。所有资源须打包在内
L897: 动态执行代码  | `eval()`、`new Function()`
L898: WebAssembly  | WASM 编译执行（依赖 WASM 的库无法运行，见 §5）
L899: iframe  | 页面内嵌 iframe / 被外部页面嵌入
L900: 表单跳转提交  | `<form>` 提交跳转
L901: 插件  | Flash 等浏览器插件
L902: 文件下载  | `a[download]`、blob 下载等；保存图片请用 `saveImageToPhotosAlbum`（见 §3.4）
L903: 打开外链 / 新窗口  | `target="_blank"`、跳转站外
L904: 跳转其他小工具  | 小工具间互相跳转
L905: 长按菜单  | 已禁用
L906: ### 4.3 移动端不支持
L907: 
L908: 以下能力移动端 WebView 本身不支持，无法使用：支付 `PaymentRequest`、系统通知 / 推送、NFC、MIDI、XR / AR / VR、后台同步 / 下载、PWA 安装、窗口管理、指针 / 键盘锁定等。
L909: 
L910: ## 05 WebGL / 图形计算边界
L911: 
L912: 纯 WebGL 渲染可用，但组合能力受限：
L913: 
L914: 场景  | 是否可用
L915: --- | ---
L916: 本地资源 / Canvas / 内存对象作为纹理  | ✅ 可用
L917: 外部域名图片作为纹理  | 🔴 不可用（不支持网络请求，纹理须打包在内）
L918: 依赖 WASM 的加速库（如 Draco / Basis / ONNX / 抠图算法库）  | 🔴 不可用
L919: 依赖 Worker 的离屏渲染（OffscreenCanvas + Worker）  | 🔴 不可用
L920: SharedArrayBuffer 多线程  | 🔴 不可用
L921: 
L922: WebGL 适合用打包在小工具内的资源做本地渲染。§3.10 的平台 AI 仅提供文本生成； AI 图像处理等重计算场景仍无法支持（既不能联网调用外部模型，也不能运行 WASM 模型）。
L923: ## 06常见问题 FAQ
L924: 
L925: 创作或改写小工具应该从哪里开始？
L926: 
L927: 从小工具上传页开始。在“第一步：调整为符合小红书规范的代码格式”中完整复制改写口令， 发送给工作区内的 AI 助手执行。口令会指导 AI 下载当前版本 Skill、读取 `SKILL.md`、校验和修复代码并打包；不要只把本页能力清单当作改写提示词。
L928: 
L929: `<input type="file" accept="video/*">` 为什么只能选图片？
L930: 
L931: 出于安全考虑，文件选择仅支持图片和视频，无论 accept 如何设置，此限制不可更改。
L932: 
L933: 页面里的 `<script>` 不执行 / 报 CSP 错误？
L934: 
L935: 容器禁止内联脚本与行内事件处理器（`onclick="..."`）。请把 JS 放进包内 `.js` 文件用 `<script src="./app.js">` 引入，事件用 `addEventListener` 绑定。详见 §2.6。
L936: 
L937: 能不能请求我自己的服务端接口 / 加载线上图片？
L938: 网页不能通过 `fetch`、`XMLHttpRequest` 等方式请求外部服务，线上资源也不能直接加载。 页面、脚本、图片、字体和静态数据必须打包在小工具内。
L939: 
L940: 需要服务端实时推送怎么办？
L941: 
L942: 不支持 WebSocket / SSE / WebRTC 或通过 `fetch` 轮询自建服务。 当前平台 AI 仅支持 §3.10 的非流式文本生成。
L943: 
L944: 第三方库报安全错误 / 无法运行？
L945: 
L946: 多半命中了 §4。请排查是否用到了 `eval`、WebAssembly、Worker，或发起了网络请求，改用容器允许的等价方案。
L947: 
L948: 怎么把小工具生成的图片保存到相册 / 发成笔记？
L949: 
L950: 用容器注入的 JS API：`writeTempFile` 把 base64 换成 `filePath`，再传给 `saveImageToPhotosAlbum` 或 `postNote`。详见 §3。
L951: 
L952: 小工具能不能直接做 AI 对话、文案生成或灵感助手？
L953: 
L954: 可以。使用 `window.xhs.AI` 调用平台对话模型，无需 API key 或自建服务。 当前是非流式文本生成，内测阶段需先完成 appId 加白；接入与限制见 §3.10。
L955: `window.xhs` 是 `undefined`？
L956: 
L957: 说明当前环境未注入平台能力（如在普通浏览器中预览）。请按需检查 `window.xhs && window.xhs.miniTool` 或 `window.xhs && window.xhs.AI`，并为无 SDK 环境提供降级路径。
L958: 
L959: JS API 传网络图片地址为什么失败？
L960: 
L961: 容器不联网，媒体字段只接受 `data:` base64 或 `writeTempFile` 返回的本地路径。
L962: 
L963: 能不能调用文档里没列出的其他原生能力？
L964: 
L965: 不能。§3.2 列出的即为全部可用 JS API，未列出的能力不受支持。
L966: 
L967: © 小红书 · 小工具容器 · 能力清单
