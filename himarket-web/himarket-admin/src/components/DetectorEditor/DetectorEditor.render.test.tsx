import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import DetectorEditor from './index';

describe('DetectorEditor render', () => {
  it('renders keyword detectors for server-side unit tests', () => {
    const html = renderToStaticMarkup(
      <DetectorEditor
        readonly
        value={[
          {
            case_sensitive: false,
            keywords: ['title'],
            type: 'keyword',
          },
        ]}
      />,
    );

    expect(html).toContain('检测器');
    expect(html).toContain('关键字');
  });
});
