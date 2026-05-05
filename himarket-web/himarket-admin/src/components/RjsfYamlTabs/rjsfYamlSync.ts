import * as yaml from 'js-yaml';

export type JsonObject = Record<string, unknown>;

export interface YamlParseResult {
  error: string | null;
  value: JsonObject | null;
}

const YAML_DUMP_OPTIONS = {
  lineWidth: 100,
  noRefs: true,
  skipInvalid: false,
  sortKeys: false,
} as const;

export function dumpYamlObject(value: JsonObject): string {
  return yaml.dump(value, YAML_DUMP_OPTIONS);
}

export function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function normalizeFormData(value: unknown): JsonObject {
  if (!isJsonObject(value)) {
    throw new Error('RJSF formData must be an object');
  }

  return value;
}

export function parseYamlObject(text: string): YamlParseResult {
  try {
    const parsed = yaml.load(text);
    if (!isJsonObject(parsed)) {
      return {
        error: 'YAML 内容必须是对象',
        value: null,
      };
    }

    return {
      error: null,
      value: parsed,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'YAML 解析失败',
      value: null,
    };
  }
}
