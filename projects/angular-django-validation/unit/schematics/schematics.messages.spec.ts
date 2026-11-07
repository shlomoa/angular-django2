import { describe, expect, it } from 'vitest';

import { materialLayoutTemplate } from 'angular-django2/schematics/material-app/index';
import { messageTemplateLiteral, messagesFor } from 'angular-django2/schematics/utility/messages';

describe('generated messages', () => {
  it('TC-MESSAGES-01: selects a table by the primary language subtag and defaults to English', () => {
    expect(messagesFor('he').home).toBe('בית');
    expect(messagesFor('he-IL').home).toBe('בית');
    expect(messagesFor('HE').home).toBe('בית');
    expect(messagesFor('en-US').home).toBe('Home');
    expect(messagesFor('fr').home).toBe('Home');
    expect(messagesFor(undefined).home).toBe('Home');
  });

  it('TC-MESSAGES-02: turns {label} and {n} into template literal placeholders', () => {
    expect(messageTemplateLiteral('{label} is required.')).toBe('${label} is required.');
    expect(messageTemplateLiteral('{label} at least {n}.', 'min.min')).toBe(
      '${label} at least ${min.min}.',
    );
    expect(messageTemplateLiteral('a `b` \\ ${c}')).toBe('a \\`b\\` \\\\ \\${c}');
  });

  it('TC-MESSAGES-03: every language has every message', () => {
    const english = Object.keys(messagesFor('en')).sort();
    expect(Object.keys(messagesFor('he')).sort()).toEqual(english);
  });

  it('TC-MESSAGES-04: the Material layout shows the Home entry in the document language', () => {
    expect(materialLayoutTemplate([], undefined, 'he')).toContain(
      '<span matListItemTitle>בית</span>',
    );
    expect(materialLayoutTemplate([], undefined)).toContain('<span matListItemTitle>Home</span>');
  });
});
