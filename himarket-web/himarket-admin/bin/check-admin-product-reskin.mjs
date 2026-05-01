import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const roots = [
  'src/pages/ApiProducts.tsx',
  'src/pages/ApiProductDetail.tsx',
  'src/pages/ProductTypePage.tsx',
  'src/pages/ProductCategories.tsx',
  'src/pages/ProductCategoryDetail.tsx',
  'src/components/api-product',
  'src/components/product-category',
];

const sourceExtensions = new Set(['.ts', '.tsx', '.css']);
const hexLiteralPattern = /#[0-9A-Fa-f]{3,8}/;
const antdSurfaceImportPattern = /import\s*\{[^}]*\b(?:Card|Table|Empty)\b[^}]*\}\s*from\s*['"]antd['"]/s;

async function collectFiles(root) {
  const entries = await readdir(root, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectFiles(entryPath));
      continue;
    }
    if (sourceExtensions.has(path.extname(entry.name))) {
      files.push(entryPath);
    }
  }

  return files;
}

const files = [];
for (const root of roots) {
  const statFiles = path.extname(root) ? [root] : await collectFiles(root);
  files.push(...statFiles);
}

const failures = [];
for (const file of files) {
  const content = await readFile(file, 'utf8');
  if (hexLiteralPattern.test(content)) {
    failures.push(`${file}: contains inline hex color literal`);
  }
  if (antdSurfaceImportPattern.test(content)) {
    failures.push(`${file}: imports Card/Table/Empty directly from antd`);
  }
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}
