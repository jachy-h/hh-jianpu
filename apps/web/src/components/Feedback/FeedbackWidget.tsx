import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface MenuItem {
  label: string;
  icon: string;
  onClick: () => void;
}

const FeedbackWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ESC 键关闭
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setShowFeedbackModal(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const menuItems: MenuItem[] = [
    {
      label: '查看帮助文档',
      icon: '📖',
      onClick: () => {
        setIsOpen(false);
        navigate('/help');
      },
    },
    {
      label: '建议和反馈',
      icon: '💬',
      onClick: () => {
        setIsOpen(false);
        setShowFeedbackModal(true);
      },
    }
  ];

  return (
    <>
      {/* 悬浮按钮 */}
      <div className="fixed bottom-6 right-3 z-50" ref={menuRef}>
        {/* 菜单 */}
        {isOpen && (
          <div className="absolute bottom-14 right-0 bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[160px] animate-in fade-in slide-in-from-bottom-2 duration-200">
            {menuItems.map((item, index) => (
              <button
                key={index}
                onClick={item.onClick}
                className="w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3 transition-colors first:rounded-t-lg last:rounded-b-lg"
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* 主按钮 */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-10 h-10 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 ${
            isOpen
              ? 'bg-blue-600 text-white rotate-90'
              : 'bg-white text-gray-600 hover:bg-blue-50 hover:text-blue-600'
          }`}
          aria-label="帮助与反馈"
          aria-expanded={isOpen}
        >
          <span className="text-md font-bold">?</span>
        </button>
      </div>

      {/* 反馈弹窗 */}
      {showFeedbackModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowFeedbackModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 标题栏 */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">💬 建议和反馈</h3>
              <button
                onClick={() => setShowFeedbackModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="关闭"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 内容区 */}
            <div className="px-6 py-8">
              {/* 左右布局 */}
              <div className="flex gap-6">

                {/* 左侧：开发者寄语 */}
                <div className="flex-1 flex flex-col justify-center">
                  <div className="bg-blue-50 rounded-lg p-4 mb-4">
                    <p className="text-sm text-gray-700 leading-relaxed">
                      <span className="font-medium text-blue-600">👋 哈喽！请用小红书扫码反馈。</span>
                      <br />
                        <span className="text-gray-500 text-xs mt-1 block">
                        <br /><br />
                        我是一名音乐初学者，欢迎提出任何建议和意见！无论是功能需求、使用体验，还是任何想说的话。
                        <br /><br />
                        如果哈哈简谱能帮助到你，那就太好了！
                        <br /><br />
                         ——— 开发者留言碎片
                        </span>
                    </p>
                  </div>
                </div>
                
                {/* 右侧：二维码 */}
                <div className="flex-shrink-0">
                  <img
                    src="/xhs.jpg"
                    alt="小红书二维码"
                    className="w-40 rounded-lg shadow-md border border-gray-200"
                  />
                  <p className="text-gray-500 text-xs mt-1">
                    Jachy出发了&nbsp;2729682925
                  </p>
                </div>

                
              </div>
            </div>

            {/* 底部按钮 */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
              <button
                onClick={() => setShowFeedbackModal(false)}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                知道了
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FeedbackWidget;
