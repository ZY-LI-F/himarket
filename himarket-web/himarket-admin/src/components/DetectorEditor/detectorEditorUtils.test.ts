import { describe, expect, it } from 'vitest';

import {
  appendDetector,
  changeDetectorType,
  createDetector,
  getKeywordDetectorValues,
  removeDetectorAt,
  updateDetectorAt,
} from './detectorEditorUtils';

import type { DetectorConfig } from './detectorTypes';

describe('DetectorEditor helpers', () => {
  it('creates the default keyword detector without required user data', () => {
    expect(createDetector()).toEqual({
      case_sensitive: false,
      keywords: [],
      type: 'keyword',
    });
  });

  it('updates detector arrays immutably', () => {
    const detectors: DetectorConfig[] = [
      {
        case_sensitive: false,
        keywords: ['title'],
        type: 'keyword',
      },
    ];

    const updated = updateDetectorAt(detectors, 0, (detector) => ({
      ...detector,
      keywords: ['heading'],
    }));

    expect(detectors).toEqual([
      {
        case_sensitive: false,
        keywords: ['title'],
        type: 'keyword',
      },
    ]);
    expect(updated).toEqual([
      {
        case_sensitive: false,
        keywords: ['heading'],
        type: 'keyword',
      },
    ]);
  });

  it('preserves common description when changing detector type', () => {
    const nextDetector = changeDetectorType(
      {
        description: 'detect title style',
        keywords: ['title'],
        type: 'keyword',
      },
      'regex',
    );

    expect(nextDetector).toEqual({
      description: 'detect title style',
      flags: '',
      pattern: '',
      type: 'regex',
    });
  });

  it('adds and removes detectors with explicit index validation', () => {
    const detectors = appendDetector([], 'keyword');

    expect(detectors).toHaveLength(1);
    expect(removeDetectorAt(detectors, 0)).toEqual([]);
    expect(() => removeDetectorAt(detectors, 2)).toThrow('Detector index out of range: 2');
  });

  it('reads keyword detector values without mutating the input object', () => {
    const detector: DetectorConfig = {
      case_sensitive: true,
      keywords: ['title', 'heading'],
      type: 'keyword',
    };

    const values = getKeywordDetectorValues(detector);

    expect(values).toEqual({
      caseSensitive: true,
      keywords: ['title', 'heading'],
    });
    expect(detector).toEqual({
      case_sensitive: true,
      keywords: ['title', 'heading'],
      type: 'keyword',
    });
  });
});
