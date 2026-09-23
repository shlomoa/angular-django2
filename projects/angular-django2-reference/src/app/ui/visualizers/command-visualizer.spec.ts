import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { UI_COMMANDS } from '../ui-command-catalog';
import { CommandVisualizerComponent } from './command-visualizer';

describe('CommandVisualizerComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommandVisualizerComponent],
      providers: [provideNoopAnimations()],
    }).compileComponents();
  });

  function createComponent(
    commandId: string,
    applied: boolean,
  ): {
    fixture: ComponentFixture<CommandVisualizerComponent>;
    compiled: HTMLElement;
  } {
    const command = UI_COMMANDS.find((c) => c.id === commandId)!;
    const fixture = TestBed.createComponent(CommandVisualizerComponent);
    fixture.componentRef.setInput('command', command);
    fixture.componentRef.setInput('applied', applied);
    fixture.detectChanges();

    return {
      fixture,
      compiled: fixture.nativeElement as HTMLElement,
    };
  }

  it('renders nothing when applied is false', () => {
    const { compiled } = createComponent('material-app', false);
    expect(compiled.querySelector('.command-visualizer')).toBeNull();
  });

  it('renders mini application sandbox when material-app is applied', () => {
    const { compiled, fixture } = createComponent('material-app', true);
    expect(compiled.querySelector('.command-visualizer')).toBeTruthy();
    expect(compiled.querySelector('.mini-app-frame')).toBeTruthy();
    expect(compiled.querySelector('.mini-app-title')?.textContent).toContain('my-app');
    expect(compiled.querySelector('.mini-app-drawer')).toBeTruthy();

    const toggleButton = compiled.querySelector<HTMLButtonElement>('.mini-icon-btn')!;
    toggleButton.click();
    fixture.detectChanges();
    expect(compiled.querySelector('.mini-app-drawer')).toBeNull();
  });

  it('renders interactive reactive counter when component is applied', () => {
    const { compiled, fixture } = createComponent('component', true);
    expect(compiled.querySelector('.interactive-component-demo')).toBeTruthy();
    expect(compiled.querySelector('.counter-value')?.textContent).toBe('0');

    const incrementButton =
      compiled.querySelectorAll<HTMLButtonElement>('.demo-actions button')[1]!;
    incrementButton.click();
    fixture.detectChanges();
    expect(compiled.querySelector('.counter-value')?.textContent).toBe('1');
  });

  it('renders theme palette switcher when material-setup is applied', () => {
    const { compiled } = createComponent('material-setup', true);
    expect(compiled.querySelector('.interactive-theme-demo')).toBeTruthy();
    expect(compiled.querySelectorAll('.palette-btn').length).toBe(4);
  });

  it('renders CLI terminal output and filetree updates for all applied commands', () => {
    const { compiled } = createComponent('workspace-setup', true);
    expect(compiled.querySelector('.command-visualizer__terminal')).toBeTruthy();
    expect(compiled.querySelector('.terminal-body')?.textContent).toContain(
      'ng generate angular-django2:workspace-setup',
    );
    expect(compiled.querySelector('.command-visualizer__filetree')).toBeTruthy();
    expect(compiled.querySelectorAll('.filetree-item').length).toBeGreaterThan(0);
  });
});
