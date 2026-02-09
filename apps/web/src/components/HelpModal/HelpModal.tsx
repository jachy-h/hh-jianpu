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
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <h2 className="text-2xl font-bold text-gray-800">🎵 简谱入门 - 像发微信一样简单</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white rounded-full transition-colors"
            title="关闭"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-4xl mx-auto space-y-8">
            
            {/* 零基础入门 */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 p-6 rounded-r-lg">
              <p className="text-lg font-semibold text-gray-800 mb-2">
                💡 不会看五线谱？没关系！
              </p>
              <p className="text-gray-700">
                简谱只用 <strong>1-7</strong> 这几个数字，就像小时候学的"哆来咪"，<strong>三分钟上手！</strong>
              </p>
            </div>

            {/* 30秒体验 */}
            <section>
              <h3 className="text-2xl font-bold mb-4 text-gray-800">🎯 30秒快速体验</h3>
              <p className="text-gray-600 mb-3">试试在编辑器里输入这几个数字（记得用空格隔开）：</p>
              <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-lg font-mono">
1 1 5 5 6 6 5
              </pre>
              <p className="text-gray-600 mt-3">
                点击播放 ▶️，听到了吗？<strong className="text-blue-600">这就是《小星星》的第一句！</strong>
              </p>
            </section>

            {/* 数字就是音高 */}
            <section>
              <h3 className="text-2xl font-bold mb-4 text-gray-800">🎹 理解简谱的核心：数字就是音高</h3>
              <p className="text-gray-600 mb-4">还记得小时候唱的"哆 来 咪 发 嗦 啦 西"吗？</p>
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6">
                <pre className="text-center text-lg font-mono leading-relaxed text-gray-800">
1   2   3   4   5   6   7
↓   ↓   ↓   ↓   ↓   ↓   ↓
哆  来  咪  发  嗦  啦  西
do  re  mi  fa sol la  si
                </pre>
                <p className="text-center text-gray-700 mt-4 font-semibold">
                  想唱"哆"，就写 <code className="bg-white px-2 py-1 rounded border">1</code> · 
                  想唱"嗦"，就写 <code className="bg-white px-2 py-1 rounded border">5</code>
                </p>
              </div>
            </section>

            {/* 第一课：小星星 */}
            <section>
              <h3 className="text-2xl font-bold mb-4 text-gray-800">🎼 第一课：完整的《小星星》</h3>
              <div className="space-y-5">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-bold">步骤 1</span>
                    <span className="font-semibold text-gray-800">告诉别人你要写什么歌</span>
                  </div>
                  <pre className="bg-gray-100 p-4 rounded-lg border border-gray-300">
标题: 小星星
速度: 80
                  </pre>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-bold">步骤 2</span>
                    <span className="font-semibold text-gray-800">输入旋律</span>
                  </div>
                  <pre className="bg-gray-100 p-4 rounded-lg border border-gray-300">
1 1 5 5 | 6 6 5 -
                  </pre>
                  <p className="text-sm text-blue-600 mt-2 font-semibold">🎵 试试播放！是不是听到"一闪一闪亮晶晶"了？</p>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-bold">步骤 3</span>
                    <span className="font-semibold text-gray-800">继续写完整首歌</span>
                  </div>
                  <pre className="bg-gray-100 p-4 rounded-lg border border-gray-300 text-sm">
标题: 小星星
速度: 80

1 1 5 5 | 6 6 5 - |
4 4 3 3 | 2 2 1 - |
5 5 4 4 | 3 3 2 - |
5 5 4 4 | 3 3 2 - |
1 1 5 5 | 6 6 5 - |
4 4 3 3 | 2 2 1 - |
                  </pre>
                  <p className="text-lg text-green-600 font-bold mt-3">🎉 恭喜你！你已经完成第一首简谱了！</p>
                </div>
              </div>
            </section>

            {/* 第二课：节奏 */}
            <section>
              <h3 className="text-2xl font-bold mb-4 text-gray-800">🎶 第二课：让音符动起来</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-5">
                  <h4 className="font-bold text-gray-800 mb-3">🐌 慢拍子：用 <code className="bg-white px-2 py-1 rounded">-</code> 拉长</h4>
                  <pre className="bg-white p-3 rounded text-sm border border-orange-300">
5 -         (唱2拍)
1 - - -     (唱4拍)
                  </pre>
                  <p className="text-sm text-gray-600 mt-2">每个 <code>-</code> 加1拍</p>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-5">
                  <h4 className="font-bold text-gray-800 mb-3">🐰 快节奏：用 <code className="bg-white px-2 py-1 rounded">_</code> 加速</h4>
                  <pre className="bg-white p-3 rounded text-sm border border-purple-300">
1_2_3_      (快速)
5_5_5_5_    (更快)
                  </pre>
                  <p className="text-sm text-gray-600 mt-2">每个 <code>_</code> 减半拍</p>
                </div>
              </div>

              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg mt-4">
                <p className="font-semibold text-gray-800 mb-2">💡 实用技巧：连续快音符</p>
                <div className="space-y-2 text-sm">
                  <div><code className="bg-white px-2 py-1 rounded">1_ 2_ 3_</code> → 有空格 = 分开</div>
                  <div><code className="bg-white px-2 py-1 rounded">1_2_3_</code> → 没空格 = 用线连起来</div>
                </div>
              </div>
            </section>

            {/* 第三课：高低音 */}
            <section>
              <h3 className="text-2xl font-bold mb-4 text-gray-800">🎵 第三课：音符的"高低"</h3>
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-6">
                <p className="font-semibold text-gray-800 mb-4">想象楼梯：</p>
                <div className="space-y-3 text-lg">
                  <div className="flex items-center gap-4">
                    <code className="bg-white px-3 py-2 rounded border font-bold w-24">.1</code>
                    <span className="text-gray-700">低音哆（像男低音）</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <code className="bg-white px-3 py-2 rounded border font-bold w-24">1</code>
                    <span className="text-gray-700">中音哆（正常音高）</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <code className="bg-white px-3 py-2 rounded border font-bold w-24">'1</code>
                    <span className="text-gray-700">高音哆（像女高音）</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-4 font-medium">💡 记忆口诀：撇号向上飘，点点往下掉</p>
              </div>
            </section>

            {/* 完整功能速查 */}
            <section>
              <h3 className="text-2xl font-bold mb-4 text-gray-800">📋 完整功能速查</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg border">
                  <h4 className="font-semibold mb-2">🤫 休止符</h4>
                  <p className="text-sm text-gray-600 mb-2">用 <code className="bg-white px-1 rounded">0</code> 表示停顿</p>
                  <code className="text-xs">1 0 2 0 (停1拍)</code>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg border">
                  <h4 className="font-semibold mb-2">🎹 升降号</h4>
                  <p className="text-sm text-gray-600 mb-2">写在数字前面</p>
                  <code className="text-xs">#4 (升fa) · b7 (降si)</code>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg border">
                  <h4 className="font-semibold mb-2">📏 小节线</h4>
                  <p className="text-sm text-gray-600 mb-2">用 <code className="bg-white px-1 rounded">|</code> 分隔</p>
                  <code className="text-xs">1 2 3 4 | 5 6 7 '1 |</code>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg border">
                  <h4 className="font-semibold mb-2">✍️ 歌词</h4>
                  <p className="text-sm text-gray-600 mb-2">C 开头，一字对一音</p>
                  <code className="text-xs">P 1 2 3 | C 哆 来 咪</code>
                </div>
              </div>
            </section>

            {/* 快速参考卡 */}
            <section>
              <h3 className="text-2xl font-bold mb-4 text-gray-800">🎯 快速参考卡片</h3>
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 text-white p-6 rounded-xl shadow-lg">
                <pre className="font-mono text-sm leading-relaxed">
┌─────────────────────────────────────┐
│        简谱速查表                    │
├─────────────────────────────────────┤
│ 数字：  1 2 3 4 5 6 7               │
│ 唱名：  哆来咪发嗦啦西               │
│                                     │
│ 高音：  '1 '2 '3                    │
│ 低音：  .1 .2 .3                    │
│                                     │
│ 拉长：  1 - (加1拍)                 │
│ 加快：  1_ (减半拍)                 │
│                                     │
│ 休止：  0 (停顿)                    │
│ 升降：  #4 b7                       │
│                                     │
│ 小节：  |                           │
│ 歌词：  C 一 闪 一 闪                │
└─────────────────────────────────────┘
                </pre>
              </div>
            </section>

            {/* 练习曲目 */}
            <section>
              <h3 className="text-2xl font-bold mb-4 text-gray-800">🎵 练习曲目推荐</h3>
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold mb-2">⭐ 入门：小蜜蜂</h4>
                  <pre className="bg-white p-3 rounded text-sm border">5 3 3 - | 4 2 2 - | 1 2 3 4 | 5 5 5 - |</pre>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold mb-2">⭐⭐ 初级：两只老虎</h4>
                  <pre className="bg-white p-3 rounded text-sm border">1 2 3 1 | 1 2 3 1 | 3 4 5 - | 3 4 5 - |</pre>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h4 className="font-semibold mb-2">⭐⭐⭐ 中级：欢乐颂</h4>
                  <pre className="bg-white p-3 rounded text-sm border">3 3 4 5 | 5 4 3 2 | 1 1 2 3 | 3 2 2 - |</pre>
                </div>
              </div>
            </section>

            {/* 结语 */}
            <section className="bg-gradient-to-r from-pink-100 via-purple-100 to-blue-100 border-2 border-pink-300 rounded-xl p-8 text-center">
              <h3 className="text-3xl font-bold mb-4 text-gray-800">🎊 现在就开始吧！</h3>
              <p className="text-lg text-gray-700 mb-4">
                音乐不需要门槛。你只需要会数 <strong>1-7</strong>、有耳朵、喜欢音乐！
              </p>
              <div className="bg-white p-6 rounded-lg shadow-md inline-block">
                <p className="font-semibold text-gray-800 mb-3">✨ 试试在编辑器里输入：</p>
                <pre className="bg-gray-900 text-green-400 p-4 rounded text-xl font-mono">1 1 5 5 6 6 5 -</pre>
                <p className="text-gray-600 mt-3">按下播放键，享受你创造的旋律 🎵</p>
              </div>
              <p className="text-sm text-gray-600 mt-6 italic">
                记住：<strong className="text-purple-600">音乐的乐趣不在于完美，而在于表达！</strong>
              </p>
            </section>

          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 text-center">
          <p className="text-xs text-gray-500">
            文档版本 v2.0 · 更新于 2026年2月9日 · 面向音乐初学者精心编写
          </p>
        </div>
      </div>
    </div>
  );
};
