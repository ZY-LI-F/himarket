import { readdirSync, readFileSync } from 'node:fs';
import { dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const sourceRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const sourceExtensions = new Set(['.css', '.svg', '.ts', '.tsx']);
const legacyTokenPrefix = ['claude', '-'].join('');

const listSourceFiles = (directory: string): readonly string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      return listSourceFiles(entryPath);
    }

    if (entry.isFile() && sourceExtensions.has(extname(entry.name))) {
      return [entryPath];
    }

    return [];
  });

const toSourceRelativePath = (filePath: string): string =>
  relative(sourceRoot, filePath).replaceAll('\\', '/');

describe('admin design token prefixes', () => {
  it('keeps legacy custom token classes out of source files', () => {
    const violations = listSourceFiles(sourceRoot)
      .filter((filePath) => readFileSync(filePath, 'utf8').includes(legacyTokenPrefix))
      .map(toSourceRelativePath);

    expect(violations).toEqual([]);
  });
});
