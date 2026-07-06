import { GUIDES, getGuide, type GuideId } from './guides-catalog';

const guideIds: readonly GuideId[] = [
  'basic-tutorial',
  'complex-components',
  'data-flow',
  'forms',
  'quality',
  'security',
];

describe('guides catalog', () => {
  it('lists the planned guides in issue order', () => {
    expect(GUIDES.map((guide) => guide.id)).toEqual(guideIds);
    expect(GUIDES.map((guide) => guide.order)).toEqual(['3.1', '3.2', '3.3', '3.4', '3.5', '3.6']);
    expect(new Set(GUIDES.map((guide) => guide.id)).size).toBe(GUIDES.length);
  });

  it('defines complete display metadata and at least one section per guide', () => {
    for (const guide of GUIDES) {
      expect(guide.name).not.toBe('');
      expect(guide.summary).not.toBe('');
      expect(guide.icon).not.toBe('');
      expect(guide.sections.length).toBeGreaterThan(0);

      for (const section of guide.sections) {
        expect(section.title).not.toBe('');
        expect(section.body.length).toBeGreaterThan(0);
        expect(section.body.every((paragraph) => paragraph.trim() !== '')).toBe(true);
        if (section.steps) {
          expect(section.steps.length).toBeGreaterThan(0);
          expect(section.steps.every((step) => step.trim() !== '')).toBe(true);
        }
      }
    }
  });

  it('covers the forms guide (inter)actions subsection', () => {
    const forms = getGuide('forms');

    expect(forms.sections.map((section) => section.title)).toContain('(Inter)Actions');
  });

  it('looks up guides by id and fails fast for unknown ids', () => {
    expect(getGuide('basic-tutorial').name).toBe('Basic tutorial');
    expect(() => getGuide('missing-guide' as never)).toThrow('Unknown guide: missing-guide');
  });
});
