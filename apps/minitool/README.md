# 哈哈简谱 · 随身谱本

只读播放共享内置曲谱的小红书 H5。首版提供分类选曲、谱面、高亮、变速、节拍器、0/4/8 预备拍、A/B 小节循环与双声部静音。

在仓库根目录执行（CI 使用 pnpm 9.15.9，本地启动使用当前已安装版本）：

```sh
pnpm dev:minitool
pnpm build:minitool
pnpm audit:minitool
pnpm package:minitool
```

H5 开发地址是 `http://127.0.0.1:5174`；Web 为 `pnpm dev`，地址 `http://127.0.0.1:5173`。同时开发使用 `pnpm dev:all`，共用一组共享包监听。端口占用时可用 `pnpm dev:minitool --port 5184`；按 Ctrl+C 会停止本次开发任务。

正式包位于 `artifacts/hh-jianpu-minitool-v0.8.0.zip`，校验摘要在同级。不要直接压缩本目录或使用 Web 网站 dist。

`pnpm probe:minitool` 构建独立音频实验；`node scripts/package-minitool.mjs --probe` 打包实验。实验用于确认容器中的音频激活、长音、停止和再次播放。开发服务器的 `/tests/audio-validation.html` 提供真实 OfflineAudioContext 持续/变速渲染检查，`/tests/responsive.html` 提供固定尺寸布局检查，均不包含在生产包中。

客户端满足条件时使用小红书 Storage 保存资源 ID 和偏好，旧版回退浏览器存储；不保存资源源码或个人曲谱。平台读失败时本次禁用偏好写入，避免覆盖尚未读出的既有数据。源码维护在 `packages/score-library/resources/scores`。

静态包校验和普通浏览器检查不能替代容器验收。请将同一 ZIP 上传创服平台，在平台模拟器、Android 真机扫码、iOS 真机扫码分别验证完整流程；Chrome 61 兼容性与真机性能在未实测前仍标为未实测。
