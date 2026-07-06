import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { getGuide } from './guides-catalog';
import { GuidesDetailPage } from './guides-detail-page';

async function renderDetailPage(guideId: string): Promise<HTMLElement> {
  await TestBed.configureTestingModule({
    imports: [GuidesDetailPage],
    providers: [
      provideRouter([]),
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: { paramMap: convertToParamMap({ guideId }) },
          paramMap: of(convertToParamMap({ guideId })),
        },
      },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(GuidesDetailPage);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();

  return fixture.nativeElement as HTMLElement;
}

function requireElement<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  expect(element, `Expected to find ${selector}`).not.toBeNull();

  return element as T;
}

describe('GuidesDetailPage', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('renders the selected guide with its sections and steps', async () => {
    const compiled = await renderDetailPage('basic-tutorial');
    const guide = getGuide('basic-tutorial');
    const sections = [...compiled.querySelectorAll<HTMLElement>('.guides-detail__section')];

    expect(compiled.querySelector('#guides-detail-title')?.textContent).toContain(guide.name);
    expect(compiled.textContent).toContain(`Guide ${guide.order}`);
    expect(compiled.textContent).toContain(guide.summary);
    expect(sections.length).toBe(guide.sections.length);

    for (const section of guide.sections) {
      const rendered = requireElement<HTMLElement>(
        compiled,
        `.guides-detail__section[data-section-title="${section.title}"]`,
      );

      expect(rendered.querySelector('h3')?.textContent).toContain(section.title);
      for (const paragraph of section.body) {
        expect(rendered.textContent).toContain(paragraph);
      }
      if (section.steps) {
        const steps = [...rendered.querySelectorAll('.guides-detail__steps li')];
        expect(steps.length).toBe(section.steps.length);
      }
    }
  });

  it('renders the forms guide (inter)actions subsection', async () => {
    const compiled = await renderDetailPage('forms');

    expect(
      compiled.querySelector('.guides-detail__section[data-section-title="(Inter)Actions"]'),
    ).toBeTruthy();
  });

  it('renders a friendly fallback for unknown guide ids', async () => {
    const compiled = await renderDetailPage('missing-guide');

    expect(compiled.querySelector('#guides-detail-title')?.textContent).toContain('Unknown guide');
    expect(compiled.textContent).toContain(
      'The requested guide is not part of the angular-django2 reference guides.',
    );
    expect(compiled.querySelector('.guides-detail__sections')).toBeNull();
  });
});
