import React from 'react';
import TopBar from '../components/Layout/TopBar';
import FeedbackWidget from '../components/Feedback/FeedbackWidget';
import { HELP_PAGE_VERSION, HELP_PAGE_UPDATED_DATE } from '../config';

const HelpPage: React.FC = () => {

  return (
    <div className="h-screen flex flex-col">
      <TopBar
        backTo="/"
        backLabel="返回"
        subtitle={
          <span className="text-base font-semibold text-gray-800 hidden sm:inline">
            📖 简谱语法速查
          </span>
        }
      />

      <main className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* 快速入门 */}
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r">
            <p className="text-gray-800">
              <strong>简谱用数字 1-7 表示音高</strong>（哆来咪发嗦啦西），用空格分隔音符，用{' '}
              <code className="bg-white px-1 rounded">|</code> 分隔小节。
              试试输入{' '}
              <code className="bg-white px-2 py-1 rounded font-mono">1 1 5 5 | 6 6 5 -</code>{' '}
              然后播放！
            </p>
            <p className="mt-2 text-sm text-gray-800">
              预览优先按源码换行，不限制每行固定小节数；宽度不足时才在小节之间自动拆行，字号保持不变。单个小节过宽时可横向滚动。行尾的 |v 不影响下一行的换行位置。
            </p>
          </div>

          <section className="rounded-lg border border-gray-300 bg-gray-50 p-4">
            <h3 className="mb-3 text-xl font-bold text-gray-800">选段与练习</h3>
            <p className="mb-2 text-sm text-gray-800">
              在预览中先点击起点小节 A，再点击终点小节 B，播放会按书写顺序循环包含 A、B 在内的完整区间，忽略区间内谱面反复。再次点击可重新选择；播放器中的清除选段按钮恢复全曲播放及谱面反复。
            </p>
            <p className="mb-2 text-sm text-gray-800">
              播放时预览会跟随当前小节。手动滚动浏览后暂停自动跟随，点击「恢复播放跟随」继续跟随。
            </p>
            <p className="text-sm text-gray-800">
              练习速度可选 0.5× 至 2×，实际播放速度等于曲谱 BPM 乘倍率。倍率独立于源码中的原始 BPM，循环和播放前倒计时使用相同的练习速度。
            </p>
            <p className="mb-2 text-sm text-gray-800">播放条默认使用钢琴音色，也可选择「原声（合成音）」。音色选择会在本浏览器记住；切换时停止当前播放和倒计时。钢琴首次播放需要加载采样，失败后可重试或切换原声。教学钢琴的长音会持续到谱面规定的拍点；播放中调整练习速度，长音结束拍点也会随之调整。</p>
          </section>

          <section className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <h3 className="mb-3 text-xl font-bold text-gray-800">上下双声部联谱</h3>
            <p className="mb-2 text-sm text-gray-800">用 Q[upper] 写旋律、Q[lower] 写伴奏；上下行同时演奏，拍点与小节线对齐，换行时保持一组。可以从首页「上下双声部」示例开始。</p>
            <pre className="mb-2 overflow-x-auto rounded bg-white p-3 text-sm">{"Q[upper] 3/5/ 7/1'/ 1' - |\nQ[lower] 1 0 0 1 |"}</pre>
            <p className="mb-2 text-sm text-gray-800">歌词使用 C[upper]、C[lower]，分别按所属声部从头分配；无词音符用 _ 占位。上下小节数须一致，每小节各自满足拍号，整小节休止请写足 0。双声部语法或时值有误时，先修正再播放或移调。</p>
            <p className="mb-2 text-sm text-gray-800">播放条可分别静音旋律或伴奏；选段循环、练习倍率、倒计时和暂停恢复共用时间轴。点击下声部小节可定位其源码。</p>
            <p className="text-sm text-gray-800">目前每声部支持单音，和弦、琶音及第三声部暂未支持。旧谱的连续 Q / P 行仍顺序演奏，不会自动转成双声部。</p>
          </section>

          <section className="rounded-lg border border-barline bg-paper p-4">
            <h3 className="mb-3 text-xl font-bold text-ink">反复记号</h3>
            <p className="mb-2 text-sm text-ink">用 <code>||:</code> 标记反复段起点，<code>:||</code> 标记终点，整段演奏两遍后继续。只有后反复时从曲首重奏；普通 <code>||</code> 仍是小节线。</p>
            <pre className="mb-2 overflow-x-auto rounded bg-white p-3 text-sm">{"||: 1 2 3 4 | 5 6 7 1' :|| 1' - - - |"}</pre>
            <p className="mb-2 text-sm text-ink">以上按第 1 → 2 → 1 → 2 → 3 小节演奏，BPM 120 时音乐时长为 10 秒。暂停、恢复和变速保留当前遍次；停止后从第一遍开始。</p>
            <p className="text-sm text-ink">支持单小节、多段顺序反复，以及同一边界 <code>:|| ||:</code>。<code>:||:</code> 同时结束上一反复段并开始下一反复段，同一行显示为一条黑线左右各两个反复点；跨行分别显示后反复和前反复记号。前反复自身划分小节并开始新小节，前面无需额外的小节线，且必须有匹配终点；双声部必须在对应边界写相同记号。嵌套、空段、跳房子、指定次数与 D.C./D.S. 暂不支持，出现诊断后需修正才能播放。</p>
          </section>

          <section className="rounded-lg border border-barline bg-paper p-4">
            <h3 className="mb-3 text-xl font-bold text-ink">竹笛入门</h3>
            <p className="text-sm text-ink">首页「竹笛入门」沿用示例曲谱的编辑和播放流程。内置《练习(1)》，打开曲目后可变速、选段和移调，编辑时保存为个人副本。</p>
          </section>

          {/* 完整语法表 */}
          <section>
            <h3 className="text-xl font-bold mb-4 text-gray-800">📋 完整语法对照表</h3>

            {/* 基础音符 */}
            <div className="mb-6">
              <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <span className="bg-blue-500 text-white px-2 py-0.5 rounded text-sm">1</span>
                基础音符
              </h4>
              <table className="w-full border-collapse border border-gray-300 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="border border-gray-300 px-4 py-2 text-left w-32">符号</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">说明</th>
                    <th className="border border-gray-300 px-4 py-2 text-left w-48">示例</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2"><code className="font-mono bg-gray-100 px-2 py-1 rounded">1-7</code></td>
                    <td className="border border-gray-300 px-4 py-2">音符（哆来咪发嗦啦西）</td>
                    <td className="border border-gray-300 px-4 py-2"><code className="font-mono">1 2 3 4 5 6 7</code></td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2"><code className="font-mono bg-gray-100 px-2 py-1 rounded">0</code></td>
                    <td className="border border-gray-300 px-4 py-2">休止符（停顿）</td>
                    <td className="border border-gray-300 px-4 py-2"><code className="font-mono">1 2 0 3</code></td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2"><code className="font-mono bg-gray-100 px-2 py-1 rounded">|</code></td>
                    <td className="border border-gray-300 px-4 py-2">小节线（分隔小节）；|| 表示结束，显示为一条黑线</td>
                    <td className="border border-gray-300 px-4 py-2"><code className="font-mono">1 2 3 4 | 5 6 7 1</code></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 音高修饰 */}
            <div className="mb-6">
              <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <span className="bg-purple-500 text-white px-2 py-0.5 rounded text-sm">2</span>
                音高修饰
              </h4>
              <table className="w-full border-collapse border border-gray-300 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="border border-gray-300 px-4 py-2 text-left w-32">符号</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">说明</th>
                    <th className="border border-gray-300 px-4 py-2 text-left w-48">示例</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2"><code className="font-mono bg-gray-100 px-2 py-1 rounded">'</code></td>
                    <td className="border border-gray-300 px-4 py-2">高八度（后置）</td>
                    <td className="border border-gray-300 px-4 py-2"><code className="font-mono">1' 2' 3'</code></td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2"><code className="font-mono bg-gray-100 px-2 py-1 rounded">.</code></td>
                    <td className="border border-gray-300 px-4 py-2">低八度（后置逗号；兼容前置点号）</td>
                    <td className="border border-gray-300 px-4 py-2"><code className="font-mono">5, .6 7,</code></td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2"><code className="font-mono bg-gray-100 px-2 py-1 rounded">#</code></td>
                    <td className="border border-gray-300 px-4 py-2">升半音（前置）</td>
                    <td className="border border-gray-300 px-4 py-2"><code className="font-mono">#4 #5</code></td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2"><code className="font-mono bg-gray-100 px-2 py-1 rounded">b</code></td>
                    <td className="border border-gray-300 px-4 py-2">降半音（前置）</td>
                    <td className="border border-gray-300 px-4 py-2"><code className="font-mono">b7 b3</code></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 时值控制 */}
            <div className="mb-6">
              <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <span className="bg-green-500 text-white px-2 py-0.5 rounded text-sm">3</span>
                时值控制
              </h4>
              <table className="w-full border-collapse border border-gray-300 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="border border-gray-300 px-4 py-2 text-left w-32">符号</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">说明</th>
                    <th className="border border-gray-300 px-4 py-2 text-left w-48">示例</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2"><code className="font-mono bg-gray-100 px-2 py-1 rounded">-</code></td>
                    <td className="border border-gray-300 px-4 py-2">延长线（每个加1拍）</td>
                    <td className="border border-gray-300 px-4 py-2">
                      <code className="font-mono">1 -</code> (2拍){' '}
                      <code className="font-mono">1 - -</code> (3拍)
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2"><code className="font-mono bg-gray-100 px-2 py-1 rounded">/</code></td>
                    <td className="border border-gray-300 px-4 py-2">减时线（每个减半）</td>
                    <td className="border border-gray-300 px-4 py-2">
                      <code className="font-mono">1/</code> (半拍){' '}
                      <code className="font-mono">1//</code> (1/4拍)
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2"><code className="font-mono bg-gray-100 px-2 py-1 rounded">!</code></td>
                    <td className="border border-gray-300 px-4 py-2">短顿音：不改变占拍，默认发声时值的 1/4</td>
                    <td className="border border-gray-300 px-4 py-2"><code className="font-mono">5!</code>（显示实心倒三角）</td>
                  </tr>
                </tbody>
              </table>
              <p className="text-xs text-gray-500 mt-2">
                💡 空格控制连音线：
                <code className="bg-gray-100 px-1 rounded">1/2/3/</code> 连在一起，
                <code className="bg-gray-100 px-1 rounded">1/ 2/ 3/</code> 各自独立
              </p>
            </div>

            {/* 装饰音 */}
            <div className="mb-6">
              <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <span className="bg-orange-500 text-white px-2 py-0.5 rounded text-sm">4</span>
                装饰音
              </h4>
              <table className="w-full border-collapse border border-gray-300 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="border border-gray-300 px-4 py-2 text-left w-32">符号</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">说明</th>
                    <th className="border border-gray-300 px-4 py-2 text-left w-48">示例</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2"><code className="font-mono bg-gray-100 px-2 py-1 rounded">^</code></td>
                    <td className="border border-gray-300 px-4 py-2">倚音（不占节拍的装饰音）</td>
                    <td className="border border-gray-300 px-4 py-2"><code className="font-mono">^3 5 ^6 7</code></td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2"><code className="font-mono bg-gray-100 px-2 py-1 rounded">v 或 V</code></td>
                    <td className="border border-gray-300 px-4 py-2">换气记号（0拍）；紧邻小节线或反复记号前后时显示在线正上方</td>
                    <td className="border border-gray-300 px-4 py-2"><code className="font-mono">1 2 3 v 4 5 6</code></td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2"><code className="font-mono bg-gray-100 px-2 py-1 rounded">( )</code></td>
                    <td className="border border-gray-300 px-4 py-2">圆滑线（连贯演奏）</td>
                    <td className="border border-gray-300 px-4 py-2"><code className="font-mono">(1 2 3) 4</code></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 歌词 */}
            <div className="mb-6">
              <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <span className="bg-pink-500 text-white px-2 py-0.5 rounded text-sm">5</span>
                歌词
              </h4>
              <table className="w-full border-collapse border border-gray-300 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="border border-gray-300 px-4 py-2 text-left w-32">标记</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">说明</th>
                    <th className="border border-gray-300 px-4 py-2 text-left w-48">示例</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2"><code className="font-mono bg-gray-100 px-2 py-1 rounded">Q</code></td>
                    <td className="border border-gray-300 px-4 py-2">旋律行标记（可选；P 为兼容别名）</td>
                    <td className="border border-gray-300 px-4 py-2"><code className="font-mono">Q 1 2 3 4</code></td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2"><code className="font-mono bg-gray-100 px-2 py-1 rounded">C</code></td>
                    <td className="border border-gray-300 px-4 py-2">歌词行（一字对一音）</td>
                    <td className="border border-gray-300 px-4 py-2"><code className="font-mono">C 哆 来 咪 发</code></td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2"><code className="font-mono bg-gray-100 px-2 py-1 rounded">(多字)</code></td>
                    <td className="border border-gray-300 px-4 py-2">分组（多字对一音）</td>
                    <td className="border border-gray-300 px-4 py-2"><code className="font-mono">C (我的) 祖 国</code></td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2"><code className="font-mono bg-gray-100 px-2 py-1 rounded">-</code></td>
                    <td className="border border-gray-300 px-4 py-2">占位符（某个发声音符没有歌词；休止、延长不占歌词）</td>
                    <td className="border border-gray-300 px-4 py-2"><code className="font-mono">C 星 _ 光</code></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 元信息 */}
            <div className="mb-6">
              <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <span className="bg-cyan-500 text-white px-2 py-0.5 rounded text-sm">6</span>
                元信息（文件开头，使用 --- 包裹）
              </h4>
              <div className="bg-gray-50 border border-gray-300 rounded p-3 mb-3">
                <p className="text-sm text-gray-600">
                  元信息区域使用 YAML frontmatter 格式，以 <code className="font-mono">---</code> 开始和结束
                </p>
              </div>
              <table className="w-full border-collapse border border-gray-300 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="border border-gray-300 px-4 py-2 text-left w-32">字段</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">说明</th>
                    <th className="border border-gray-300 px-4 py-2 text-left w-48">示例</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">标题 / title</td>
                    <td className="border border-gray-300 px-4 py-2">曲谱名称</td>
                    <td className="border border-gray-300 px-4 py-2"><code className="font-mono">标题: 小星星</code></td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">作曲 / composer</td>
                    <td className="border border-gray-300 px-4 py-2">作曲者</td>
                    <td className="border border-gray-300 px-4 py-2"><code className="font-mono">composer: Mozart</code></td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">速度 / tempo</td>
                    <td className="border border-gray-300 px-4 py-2">每分钟拍数（BPM）</td>
                    <td className="border border-gray-300 px-4 py-2"><code className="font-mono">速度: 120</code></td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">拍号 / time</td>
                    <td className="border border-gray-300 px-4 py-2">节拍记号</td>
                    <td className="border border-gray-300 px-4 py-2"><code className="font-mono">拍号: 4/4</code></td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">调号 / key</td>
                    <td className="border border-gray-300 px-4 py-2">调性</td>
                    <td className="border border-gray-300 px-4 py-2"><code className="font-mono">调号: C</code></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* 完整示例 */}
          <section>
            <h3 className="text-xl font-bold mb-4 text-gray-800">🎵 完整示例</h3>
            <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
              <pre className="text-sm font-mono text-gray-800 overflow-x-auto">
{`---
标题: 小星星
速度: 80
拍号: 4/4
---

P 1 1 5 5 | 6 6 5 - |
C 一 闪 一 闪 亮 晶 晶

P 4 4 3 3 | 2 2 1 - |
C 满 天 都 是 小 星 星`}
              </pre>
            </div>
          </section>

          {/* 常见问题 */}
          <section>
            <h3 className="text-xl font-bold mb-4 text-gray-800">💡 常见问题</h3>
            <div className="space-y-3 text-sm">
              <details className="bg-gray-50 p-3 rounded border border-gray-200">
                <summary className="font-semibold cursor-pointer">为什么没有声音？</summary>
                <p className="mt-2 text-gray-600">
                  检查：1) 解析诊断中的符号和小节时值 2) 浏览器音量已开启。音符和小节线两侧的空格可省略；空格会影响减时线分组。
                </p>
              </details>
              <details className="bg-gray-50 p-3 rounded border border-gray-200">
                <summary className="font-semibold cursor-pointer">如何计算音符时值？</summary>
                <p className="mt-2 text-gray-600">
                  基础 1 拍 → 加 <code>-</code> 延长 1 拍 → 加 <code>/</code> 减半。例：
                  <code>1</code>=1拍，<code>1 -</code>=2拍，<code>1/</code>=0.5拍
                </p>
              </details>
              <details className="bg-gray-50 p-3 rounded border border-gray-200">
                <summary className="font-semibold cursor-pointer">升降号和八度如何组合？</summary>
                <p className="mt-2 text-gray-600">
                  升降号在前，八度在后。例：<code>#4'</code> 表示高八度的升 fa
                </p>
              </details>
            </div>
          </section>

        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-3 border-t border-gray-200 bg-gray-50 text-center flex-shrink-0">
        <p className="text-xs text-gray-500">简谱语法参考 {HELP_PAGE_VERSION} · 更新于 {HELP_PAGE_UPDATED_DATE} </p>
      </footer>

      {/* 右下角悬浮反馈组件 */}
      <FeedbackWidget />
    </div>
  );
};

export default HelpPage;
