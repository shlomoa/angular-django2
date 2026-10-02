import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';

import { ConfirmPanel } from './confirm-panel';

describe('ConfirmPanel', () => {
  let component: ConfirmPanel;
  let fixture: ComponentFixture<ConfirmPanel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmPanel],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmPanel);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
