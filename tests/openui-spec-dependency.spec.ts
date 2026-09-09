import { OpenUiJson } from '@shlomoa/openui-spec';
import { describe, expect, it } from 'vitest';

describe('@shlomoa/openui-spec dependency', () => {
  it('validates OpenUI documents with the bundled canonical schema and catalog', () => {
    const document = OpenUiJson.parse(
      JSON.stringify({
        id: 'root',
        type: 'html',
        version: '0.1.0',
      }),
    );

    expect(() => document.validate()).not.toThrow();
  });
});
