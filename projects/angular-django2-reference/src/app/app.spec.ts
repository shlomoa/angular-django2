import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { provideAngularDjango2 } from 'angular-django2';

import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideNoopAnimations(),
        provideRouter([]),
        provideAngularDjango2({ apiBaseUrl: '/api' }),
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render title', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('angular-django2');
  });

  it('should show the configured Django integration values', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).toContain('API base: /api/');
    expect(compiled.textContent).toContain('CSRF header: X-CSRFToken');
  });

  it('should render the main page navigation', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.primary-nav')?.textContent).toContain('UI');
    expect(compiled.querySelector('.primary-nav')?.textContent).toContain('Documentation');
    expect(compiled.textContent).toContain('GitHub');
    expect(compiled.querySelector('.color-scheme-select')?.textContent).toContain('Color scheme');
    expect(compiled.querySelector('.theme-status')).toBeNull();
    expect(compiled.querySelector('.github-icon')).toBeTruthy();
  });

  it('should offer Material color schemes instead of schematics in the toolbar selector', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance as unknown as {
      colorSchemes: readonly { label: string; value: string }[];
      selectedColorScheme: () => string;
    };

    expect(app.colorSchemes.map((scheme) => scheme.label)).toEqual([
      'Rose & Red',
      'Azure & Blue',
      'Magenta & Violet',
      'Cyan & Orange',
    ]);
    expect(app.colorSchemes.map((scheme) => scheme.value)).not.toContain('ng-app');
    expect(app.selectedColorScheme()).toBe('azure-blue');
  });

  it('should render three main page frames with selected UI and guide entries', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelectorAll('.main-frame').length).toBe(3);
    expect(compiled.querySelector('#ui')?.querySelectorAll('li').length).toBe(3);
    expect(compiled.querySelector('#documentation')?.querySelectorAll('li').length).toBe(3);
    expect(compiled.textContent).toContain('View UI page');
    expect(compiled.textContent).toContain('View guides');
  });
});
