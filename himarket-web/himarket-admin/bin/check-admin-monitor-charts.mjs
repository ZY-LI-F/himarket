import { readFile } from 'node:fs/promises';

const chartFiles = [
  'src/pages/McpMonitor.tsx',
  'src/pages/ModelDashboard.tsx',
  'src/utils/chartUtils.ts',
  'src/utils/echartsTheme.ts',
];

const hexLiteralPattern = /#[0-9A-Fa-f]{3,8}/;

const failures = [];

for (const file of chartFiles) {
  const content = await readFile(file, 'utf8');
  if (hexLiteralPattern.test(content)) {
    failures.push(`${file}: contains inline hex color literal`);
  }
}

const chartUtils = await readFile('src/utils/chartUtils.ts', 'utf8');
if (!chartUtils.includes('adminEchartsTheme.color')) {
  failures.push('src/utils/chartUtils.ts: chart options do not use token-backed ECharts palette');
}
if (!chartUtils.includes('adminEchartsTheme.valueAxis.splitLine')) {
  failures.push('src/utils/chartUtils.ts: gridlines do not use token-backed neutral axis styling');
}

for (const page of ['src/pages/McpMonitor.tsx', 'src/pages/ModelDashboard.tsx']) {
  const content = await readFile(page, 'utf8');
  if (!content.includes('adminEchartsTheme')) {
    failures.push(`${page}: ECharts init does not use the admin theme`);
  }
}

const theme = await readFile('src/utils/echartsTheme.ts', 'utf8');
if (!theme.includes('../../../shared/design-tokens/colors')) {
  failures.push('src/utils/echartsTheme.ts: theme must import shared design-token colors');
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}
