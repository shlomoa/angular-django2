import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';

import { PreferencesPanel } from './preferences-panel';

describe('PreferencesPanel', () => {
  let component: PreferencesPanel;
  let fixture: ComponentFixture<PreferencesPanel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PreferencesPanel],
    }).compileComponents();

    fixture = TestBed.createComponent(PreferencesPanel);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
