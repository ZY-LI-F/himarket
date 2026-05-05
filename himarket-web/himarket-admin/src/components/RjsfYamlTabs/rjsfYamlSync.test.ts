import { describe, expect, it } from 'vitest';

import { dumpYamlObject, parseYamlObject } from './rjsfYamlSync';

import type { JsonObject } from './rjsfYamlSync';

describe('RjsfYamlTabs sync helpers', () => {
  it('round-trips form data through YAML without changing nested payload values', () => {
    const formData: JsonObject = {
      category: 'doc_review',
      enabled: true,
      kind: 'DocReviewRule',
      name: 'title-required',
      payload: {
        checks: ['presence', 'style'],
        condition: 'title must be present',
        key: 'title',
      },
      scope: 'global',
    };

    const yamlText = dumpYamlObject(formData);
    const result = parseYamlObject(yamlText);

    expect(result).toEqual({
      error: null,
      value: formData,
    });
  });

  it('exposes YAML syntax errors instead of replacing them with stale form data', () => {
    const result = parseYamlObject('payload:\n  - [');

    expect(result.error).toBeTruthy();
    expect(result.value).toBeNull();
  });

  it('rejects YAML documents that are not objects', () => {
    const result = parseYamlObject('- title-required');

    expect(result).toEqual({
      error: 'YAML 内容必须是对象',
      value: null,
    });
  });
});
