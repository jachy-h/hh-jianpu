// ============================================================
// config.ts — Web 应用默认配置常量
// ============================================================
import packageInfo from '../../../package.json';

/**
 * 编辑器自动保存防抖延迟（毫秒）
 * 用户停止输入后等待该时间再触发保存，避免频繁写入
 */
export const AUTO_SAVE_DELAY_MS = 1000;

/**
 * 帮助页面版本信息
 */
export const APP_VERSION = `v${packageInfo.version}`;
export const HELP_PAGE_VERSION = APP_VERSION;
export const HELP_PAGE_UPDATED_DATE = '2026年10月30日';
