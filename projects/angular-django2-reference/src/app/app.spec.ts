import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Router, provideRouter } from '@angular/router';
import type { WritableSignal } from '@angular/core';
import { AngularDjango2Service, provideAngularDjango2 } from 'angular-django2';

import { App } from './app';
import { appConfig } from './app.config';
import { routes } from './app.routes';

type MaterialColorScheme = 'rose-red' | 'azure-blue' | 'magenta-violet' | 'cyan-orange';

interface AppValidationState {
  colorSchemes: readonly { label: string; value: MaterialColorScheme }[];
  guides: readonly { name: string; description: string }[];
  selectedColorScheme: WritableSignal<MaterialColorScheme>;
  uiItems: readonly { name: string; description: string }[];
}

interface RenderedApp {
  compiled: HTMLElement;
  fixture: ComponentFixture<App>;
}

async function renderApp(): Promise<RenderedApp> {
  const fixture = TestBed.createComponent(App);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();

  return {
    compiled: fixture.nativeElement as HTMLElement,
    fixture,
  };
}

async function renderAppAt(url: string): Promise<RenderedApp> {
  const router = TestBed.inject(Router);

  await router.navigateByUrl(url);

  return renderApp();
}

function requireElement<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  expect(element, `Expected to find ${selector}`).not.toBeNull();

  return element as T;
}

function expectExternalLink(
  root: ParentNode,
  selector: string,
  expectedHref: string,
  expectedText: string,
): void {
  const link = requireElement<HTMLAnchorElement>(root, selector);

  expect(link.href).toBe(expectedHref);
  expect(link.rel).toBe('noopener');
  expect(link.target).toBe('_blank');
  expect(link.textContent).toContain(expectedText);
}

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideNoopAnimations(),
        provideRouter(routes),
        provideAngularDjango2({ apiBaseUrl: '/api' }),
      ],
    }).compileComponents();
  });

  it('creates the only reference app component and renders its root shell', async () => {
    const { compiled, fixture } = await renderApp();

    expect(fixture.componentInstance).toBeTruthy();
    expect(compiled.querySelector('main#home.reference-shell')).toBeTruthy();
    expect(compiled.querySelector('router-outlet')).toBeTruthy();
  });

  it('renders the home page hero with expected title, copy, and calls to action', async () => {
    const { compiled } = await renderApp();

    expect(compiled.querySelector('h1')?.textContent).toContain('angular-django2');
    expect(compiled.querySelector('.eyebrow')?.textContent).toContain(
      'Angular Material tutorial and online reference',
    );
    expect(compiled.querySelector('.hero-copy')?.textContent).toContain(
      'A runnable workspace app for showing Django-friendly Angular configuration',
    );
    expectExternalLink(
      compiled,
      '.hero-actions a[href="https://github.com/shlomoa/angular-django2#howto"]',
      'https://github.com/shlomoa/angular-django2#howto',
      'Read HOWTO',
    );
    expectExternalLink(
      compiled,
      '.hero-actions a[href="https://github.com/shlomoa/django-angular3"]',
      'https://github.com/shlomoa/django-angular3',
      'Django companion',
    );
  });

  it('renders the package reference page section with configured Django integration values', async () => {
    const { compiled } = await renderApp();

    const packageCard = requireElement<HTMLElement>(compiled, '.main-frame:first-child');

    expect(packageCard.textContent).toContain('Package reference');
    expect(packageCard.textContent).toContain('Description of the package');
    expect(packageCard.textContent).toContain('angular-django2');
    expect(packageCard.textContent).toContain('Django-friendly Angular configuration primitives');
    expect(packageCard.querySelector('mat-chip-set')?.getAttribute('aria-label')).toBe(
      'Configured package values',
    );
    expect(packageCard.textContent).toContain('API base: /api/');
    expect(packageCard.textContent).toContain('CSRF header: X-CSRFToken');
  });

  it('renders accessible navigation for every in-page section', async () => {
    const { compiled } = await renderApp();

    const brandLink = requireElement<HTMLAnchorElement>(compiled, '.brand-link');
    const primaryNav = requireElement<HTMLElement>(compiled, '.primary-nav');
    const mainGrid = requireElement<HTMLElement>(compiled, '.main-grid');

    expect(brandLink.getAttribute('aria-label')).toBe('angular-django2 home');
    expect(brandLink.getAttribute('href')).toBe('/');
    expect(primaryNav.getAttribute('aria-label')).toBe('Primary navigation');
    expect(primaryNav.querySelector<HTMLAnchorElement>('a[href="/ui"]')?.textContent).toContain(
      'UI',
    );
    expect(primaryNav.querySelector<HTMLAnchorElement>('a[href="/guides"]')?.textContent).toContain(
      'Guides',
    );
    expect(
      primaryNav.querySelector<HTMLAnchorElement>('a[href="/#documentation"]')?.textContent,
    ).toContain('Documentation');
    expect(mainGrid.getAttribute('aria-label')).toBe('Reference app main page sections');
    expect(compiled.querySelector('#home')).toBeTruthy();
    expect(compiled.querySelector('#ui')).toBeTruthy();
    expect(compiled.querySelector('#documentation')).toBeTruthy();
  });

  it('renders the GitHub toolbar link with decorative icon hidden from assistive tech', async () => {
    const { compiled } = await renderApp();

    expectExternalLink(
      compiled,
      'a[href="https://github.com/shlomoa/angular-django2"]',
      'https://github.com/shlomoa/angular-django2',
      'GitHub',
    );
    const githubIcon = requireElement<HTMLImageElement>(compiled, '.github-link-content img');

    expect(githubIcon.getAttribute('src')).toContain('/GitHub_Invertocat_Black.svg');
    expect(githubIcon.getAttribute('alt')).toBe('');
    expect(githubIcon.getAttribute('aria-hidden')).toBe('true');
    expect(compiled.querySelector('.github-link-content svg')).toBeNull();
  });

  it('offers Material color schemes instead of schematics in the toolbar selector', async () => {
    const { compiled, fixture } = await renderApp();
    const app = fixture.componentInstance as unknown as AppValidationState;

    expect(app.colorSchemes.map((scheme) => scheme.label)).toEqual([
      'Rose & Red',
      'Azure & Blue',
      'Magenta & Violet',
      'Cyan & Orange',
    ]);
    expect(app.colorSchemes.map((scheme) => scheme.value)).not.toContain('ng-app');
    expect(app.selectedColorScheme()).toBe('azure-blue');
    expect(compiled.querySelector('.color-scheme-select')?.textContent).toContain('Color scheme');
    expect(compiled.querySelector('mat-select')?.getAttribute('aria-label')).toBe(
      'Select Material color scheme',
    );
    expect(compiled.querySelector('.theme-status')).toBeNull();
  });

  it('applies the host theme class for every supported Material color scheme', async () => {
    const { compiled, fixture } = await renderApp();
    const app = fixture.componentInstance as unknown as AppValidationState;

    for (const scheme of app.colorSchemes) {
      app.selectedColorScheme.set(scheme.value);
      fixture.detectChanges();

      expect(compiled.classList.contains(`theme-${scheme.value}`)).toBe(true);
      expect(
        app.colorSchemes
          .filter((candidate) => candidate.value !== scheme.value)
          .some((candidate) => compiled.classList.contains(`theme-${candidate.value}`)),
      ).toBe(false);
    }
  });

  it('renders every selected UI page entry with its description', async () => {
    const { compiled, fixture } = await renderApp();
    const app = fixture.componentInstance as unknown as AppValidationState;
    const uiPage = requireElement<HTMLElement>(compiled, '#ui');
    const entries = uiPage.querySelectorAll('li');

    expect(uiPage.textContent).toContain('Selected UI');
    expect(uiPage.textContent).toContain('Three examples for the UI page');
    expect(entries.length).toBe(app.uiItems.length);
    for (const item of app.uiItems) {
      expect(uiPage.textContent).toContain(item.name);
      expect(uiPage.textContent).toContain(item.description);
    }
    expect(
      uiPage.querySelector<HTMLAnchorElement>('a[href="/ui"]')?.getAttribute('aria-label'),
    ).toBe('Open UI page');
    expect(uiPage.textContent).toContain('View UI page');
  });

  it('renders every selected documentation page entry with its description', async () => {
    const { compiled, fixture } = await renderApp();
    const app = fixture.componentInstance as unknown as AppValidationState;
    const documentationPage = requireElement<HTMLElement>(compiled, '#documentation');
    const entries = documentationPage.querySelectorAll('li');

    expect(documentationPage.textContent).toContain('Selected guides');
    expect(documentationPage.textContent).toContain('Three entry points for documentation');
    expect(entries.length).toBe(app.guides.length);
    for (const guide of app.guides) {
      expect(documentationPage.textContent).toContain(guide.name);
      expect(documentationPage.textContent).toContain(guide.description);
    }
    expect(
      documentationPage
        .querySelector<HTMLAnchorElement>('a[href="/guides"]')
        ?.getAttribute('aria-label'),
    ).toBe('Open guides page');
    expect(documentationPage.textContent).toContain('View guides');
  });

  it('keeps the current reference app page surface to three in-page frames', async () => {
    const { compiled } = await renderApp();
    const frames = [...compiled.querySelectorAll<HTMLElement>('.main-frame')];

    expect(frames.length).toBe(3);
    expect(frames.map((frame) => frame.id || 'package-reference')).toEqual([
      'package-reference',
      'ui',
      'documentation',
    ]);
  });

  it('renders the routed UI overview as the visible page at /ui', async () => {
    const { compiled } = await renderAppAt('/ui');

    expect(compiled.querySelector('main#home.reference-shell')).toBeNull();
    expect(compiled.querySelector('.hero')).toBeNull();
    expect(compiled.querySelector('.ui-command-overview')).toBeTruthy();
    expect(compiled.querySelector('#ui-command-overview-title')?.textContent).toContain(
      'UI command categories',
    );
  });

  it('renders the routed guides overview as the visible page at /guides', async () => {
    const { compiled } = await renderAppAt('/guides');

    expect(compiled.querySelector('main#home.reference-shell')).toBeNull();
    expect(compiled.querySelector('.hero')).toBeNull();
    expect(compiled.querySelector('.guides-overview')).toBeTruthy();
    expect(compiled.querySelector('#guides-overview-title')?.textContent).toContain(
      'Reference app guides',
    );
  });
});

describe('reference app configuration', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: appConfig.providers,
    });
  });

  it('provides the same Django integration defaults rendered by the app shell', () => {
    const angularDjango2 = TestBed.inject(AngularDjango2Service);

    expect(angularDjango2.resolvedConfig).toEqual({
      apiBaseUrl: '/api',
      csrfCookieName: 'csrftoken',
      csrfHeaderName: 'X-CSRFToken',
      withCredentials: true,
    });
  });
});
