/**
 * 设置面板组件
 */

import React, { useState, useEffect } from 'react';
import {
  loadLLMConfig,
  saveLLMConfig,
  clearLLMConfig,
  testLLMConnection,
  type LLMProviderConfig,
} from '../../services/ocr';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [config, setConfig] = useState<LLMProviderConfig>({
    provider: 'openai',
    apiKey: '',
    baseUrl: '',
    model: '',
  });

  const [showApiKey, setShowApiKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // 加载配置
  useEffect(() => {
    if (isOpen) {
      const saved = loadLLMConfig();
      if (saved) {
        setConfig(saved);
      }
      setTestResult(null);
    }
  }, [isOpen]);

  const handleSave = () => {
    if (config.apiKey.trim()) {
      saveLLMConfig(config);
      onClose();
    }
  };

  const handleClear = () => {
    if (window.confirm('确定要清除 API 配置吗？')) {
      clearLLMConfig();
      setConfig({
        provider: 'openai',
        apiKey: '',
        baseUrl: '',
        model: '',
      });
    }
  };

  const handleTest = async () => {
    if (!config.apiKey.trim()) {
      setTestResult({ success: false, message: '请先输入 API Key' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      await testLLMConnection(config);
      setTestResult({ success: true, message: '连接成功！' });
    } catch (error: unknown) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : '连接失败，请检查配置',
      });
    } finally {
      setIsTesting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-paper w-full max-w-2xl rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
        {/* 标题栏 */}
        <div className="sticky top-0 bg-paper border-b border-barline px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-ink">⚙️ 设置</h2>
            <button
              onClick={onClose}
              className="text-played hover:text-ink transition-colors"
              aria-label="关闭"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* 内容 */}
        <div className="px-6 py-6 space-y-6">
          {/* 图片识别配置 */}
          <section>
            <h3 className="text-lg font-medium text-ink mb-4">图片识别（可选）</h3>
            <p className="text-sm text-played mb-4">
              使用 AI 识别简谱图片需要 API Key。您的 Key 仅存储在浏览器本地，不会上传到任何服务器。
            </p>

            {/* 服务商选择 */}
            <div className="space-y-4">
              <div>
                <label htmlFor="provider" className="block text-sm font-medium text-ink mb-2">
                  服务商
                </label>
                <select
                  id="provider"
                  value={config.provider}
                  onChange={(e) =>
                    setConfig({ ...config, provider: e.target.value as LLMProviderConfig['provider'] })
                  }
                  className="w-full px-3 py-2 border border-barline rounded-md bg-paper text-ink focus:outline-none focus:ring-2 focus:ring-highlight"
                >
                  <option value="openai">OpenAI (GPT-4o)</option>
                  <option value="anthropic">Anthropic (Claude)</option>
                  <option value="compatible">兼容 API</option>
                </select>
              </div>

              {/* API Key */}
              <div>
                <label htmlFor="apiKey" className="block text-sm font-medium text-ink mb-2">
                  API Key
                </label>
                <div className="flex gap-2">
                  <input
                    id="apiKey"
                    type={showApiKey ? 'text' : 'password'}
                    value={config.apiKey}
                    onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                    placeholder="sk-..."
                    className="flex-1 px-3 py-2 border border-barline rounded-md bg-paper text-ink focus:outline-none focus:ring-2 focus:ring-highlight"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="px-3 py-2 border border-barline rounded-md hover:bg-gray-50 transition-colors"
                    aria-label={showApiKey ? '隐藏' : '显示'}
                  >
                    {showApiKey ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {/* 自定义 Base URL（兼容 API 时显示） */}
              {config.provider === 'compatible' && (
                <div>
                  <label htmlFor="baseUrl" className="block text-sm font-medium text-ink mb-2">
                    API 端点
                  </label>
                  <input
                    id="baseUrl"
                    type="text"
                    value={config.baseUrl}
                    onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
                    placeholder="https://api.example.com/v1"
                    className="w-full px-3 py-2 border border-barline rounded-md bg-paper text-ink focus:outline-none focus:ring-2 focus:ring-highlight"
                  />
                </div>
              )}

              {/* 自定义模型（可选） */}
              <div>
                <label htmlFor="model" className="block text-sm font-medium text-ink mb-2">
                  模型名称（可选）
                </label>
                <input
                  id="model"
                  type="text"
                  value={config.model}
                  onChange={(e) => setConfig({ ...config, model: e.target.value })}
                  placeholder={
                    config.provider === 'openai'
                      ? 'gpt-4o'
                      : config.provider === 'anthropic'
                      ? 'claude-3-5-sonnet-20241022'
                      : '模型名称'
                  }
                  className="w-full px-3 py-2 border border-barline rounded-md bg-paper text-ink focus:outline-none focus:ring-2 focus:ring-highlight"
                />
              </div>

              {/* 测试连接 */}
              <div>
                <button
                  onClick={handleTest}
                  disabled={isTesting || !config.apiKey.trim()}
                  className="px-4 py-2 bg-gray-100 text-ink rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isTesting ? '测试中...' : '测试连接'}
                </button>
                {testResult && (
                  <p
                    className={`mt-2 text-sm ${
                      testResult.success ? 'text-green-600' : 'text-error'
                    }`}
                  >
                    {testResult.message}
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* 提示信息 */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <p className="text-sm text-blue-800">
              💡 <strong>提示：</strong>不配置 API Key 也可以正常使用其他功能。图片识别功能仅在需要时启用。
            </p>
          </div>
        </div>

        {/* 底部操作栏 */}
        <div className="sticky bottom-0 bg-paper border-t border-barline px-6 py-4 flex justify-between">
          <button
            onClick={handleClear}
            className="px-4 py-2 text-error hover:bg-red-50 rounded-md transition-colors"
          >
            清除配置
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-barline text-ink rounded-md hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-highlight text-white rounded-md hover:bg-opacity-90 transition-colors"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
