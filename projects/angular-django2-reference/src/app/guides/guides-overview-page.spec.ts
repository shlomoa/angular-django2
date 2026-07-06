import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { GUIDES } from './guides-catalog';
import { GuidesOverviewPage } from './guides-overview-page';

async function renderOverviewPage(): Promise<HTMLElement> {
  const fixture = TestBed.createComponent(GuidesOverviewPage);
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

describe('GuidesOverviewPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GuidesOverviewPage],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('renders the guides overview header and accessible navigation landmark', async () => {
    const compiled = await renderOverviewPage();
    const section = requireElement<HTMLElement>(compiled, '.guides-overview');
    const heading = requireElement<HTMLHeadingElement>(compiled, '#guides-overview-title');
    const navigation = requireElement<HTMLElement>(compiled, 'nav.guides-overview__grid');

    expect(section.getAttribute('aria-labelledby')).toBe('guides-overview-title');
    expect(heading.textContent).toContain('Reference app guides');
    expect(compiled.textContent).toContain('Learn how to use angular-django2 and what to expect');
    expect(navigation.getAttribute('aria-label')).toBe('Reference app guides');
  });

  it('renders one card per guide linking to its detail page', async () => {
    const compiled = await renderOverviewPage();
    const cards = [...compiled.querySelectorAll<HTMLAnchorElement>('.guides-overview__card')];

    expect(cards.length).toBe(GUIDES.length);

    for (const guide of GUIDES) {
      const card = requireElement<HTMLAnchorElement>(
        compiled,
        `.guides-overview__card[data-guide-id="${guide.id}"]`,
      );

      expect(card.getAttribute('href')).toBe(`/guides/${guide.id}`);
      expect(card.getAttribute('aria-label')).toBe(`Open the ${guide.name} guide`);
      expect(card.textContent).toContain(guide.order);
      expect(card.textContent).toContain(guide.name);
      expect(card.textContent).toContain(guide.summary);
      expect(card.textContent).toContain('Read guide');
      expect(card.querySelector('.guides-overview__icon-frame mat-icon')?.textContent).toContain(
        guide.icon,
      );
    }
  });
});
