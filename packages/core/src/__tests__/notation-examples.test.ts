import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from '../parser/parser.js';

const builtInSource = readFileSync(new URL('../../../../apps/web/src/examples/index.ts', import.meta.url), 'utf8');
const builtInExamples = [...builtInSource.matchAll(/source: `([\s\S]*?)`/g)].map((match) => match[1]);

const guide = readFileSync(new URL('../../../../docs/user-guide/notation-syntax.md', import.meta.url), 'utf8');
const documentedExamples = [...guide.matchAll(/```jianpu\n([\s\S]*?)```/g)].map((match) => match[1]);

describe('executable notation documentation', () => {
  it.each(documentedExamples.map((source, index) => [index + 1, source] as const))('parses guide example %i without diagnostics', (_index, source) => {
    expect(parse(source).errors).toEqual([]);
  });

  it.each(builtInExamples.map((source, index) => [index + 1, source] as const))('parses built-in example %i without diagnostics', (_index, source) => {
    expect(parse(source).errors).toEqual([]);
  });
});
