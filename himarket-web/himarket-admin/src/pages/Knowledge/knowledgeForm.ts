import type { KnowledgeAsset, KnowledgeScope, SaveKnowledgeAssetRequest } from '@/api/knowledge';
import type { JsonObject } from '@/components/RjsfYamlTabs';

export const DEFAULT_KNOWLEDGE_CATEGORY = 'doc_review';
export const DEFAULT_KNOWLEDGE_KIND = 'DocReviewRule';

export function createDefaultKnowledgeFormData(): JsonObject {
  return {
    category: DEFAULT_KNOWLEDGE_CATEGORY,
    enabled: true,
    kind: DEFAULT_KNOWLEDGE_KIND,
    payload: {
      checks: [],
    },
    scope: 'global',
  };
}

export function toKnowledgeFormData(asset: KnowledgeAsset): JsonObject {
  return pruneUndefined({
    applicableWorkers: asset.applicableWorkers,
    category: asset.category,
    description: asset.description,
    domain: asset.domain,
    enabled: asset.enabled ?? true,
    inheritsFrom: asset.inheritsFrom,
    kind: asset.kind,
    name: asset.name,
    payload: asset.payload ?? {},
    scope: asset.scope,
    severity: asset.severity,
    teamId: asset.teamId,
    userId: asset.userId,
  });
}

export function toKnowledgeSaveRequest(formData: JsonObject): SaveKnowledgeAssetRequest {
  const payload = readObject(formData.payload, 'payload');

  return pruneUndefined({
    applicableWorkers: readOptionalStringArray(formData.applicableWorkers, 'applicableWorkers'),
    category: readRequiredString(formData.category, 'category'),
    description: readOptionalString(formData.description, 'description'),
    domain: readOptionalString(formData.domain, 'domain'),
    enabled: readRequiredBoolean(formData.enabled, 'enabled'),
    inheritsFrom: readOptionalString(formData.inheritsFrom, 'inheritsFrom'),
    kind: readRequiredString(formData.kind, 'kind'),
    name: readRequiredString(formData.name, 'name'),
    payload,
    scope: readKnowledgeScope(formData.scope),
    severity: readOptionalString(formData.severity, 'severity'),
    teamId: readOptionalString(formData.teamId, 'teamId'),
    userId: readOptionalString(formData.userId, 'userId'),
  });
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function pruneUndefined<T extends JsonObject>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, Exclude<unknown, undefined>] => {
      const [, entryValue] = entry;
      return entryValue !== undefined;
    }),
  ) as T;
}

function readKnowledgeScope(value: unknown): KnowledgeScope {
  if (value === 'global' || value === 'team' || value === 'user') {
    return value;
  }

  throw new Error('scope 必须是 global、team 或 user');
}

function readObject(value: unknown, field: string): JsonObject {
  if (isJsonObject(value)) {
    return value;
  }

  throw new Error(`${field} 必须是对象`);
}

function readOptionalString(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value === 'string') {
    return value;
  }

  throw new Error(`${field} 必须是字符串`);
}

function readOptionalStringArray(value: unknown, field: string): string[] | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (Array.isArray(value) && value.every((item) => typeof item === 'string')) {
    return [...value];
  }

  throw new Error(`${field} 必须是字符串数组`);
}

function readRequiredBoolean(value: unknown, field: string): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  throw new Error(`${field} 必须是布尔值`);
}

function readRequiredString(value: unknown, field: string): string {
  if (typeof value === 'string' && value.trim()) {
    return value;
  }

  throw new Error(`${field} 必须是非空字符串`);
}
