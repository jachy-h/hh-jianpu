import React from 'react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div 
        className="bg-white rounded-lg shadow-2xl w-[90vw] h-[90vh] max-w-5xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800">📖 简谱语法速查</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="关闭"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-4xl mx-auto space-y-6">
            
            {/* 快速入门 */}
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r">
              <p className="text-gray-800">
                <strong>简谱用数字 1-7 表示音高</strong>（哆来咪发嗦啦西），用空格分隔音符，用 <code className="bg-white px-1 rounded">|</code> 分隔小节。
                试试输入 <code className="bg-white px-2 py-1 rounded font-mono">1 1 5 5 | 6 6 5 -</code> 然后播放！
              </p>
            </div>

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
                      <td className="border border-gray-300 px-4 py-2">小节线（分隔小节）</td>
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
                      <td className="border border-gray-300 px-4 py-2">高八度（前置）</td>
                      <td className="border border-gray-300 px-4 py-2"><code className="font-mono">'1 '2 '3</code></td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2"><code className="font-mono bg-gray-100 px-2 py-1 rounded">.</code></td>
                      <td className="border border-gray-300 px-4 py-2">低八度（前置）</td>
                      <td className="border border-gray-300 px-4 py-2"><code className="font-mono">.5 .6 .7</code></td>
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
                      <td className="border border-gray-300 px-4 py-2"><code className="font-mono">1 -</code> (2拍) <code className="font-mono">1 - -</code> (3拍)</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2"><code className="font-mono bg-gray-100 px-2 py-1 rounded">/</code></td>
                      <td className="border border-gray-300 px-4 py-2">减时线（每个减半）</td>
                      <td className="border border-gray-300 px-4 py-2"><code className="font-mono">1/</code> (半拍) <code className="font-mono">1//</code> (1/4拍)</td>
                    </tr>
                  </tbody>
                </table>
                <p className="text-xs text-gray-500 mt-2">💡 空格控制连音线：<code className="bg-gray-100 px-1 rounded">1/2/3/</code> 连在一起，<code className="bg-gray-100 px-1 rounded">1/ 2/ 3/</code> 各自独立</p>
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
                      <td className="border border-gray-300 px-4 py-2">换气记号（0拍）</td>
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
                      <td className="border border-gray-300 px-4 py-2"><code className="font-mono bg-gray-100 px-2 py-1 rounded">P</code></td>
                      <td className="border border-gray-300 px-4 py-2">旋律行标记（可选）</td>
                      <td className="border border-gray-300 px-4 py-2"><code className="font-mono">P 1 2 3 4</code></td>
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
                      <td className="border border-gray-300 px-4 py-2"><code className="font-mono bg-gray-100 px-2 py-1 rounded">_</code></td>
                      <td className="border border-gray-300 px-4 py-2">占位符（跳过该音符）</td>
                      <td className="border border-gray-300 px-4 py-2"><code className="font-mono">C 星 _ _ 光</code></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 元信息 */}
              <div className="mb-6">
                <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <span className="bg-cyan-500 text-white px-2 py-0.5 rounded text-sm">6</span>
                  元信息（文件开头）
                </h4>
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
{`标题: 小星星
速度: 80
拍号: 4/4

P 1 1 5 5 | 6 6 5 - |
C 一 闪 一 闪 亮 晶 晶 _

P 4 4 3 3 | 2 2 1 - |
C 满 天 都 是 小 星 星 _`}
                </pre>
              </div>
            </section>

            {/* 常见问题 */}
            <section>
              <h3 className="text-xl font-bold mb-4 text-gray-800">💡 常见问题</h3>
              <div className="space-y-3 text-sm">
                <details className="bg-gray-50 p-3 rounded border border-gray-200">
                  <summary className="font-semibold cursor-pointer">为什么没有声音？</summary>
                  <p className="mt-2 text-gray-600">检查：1) 音符之间有空格 2) 小节线两边有空格 3) 浏览器音量已开启</p>
                </details>
                <details className="bg-gray-50 p-3 rounded border border-gray-200">
                  <summary className="font-semibold cursor-pointer">如何计算音符时值？</summary>
                  <p className="mt-2 text-gray-600">基础 1 拍 → 加 <code>-</code> 延长 1 拍 → 加 <code>/</code> 减半。例：<code>1</code>=1拍，<code>1 -</code>=2拍，<code>1/</code>=0.5拍</p>
                </details>
                <details className="bg-gray-50 p-3 rounded border border-gray-200">
                  <summary className="font-semibold cursor-pointer">升降号和八度如何组合？</summary>
                  <p className="mt-2 text-gray-600">升降号在前，八度在后。例：<code>#'4</code> 表示高八度的升 fa</p>
                </details>
              </div>
            </section>

          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 text-center">
          <p className="text-xs text-gray-500">
            简谱语法参考 v2.0 · 更新于 2026年2月9日
          </p>
        </div>
      </div>
    </div>
  );
};
