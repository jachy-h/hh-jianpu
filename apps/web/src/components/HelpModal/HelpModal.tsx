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
          <h2 className="text-2xl font-bold text-gray-800">📖 简谱源码编写说明</h2>
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
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="prose prose-slate max-w-none">
            
            {/* 快速入门 */}
            <section className="mb-8">
              <h3 className="text-xl font-bold mb-4">🚀 快速入门</h3>
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
                <p className="text-sm text-gray-700">
                  简谱源码采用纯文本格式，只需三步即可创建你的第一首曲谱！
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">第一步：编写元信息（可选）</h4>
                  <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
{`标题: 小星星
作曲: 莫扎特
拍号: 4/4
速度: 120`}
                  </pre>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">第二步：输入音符（1-7 对应 do re mi fa sol la si）</h4>
                  <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
{`1 1 5 5 | 6 6 5 - |`}
                  </pre>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">第三步：添加节奏（使用下划线表示减时）</h4>
                  <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
{`1 1 5_5 6_6 | 5 - - - |`}
                  </pre>
                </div>
              </div>
            </section>

            {/* 完整语法 */}
            <section className="mb-8">
              <h3 className="text-xl font-bold mb-4">📝 完整语法规则</h3>
              
              <div className="space-y-6">
                {/* 音符 */}
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">1. 音符（Note）</h4>
                  <table className="min-w-full border border-gray-300 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="border border-gray-300 px-3 py-2">数字</th>
                        <th className="border border-gray-300 px-3 py-2">唱名</th>
                        <th className="border border-gray-300 px-3 py-2">音名</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ['1', 'do', 'C'],
                        ['2', 're', 'D'],
                        ['3', 'mi', 'E'],
                        ['4', 'fa', 'F'],
                        ['5', 'sol', 'G'],
                        ['6', 'la', 'A'],
                        ['7', 'si', 'B'],
                      ].map(([num, sing, note]) => (
                        <tr key={num}>
                          <td className="border border-gray-300 px-3 py-2 font-mono">{num}</td>
                          <td className="border border-gray-300 px-3 py-2">{sing}</td>
                          <td className="border border-gray-300 px-3 py-2">{note}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 高低八度 */}
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">2. 高低八度（Octave）</h4>
                  <table className="min-w-full border border-gray-300 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="border border-gray-300 px-3 py-2">符号</th>
                        <th className="border border-gray-300 px-3 py-2">说明</th>
                        <th className="border border-gray-300 px-3 py-2">示例</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ["'", '高八度（前缀）', "'1"],
                        ["''", '高两个八度（前缀）', "''1"],
                        ['.', '低八度（前缀）', '.1'],
                        ['..', '低两个八度（前缀）', '..1'],
                      ].map(([symbol, desc, example]) => (
                        <tr key={symbol}>
                          <td className="border border-gray-300 px-3 py-2 font-mono">{symbol}</td>
                          <td className="border border-gray-300 px-3 py-2">{desc}</td>
                          <td className="border border-gray-300 px-3 py-2 font-mono">{example}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="text-sm text-gray-600 mt-2">示例：<code className="bg-gray-100 px-2 py-1 rounded">..1 .1 1 '1 ''1</code>（低两个八度 → 标准 → 高两个八度）</p>
                </div>

                {/* 变音记号 */}
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">3. 变音记号（Accidental）</h4>
                  <table className="min-w-full border border-gray-300 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="border border-gray-300 px-3 py-2">符号</th>
                        <th className="border border-gray-300 px-3 py-2">说明</th>
                        <th className="border border-gray-300 px-3 py-2">示例</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ['#', '升号（写在音符前）', '#4'],
                        ['b', '降号（写在音符前）', 'b7'],
                      ].map(([symbol, desc, example]) => (
                        <tr key={symbol}>
                          <td className="border border-gray-300 px-3 py-2 font-mono">{symbol}</td>
                          <td className="border border-gray-300 px-3 py-2">{desc}</td>
                          <td className="border border-gray-300 px-3 py-2 font-mono">{example}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="text-sm text-gray-600 mt-2">示例：<code className="bg-gray-100 px-2 py-1 rounded">1 2 3 #4 5 6 b7</code></p>
                </div>

                {/* 时值 */}
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">4. 时值（Duration）</h4>
                  <div className="space-y-3">
                    <div>
                      <p className="font-medium text-gray-700 mb-2">减时线（Underline）</p>
                      <table className="min-w-full border border-gray-300 text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="border border-gray-300 px-3 py-2">符号</th>
                            <th className="border border-gray-300 px-3 py-2">时值</th>
                            <th className="border border-gray-300 px-3 py-2">说明</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            ['无', '1 拍', '四分音符：1'],
                            ['_', '0.5 拍', '八分音符：1_'],
                            ['__', '0.25 拍', '十六分音符：1__'],
                          ].map(([symbol, duration, desc]) => (
                            <tr key={desc}>
                              <td className="border border-gray-300 px-3 py-2 font-mono">{symbol}</td>
                              <td className="border border-gray-300 px-3 py-2">{duration}</td>
                              <td className="border border-gray-300 px-3 py-2 font-mono">{desc}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div>
                      <p className="font-medium text-gray-700 mb-2">延长线（Tie）</p>
                      <table className="min-w-full border border-gray-300 text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="border border-gray-300 px-3 py-2">符号</th>
                            <th className="border border-gray-300 px-3 py-2">效果</th>
                            <th className="border border-gray-300 px-3 py-2">说明</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            ['-', '+1 拍', '1 - = 2 拍'],
                            ['- -', '+2 拍', '1 - - = 3 拍'],
                            ['- - -', '+3 拍', '1 - - - = 4 拍'],
                          ].map(([symbol, effect, desc]) => (
                            <tr key={desc}>
                              <td className="border border-gray-300 px-3 py-2 font-mono">{symbol}</td>
                              <td className="border border-gray-300 px-3 py-2">{effect}</td>
                              <td className="border border-gray-300 px-3 py-2 font-mono">{desc}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* 休止符 */}
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">5. 休止符（Rest）</h4>
                  <p className="text-sm text-gray-600 mb-2">使用 <code className="bg-gray-100 px-2 py-1 rounded">0</code> 表示休止符（静音）</p>
                  <p className="text-sm text-gray-600">示例：<code className="bg-gray-100 px-2 py-1 rounded">1 0 2 0 | 5 0 0 0</code></p>
                </div>

                {/* 小节线 */}
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">6. 小节线（Barline）</h4>
                  <p className="text-sm text-gray-600 mb-2">使用 <code className="bg-gray-100 px-2 py-1 rounded">|</code> 分隔小节</p>
                  <p className="text-sm text-gray-600">示例：<code className="bg-gray-100 px-2 py-1 rounded">1 2 3 4 | 5 6 7 1'</code></p>
                </div>

                {/* 连音线 */}
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">7. 连音线（Beam）</h4>
                  <p className="text-sm text-gray-600 mb-2">八分音符通过<strong>空格控制</strong>分组，无空格的相邻八分音符会用横线连接</p>
                  <table className="min-w-full border border-gray-300 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="border border-gray-300 px-3 py-2">源码</th>
                        <th className="border border-gray-300 px-3 py-2">视觉效果</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ['1_ 2_', '各自独立减时线'],
                        ['1_2_', '一条横线连接'],
                        ['1_2_ 3_4_', '两条独立横线（2+2）'],
                        ['1_2_3_4_', '一条横线连接全部'],
                      ].map(([code, effect]) => (
                        <tr key={code}>
                          <td className="border border-gray-300 px-3 py-2 font-mono">{code}</td>
                          <td className="border border-gray-300 px-3 py-2">{effect}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 圆滑线说明 */}
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">8. 圆滑线（Slur）✨</h4>
                  <p className="text-sm text-gray-700 mb-2">
                    使用小括号 <code className="bg-gray-100 px-2 py-1 rounded">()</code> 标记圆滑演奏的音符组
                  </p>
                  <table className="min-w-full border border-gray-300 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="border border-gray-300 px-3 py-2">类型</th>
                        <th className="border border-gray-300 px-3 py-2">语法</th>
                        <th className="border border-gray-300 px-3 py-2">示例</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ['延音线（相同音高）', '-', '1 - -'],
                        ['连音线（八分音符）', '无空格', '1_2_3_'],
                        ['圆滑线（不同音高）', '()', '(1 2 3)'],
                      ].map(([type, syntax, example]) => (
                        <tr key={type}>
                          <td className="border border-gray-300 px-3 py-2">{type}</td>
                          <td className="border border-gray-300 px-3 py-2 font-mono">{syntax}</td>
                          <td className="border border-gray-300 px-3 py-2 font-mono">{example}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="text-sm text-gray-600 mt-2">
                    圆滑线支持跨小节：<code className="bg-gray-100 px-2 py-1 rounded">(1 2 | 3 4)</code>
                  </p>
                </div>
              </div>
            </section>

            {/* 完整示例 */}
            <section className="mb-8">
              <h3 className="text-xl font-bold mb-4">💡 完整示例</h3>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
{`标题: 小星星
作曲: 莫扎特
拍号: 4/4
速度: 80

1 1 5 5 | 6 6 5 - |
4 4 3 3 | 2 2 1 - |
5 5 4 4 | 3 3 2 - |
5 5 4 4 | 3 3 2 - |
1 1 5 5 | 6 6 5 - |
4 4 3 3 | 2 2 1 - |`}
              </pre>
            </section>

            {/* 常见问题 */}
            <section className="mb-8">
              <h3 className="text-xl font-bold mb-4">❓ 常见问题</h3>
              <div className="space-y-4">
                <div className="border-l-4 border-blue-500 pl-4">
                  <p className="font-semibold text-gray-800">Q: 如何区分低八度的 . 和附点？</p>
                  <p className="text-sm text-gray-600 mt-1">A: 低八度的 . 写在音符后（如 1.），建议使用下划线表示时值以避免混淆。</p>
                </div>

                <div className="border-l-4 border-blue-500 pl-4">
                  <p className="font-semibold text-gray-800">Q: 如何控制八分音符连音线？</p>
                  <p className="text-sm text-gray-600 mt-1">A: 通过空格控制。<code className="bg-gray-100 px-1 rounded">1_2_</code> 无空格会连接，<code className="bg-gray-100 px-1 rounded">1_ 2_</code> 有空格则分开。</p>
                </div>

                <div className="border-l-4 border-blue-500 pl-4">
                  <p className="font-semibold text-gray-800">Q: 如何表示延音线（相同音高连线）？</p>
                  <p className="text-sm text-gray-600 mt-1">A: 使用 - 延长线。<code className="bg-gray-100 px-1 rounded">1 - -</code> 表示 do 持续 3 拍。</p>
                </div>

                <div className="border-l-4 border-blue-500 pl-4">
                  <p className="font-semibold text-gray-800">Q: 下划线可以连续使用吗？</p>
                  <p className="text-sm text-gray-600 mt-1">A: 可以。每个下划线减半时值（1_ = 0.5拍，1__ = 0.25拍）。</p>
                </div>

                <div className="border-l-4 border-blue-500 pl-4">
                  <p className="font-semibold text-gray-800">Q: 升降号可以和八度符号一起用吗？</p>
                  <p className="text-sm text-gray-600 mt-1">A: 可以。升降号在前，八度在后（如 #4' b7.）。</p>
                </div>
              </div>
            </section>

          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 flex justify-between items-center">
          <p className="text-sm text-gray-500">详细文档请查看 docs/user-guide/notation-syntax.md</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            知道了
          </button>
        </div>
      </div>
    </div>
  );
};
