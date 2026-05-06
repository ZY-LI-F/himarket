import type { CSSProperties } from 'react';

export const KNOWN_DETECTOR_TYPES = ['keyword', 'regex', 'semantic'] as const;

export type KnownDetectorType = (typeof KNOWN_DETECTOR_TYPES)[number];

export interface BaseDetectorConfig {
  description?: string;
  type: string;
  [key: string]: unknown;
}

export interface KeywordDetectorConfig extends BaseDetectorConfig {
  case_sensitive?: boolean;
  keywords: string[];
  type: 'keyword';
}

export interface RegexDetectorConfig extends BaseDetectorConfig {
  flags?: string;
  pattern: string;
  type: 'regex';
}

export interface SemanticDetectorConfig extends BaseDetectorConfig {
  instruction: string;
  threshold?: number;
  type: 'semantic';
}

export type DetectorConfig =
  | BaseDetectorConfig
  | KeywordDetectorConfig
  | RegexDetectorConfig
  | SemanticDetectorConfig;

export interface DetectorEditorProps {
  className?: string;
  defaultValue?: readonly DetectorConfig[];
  detectors?: readonly DetectorConfig[];
  disabled?: boolean;
  onChange?: (detectors: DetectorConfig[]) => void;
  onDetectorsChange?: (detectors: DetectorConfig[]) => void;
  readonly?: boolean;
  style?: CSSProperties;
  value?: readonly DetectorConfig[];
}
