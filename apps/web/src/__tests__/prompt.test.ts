import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from '@hh-jianpu/core';

const PROMPT_PATH = new URL('../../public/prompts/hh-jianpu-transcribe.md', import.meta.url);
const COMPLETE_EXAMPLE_HEADING = '# 完整示例';

/** 读取 Prompt 中的完整示例，确保长期维护时示例始终可解析。 */
function readCompleteExamples(): string[] {
  const markdown = readFileSync(PROMPT_PATH, 'utf8');
  const examples = markdown.split(COMPLETE_EXAMPLE_HEADING)[1] ?? '';
  return [...examples.matchAll(/```jianpu\n([\s\S]*?)```/g)].map((match) => match[1]);
}

describe('AI 转写 Prompt', () => {
  const examples = readCompleteExamples();

  it('包含完整示例', () => {
    expect(examples.length).toBeGreaterThan(0);
  });

  it.each(examples)('完整示例可以无诊断解析：%#', (source) => {
    const result = parse(source);
    expect(result.score).not.toBeNull();
    expect(result.errors).toEqual([]);
  });
});
