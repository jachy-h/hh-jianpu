# @hh-jianpu/beat-visualizer

独立节拍可视化组件。支持 2/4、3/4、4/4，BPM 以四分音符为单位。

```tsx
import { BeatVisualizer, createBeatClock } from '@hh-jianpu/beat-visualizer';
const clock = createBeatClock({ bpm: 120, now: () => performance.now() });
clock.play();
<BeatVisualizer meter={{ beatsPerBar: 4, beatUnit: 4 }} source={clock} mode="conducting" />;
```

外部时钟可实现 `BeatSource`，`read` 返回连续拍位置，`subscribe` 在状态和跳转变化时通知。`/core` 入口只包含纯计算与时钟，不依赖 React。
