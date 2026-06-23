import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { getUiCommandsByCategory } from './ui-command-catalog';
import { UiCommandCategoryPage } from './ui-command-category-page';

interface RenderedCategoryPage {
  compiled: HTMLElement;
  fixture: ComponentFixture<UiCommandCategoryPage>;
}

async function renderCategoryPage(categoryId: string): Promise<RenderedCategoryPage> {
  await TestBed.configureTestingModule({
    imports: [UiCommandCategoryPage],
    providers: [
      provideRouter([]),
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: { paramMap: convertToParamMap({ categoryId }) },
          paramMap: of(convertToParamMap({ categoryId })),
        },
      },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(UiCommandCategoryPage);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();

  return {
    compiled: fixture.nativeElement as HTMLElement,
    fixture,
  };
}

function requireElement<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  expect(element, `Expected to find ${selector}`).not.toBeNull();

  return element as T;
}

describe('UiCommandCategoryPage', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('renders the selected category with a left command list and right detail panel', async () => {
    const { compiled } = await renderCategoryPage('workspace-setup');
    const commandButtons = [
      ...compiled.querySelectorAll<HTMLButtonElement>('.ui-command-category__command-button'),
    ];
    const workspaceCommands = getUiCommandsByCategory('workspace-setup');

    expect(compiled.querySelector('#ui-command-category-title')?.textContent).toContain(
      'Workspace setup commands',
    );
    expect(compiled.querySelector('.ui-command-category__command-list')).toBeTruthy();
    expect(compiled.querySelector('#ui-command-detail-panel')).toBeTruthy();
    expect(commandButtons.length).toBe(workspaceCommands.length);
    expect(commandButtons.map((button) => button.dataset['commandId'])).toEqual(
      workspaceCommands.map((command) => command.id),
    );
  });

  it('defaults the right panel to the first command in the category', async () => {
    const { compiled } = await renderCategoryPage('workspace-setup');
    const detailPanel = requireElement<HTMLElement>(compiled, '#ui-command-detail-panel');
    const selectedButton = requireElement<HTMLButtonElement>(
      compiled,
      '.ui-command-category__command-button--active',
    );

    expect(selectedButton.dataset['commandId']).toBe('ng-add');
    expect(selectedButton.getAttribute('aria-pressed')).toBe('true');
    expect(detailPanel.textContent).toContain('Register schematic collection');
    expect(detailPanel.textContent).toContain('ng add angular-django2');
    expect(detailPanel.textContent).toContain('Collection not registered');
    expect(detailPanel.textContent).not.toContain('Collection registered');
    expect(detailPanel.textContent).toContain('Apply Command');
    expect(detailPanel.textContent).toContain('Apply this command to reveal the resulting state.');
  });

  it('updates the right panel when a command is clicked', async () => {
    const { compiled, fixture } = await renderCategoryPage('workspace-setup');
    const ngWorkspaceButton = requireElement<HTMLButtonElement>(
      compiled,
      '.ui-command-category__command-button[data-command-id="ng-workspace"]',
    );

    ngWorkspaceButton.click();
    fixture.detectChanges();

    expect(
      ngWorkspaceButton.classList.contains('ui-command-category__command-button--active'),
    ).toBe(true);
    expect(ngWorkspaceButton.getAttribute('aria-pressed')).toBe('true');
    expect(compiled.querySelector('#ui-command-detail-panel')?.textContent).toContain(
      'Initialize workspace files',
    );
    expect(compiled.querySelector('#ui-command-detail-panel')?.textContent).toContain(
      'Apply this command to reveal the resulting state.',
    );
  });

  it('reveals the after state when Apply Command is clicked', async () => {
    const { compiled, fixture } = await renderCategoryPage('workspace-setup');
    const detailPanel = requireElement<HTMLElement>(compiled, '#ui-command-detail-panel');
    const applyButton = requireElement<HTMLButtonElement>(
      compiled,
      '.ui-command-category__apply-button',
    );

    expect(applyButton.textContent).toContain('Apply Command');
    expect(applyButton.getAttribute('aria-pressed')).toBe('false');
    expect(detailPanel.textContent).not.toContain('Collection registered');

    applyButton.click();
    fixture.detectChanges();

    expect(applyButton.textContent).toContain('Command applied');
    expect(applyButton.getAttribute('aria-pressed')).toBe('true');
    expect(detailPanel.textContent).toContain('Collection registered');
    expect(detailPanel.textContent).toContain('angular.json includes angular-django2');
    expect(detailPanel.textContent).toContain(
      'Applied command result is shown in the after panel.',
    );
  });

  it('resets the applied state when another command is selected', async () => {
    const { compiled, fixture } = await renderCategoryPage('workspace-setup');
    const applyButton = requireElement<HTMLButtonElement>(
      compiled,
      '.ui-command-category__apply-button',
    );
    const ngWorkspaceButton = requireElement<HTMLButtonElement>(
      compiled,
      '.ui-command-category__command-button[data-command-id="ng-workspace"]',
    );

    applyButton.click();
    fixture.detectChanges();
    expect(applyButton.textContent).toContain('Command applied');

    ngWorkspaceButton.click();
    fixture.detectChanges();

    expect(applyButton.textContent).toContain('Apply Command');
    expect(applyButton.getAttribute('aria-pressed')).toBe('false');
    expect(compiled.querySelector('#ui-command-detail-panel')?.textContent).not.toContain(
      'Workspace initialized',
    );
  });

  it('describes visual command results only after applying the command', async () => {
    const { compiled, fixture } = await renderCategoryPage('application-creation');
    const detailPanel = requireElement<HTMLElement>(compiled, '#ui-command-detail-panel');
    const applyButton = requireElement<HTMLButtonElement>(
      compiled,
      '.ui-command-category__apply-button',
    );

    expect(detailPanel.textContent).toContain('Visual UI change');
    expect(detailPanel.textContent).toContain(
      'The visual change remains hidden until the command is applied.',
    );
    expect(detailPanel.textContent).not.toContain('Application project created');

    applyButton.click();
    fixture.detectChanges();

    expect(detailPanel.textContent).toContain('Application project created');
    expect(detailPanel.textContent).toContain(
      'A standalone Angular application project is available',
    );
  });

  it('renders a friendly fallback for unknown category ids', async () => {
    const { compiled } = await renderCategoryPage('missing-category');

    expect(compiled.querySelector('#ui-command-category-title')?.textContent).toContain(
      'Unknown UI command category',
    );
    expect(compiled.textContent).toContain(
      'The requested category is not part of the angular-django2 command catalog.',
    );
    expect(compiled.querySelector('.ui-command-category__command-list')).toBeNull();
    expect(compiled.querySelector('#ui-command-detail-panel')).toBeNull();
  });
});
