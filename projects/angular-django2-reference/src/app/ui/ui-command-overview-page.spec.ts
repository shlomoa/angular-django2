import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { UI_COMMAND_CATEGORIES } from './ui-command-catalog';
import { UiCommandOverviewPage } from './ui-command-overview-page';

async function renderOverviewPage(): Promise<HTMLElement> {
  const fixture = TestBed.createComponent(UiCommandOverviewPage);
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

describe('UiCommandOverviewPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UiCommandOverviewPage],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('renders the category overview header and accessible navigation landmark', async () => {
    const compiled = await renderOverviewPage();
    const section = requireElement<HTMLElement>(compiled, '.ui-command-overview');
    const heading = requireElement<HTMLHeadingElement>(compiled, '#ui-command-overview-title');
    const navigation = requireElement<HTMLElement>(compiled, 'nav.ui-command-overview__grid');

    expect(section.getAttribute('aria-labelledby')).toBe('ui-command-overview-title');
    expect(heading.textContent).toContain('UI command categories');
    expect(compiled.textContent).toContain('Browse angular-django2 schematic commands by category');
    expect(navigation.getAttribute('aria-label')).toBe('UI command categories');
  });

  it('renders one category card for every catalog category', async () => {
    const compiled = await renderOverviewPage();
    const cards = [...compiled.querySelectorAll<HTMLAnchorElement>('.ui-command-overview__card')];

    expect(cards.length).toBe(UI_COMMAND_CATEGORIES.length);

    for (const category of UI_COMMAND_CATEGORIES) {
      const card = requireElement<HTMLAnchorElement>(
        compiled,
        `.ui-command-overview__card[data-category-id="${category.id}"]`,
      );

      expect(card.getAttribute('href')).toBe(`/ui/${category.id}`);
      expect(card.getAttribute('aria-label')).toBe(`Open ${category.name} command category`);
      expect(card.textContent).toContain(category.name);
      expect(card.textContent).toContain(category.summary);
      expect(card.textContent).toContain(category.card.description);
      expect(card.textContent).toContain('View category');
    }
  });

  it('uses optimized images for visual category cards', async () => {
    const compiled = await renderOverviewPage();

    for (const category of UI_COMMAND_CATEGORIES.filter(
      (candidate) => candidate.card.kind === 'image',
    )) {
      const card = requireElement<HTMLAnchorElement>(
        compiled,
        `.ui-command-overview__card[data-category-id="${category.id}"]`,
      );
      const image = requireElement<HTMLImageElement>(card, '.ui-command-overview__image-frame img');

      expect(image.getAttribute('src')).toContain(category.card.imagePath);
      expect(image.getAttribute('alt')).toBe(category.card.imageAlt);
      expect(image.getAttribute('width')).toBe('280');
      expect(image.getAttribute('height')).toBe('156');
    }
  });

  it('uses text-first visual fallbacks for non-image category cards', async () => {
    const compiled = await renderOverviewPage();

    for (const category of UI_COMMAND_CATEGORIES.filter(
      (candidate) => candidate.card.kind === 'text',
    )) {
      const card = requireElement<HTMLAnchorElement>(
        compiled,
        `.ui-command-overview__card[data-category-id="${category.id}"]`,
      );

      expect(card.querySelector('.ui-command-overview__text-frame')).toBeTruthy();
      expect(
        card.querySelector('.ui-command-overview__text-frame mat-icon')?.textContent,
      ).toContain('terminal');
      expect(card.querySelector('.ui-command-overview__image-frame img')).toBeNull();
    }
  });
});
