import { KNOWN_DETECTOR_TYPES } from './detectorTypes';

import type {
  DetectorConfig,
  KeywordDetectorConfig,
  KnownDetectorType,
  RegexDetectorConfig,
  SemanticDetectorConfig,
} from './detectorTypes';

interface DetectorTypeOption {
  label: string;
  value: KnownDetectorType;
}

export const DETECTOR_TYPE_OPTIONS: DetectorTypeOption[] = [
  {
    label: '关键字',
    value: 'keyword',
  },
  {
    label: '正则表达式',
    value: 'regex',
  },
  {
    label: '语义说明',
    value: 'semantic',
  },
];

export const DETECTOR_TYPE_LABELS: Record<KnownDetectorType, string> = {
  keyword: '关键字',
  regex: '正则表达式',
  semantic: '语义说明',
};

export function appendDetector(
  detectors: readonly DetectorConfig[],
  type: KnownDetectorType = 'keyword',
): DetectorConfig[] {
  return [...cloneDetectors(detectors), createDetector(type)];
}

export function changeDetectorType(
  detector: DetectorConfig,
  nextType: KnownDetectorType,
): DetectorConfig {
  const description = typeof detector.description === 'string' ? detector.description : undefined;
  const nextDetector = createDetector(nextType);

  if (!description) {
    return nextDetector;
  }

  return {
    ...nextDetector,
    description,
  };
}

export function cloneDetector(detector: DetectorConfig): DetectorConfig {
  return Object.fromEntries(
    Object.entries(detector).map(([key, value]) => [
      key,
      Array.isArray(value) ? [...value] : value,
    ]),
  ) as DetectorConfig;
}

export function cloneDetectors(detectors: readonly DetectorConfig[]): DetectorConfig[] {
  return detectors.map((detector) => cloneDetector(detector));
}

export function createDetector(type: KnownDetectorType = 'keyword'): DetectorConfig {
  if (type === 'keyword') {
    return {
      case_sensitive: false,
      keywords: [],
      type: 'keyword',
    } satisfies KeywordDetectorConfig;
  }

  if (type === 'regex') {
    return {
      flags: '',
      pattern: '',
      type: 'regex',
    } satisfies RegexDetectorConfig;
  }

  return {
    instruction: '',
    threshold: 0.8,
    type: 'semantic',
  } satisfies SemanticDetectorConfig;
}

export function getDetectorLabel(detector: DetectorConfig): string {
  const type = getDetectorType(detector);
  return isKnownDetectorType(type) ? DETECTOR_TYPE_LABELS[type] : type;
}

export function getDetectorType(detector: DetectorConfig): string {
  const detectorType = detector.type;

  if (typeof detectorType === 'string' && detectorType.trim()) {
    return detectorType;
  }

  return 'unknown';
}

export function getKeywordDetectorValues(detector: DetectorConfig) {
  const rawKeywords = detector.keywords;
  const keywords = Array.isArray(rawKeywords)
    ? rawKeywords.filter((keyword): keyword is string => typeof keyword === 'string')
    : [];

  return {
    caseSensitive: detector.case_sensitive === true,
    keywords,
  };
}

export function getRegexDetectorValues(detector: DetectorConfig) {
  return {
    flags: typeof detector.flags === 'string' ? detector.flags : '',
    pattern: typeof detector.pattern === 'string' ? detector.pattern : '',
  };
}

export function getSemanticDetectorValues(detector: DetectorConfig) {
  return {
    instruction: typeof detector.instruction === 'string' ? detector.instruction : '',
    threshold: typeof detector.threshold === 'number' ? detector.threshold : 0.8,
  };
}

export function isKnownDetectorType(value: string): value is KnownDetectorType {
  return KNOWN_DETECTOR_TYPES.includes(value as KnownDetectorType);
}

export function mergeDetectorFields(
  detector: DetectorConfig,
  fields: Readonly<Record<string, unknown>>,
): DetectorConfig {
  const normalizedFields = Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, Array.isArray(value) ? [...value] : value]),
  );

  return {
    ...cloneDetector(detector),
    ...normalizedFields,
  };
}

export function removeDetectorAt(
  detectors: readonly DetectorConfig[],
  index: number,
): DetectorConfig[] {
  if (index < 0 || index >= detectors.length) {
    throw new Error(`Detector index out of range: ${index}`);
  }

  return detectors.filter((_, currentIndex) => currentIndex !== index).map(cloneDetector);
}

export function updateDetectorAt(
  detectors: readonly DetectorConfig[],
  index: number,
  updater: (detector: DetectorConfig) => DetectorConfig,
): DetectorConfig[] {
  if (index < 0 || index >= detectors.length) {
    throw new Error(`Detector index out of range: ${index}`);
  }

  return detectors.map((detector, currentIndex) =>
    currentIndex === index
      ? cloneDetector(updater(cloneDetector(detector)))
      : cloneDetector(detector),
  );
}
